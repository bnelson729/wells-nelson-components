/**
 * Offline-first app shell for a SvelteKit service worker. Everything the app needs is precached
 * on install; navigations go to the network first (so starting the app online always
 * loads the latest deploy) and fall back to the cached shell (the app root) offline. A new
 * deploy's worker installs, skips waiting and takes over open pages straight away. Cross-origin
 * requests (Supabase, Google avatars) are left to the network.
 *
 * ```ts
 * // src/service-worker/index.ts
 * /// <reference types="@sveltejs/kit" />
 * import { dev, version } from '$app/env';
 * import { assets, immutable } from '$app/manifest';
 * import { self } from '$app/service-worker';
 * import { registerAppShellCache } from '@wells-nelson/build-tools/service-worker';
 *
 * registerAppShellCache({ sw: self, version, dev, files: [...immutable, ...assets], cachePrefix: 'my-app' });
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
	/**
	 * Development: cache nothing and delete what an earlier worker cached, so every code change
	 * loads (a cache-first worker would otherwise keep serving stale dev modules).
	 */
	dev?: boolean;
	/**
	 * Paths (relative to the scope) that always go to the network and are never cached. Defaults
	 * to SvelteKit's `_app/version.json`, so its update check (`updated` in `$app/state`) sees
	 * new deploys instead of the first answer it ever cached.
	 */
	networkOnly?: string[];
}

export function registerAppShellCache({
	sw,
	version,
	files,
	cachePrefix = 'app',
	dev = false,
	networkOnly = ['_app/version.json']
}: AppShellCacheOptions) {
	const CACHE = `${cachePrefix}-cache-${version}`;
	if (dev) {
		sw.addEventListener('install', (event: ExtendableEventLike) => event.waitUntil(sw.skipWaiting()));
		sw.addEventListener('activate', (event: ExtendableEventLike) => {
			event.waitUntil(
				(async () => {
					for (const key of await caches.keys()) if (key.startsWith(`${cachePrefix}-cache-`)) await caches.delete(key);
					await sw.clients.claim();
				})()
			);
		});
		return { cacheName: null, precache: [] };
	}
	const scope = new URL(sw.registration.scope);
	// The app root serves the SPA shell (index.html on GitHub Pages, the fallback page elsewhere).
	const SHELL = scope.href;
	const NETWORK_ONLY = new Set(networkOnly.map((p) => new URL(p, scope).pathname));
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
		if (url.origin !== scope.origin || NETWORK_ONLY.has(url.pathname)) return;

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
