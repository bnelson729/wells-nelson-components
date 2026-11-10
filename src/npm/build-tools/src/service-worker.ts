/**
 * Offline-first app shell for a SvelteKit service worker. Everything the app needs is precached
 * on install; navigations fall back to the cached shell (the app root) when the network is
 * unavailable; cross-origin requests (Supabase, Google avatars) are left to the network.
 *
 * ```ts
 * // src/service-worker/index.ts
 * /// <reference types="@sveltejs/kit" />
 * import { version } from '$app/env';
 * import { assets, immutable } from '$app/manifest';
 * import { self } from '$app/service-worker';
 * import { registerAppShellCache } from '@wells-nelson/build-tools/service-worker';
 *
 * registerAppShellCache({ sw: self, version, files: [...immutable, ...assets], cachePrefix: 'my-app' });
 * ```
 */

interface ExtendableEventLike extends Event {
	waitUntil(promise: Promise<unknown>): void;
}

interface FetchEventLike extends ExtendableEventLike {
	readonly request: Request;
	respondWith(response: Response | Promise<Response>): void;
}

/** The parts of ServiceWorkerGlobalScope this uses (so it type-checks without the WebWorker lib). */
export interface ServiceWorkerScopeLike {
	registration: { scope: string };
	clients: { claim(): Promise<void> };
	skipWaiting(): Promise<void>;
	addEventListener(type: string, listener: (event: any) => void): void;
}

export interface AppShellCacheOptions {
	sw: ServiceWorkerScopeLike;
	/** Build version; each deploy gets a fresh cache and old ones are deleted. */
	version: string;
	/** Files to precache, relative to the scope (SvelteKit's `immutable` and `assets`). */
	files: Array<string | { path: string }>;
	/** Cache name prefix (default 'app'). */
	cachePrefix?: string;
}

export function registerAppShellCache({ sw, version, files, cachePrefix = 'app' }: AppShellCacheOptions) {
	const CACHE = `${cachePrefix}-cache-${version}`;
	const scope = new URL(sw.registration.scope);
	// The app root serves the SPA shell (index.html on GitHub Pages, the fallback page elsewhere).
	const SHELL = scope.href;
	const PRECACHE = files.map((f) => new URL(typeof f === 'string' ? f : f.path, scope).href).concat(SHELL);

	sw.addEventListener('install', (event: ExtendableEventLike) => {
		event.waitUntil(
			(async () => {
				const cache = await caches.open(CACHE);
				await cache.addAll(PRECACHE);
				await sw.skipWaiting();
			})()
		);
	});

	sw.addEventListener('activate', (event: ExtendableEventLike) => {
		event.waitUntil(
			(async () => {
				for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
				await sw.clients.claim();
			})()
		);
	});

	sw.addEventListener('fetch', (event: FetchEventLike) => {
		const { request } = event;
		if (request.method !== 'GET') return;
		const url = new URL(request.url);
		if (url.origin !== scope.origin) return;

		if (request.mode === 'navigate') {
			event.respondWith(
				(async () => {
					try {
						const response = await fetch(request);
						// GitHub Pages serves the SPA shell as 404.html with a 404 status for deep links.
						if (response.ok || response.status === 404) return response;
						throw new Error(`HTTP ${response.status}`);
					} catch {
						const cached = await caches.match(SHELL);
						return cached ?? Response.error();
					}
				})()
			);
			return;
		}

		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE);
				const cached = await cache.match(request);
				if (cached) return cached;
				const response = await fetch(request);
				if (response.ok && url.pathname.startsWith(scope.pathname)) cache.put(request, response.clone());
				return response;
			})()
		);
	});

	return { cacheName: CACHE, precache: PRECACHE };
}
