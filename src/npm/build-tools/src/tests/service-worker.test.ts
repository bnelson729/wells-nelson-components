import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAppShellCache } from '../service-worker.js';

/** In-memory Cache Storage with just what the service worker uses. */
function fakeCaches() {
	const stores = new Map<string, Map<string, Response>>();
	const open = async (name: string) => {
		if (!stores.has(name)) stores.set(name, new Map());
		const store = stores.get(name)!;
		const key = (r: Request | string) => (typeof r === 'string' ? r : r.url);
		return {
			addAll: async (urls: string[]) => urls.forEach((u) => store.set(u, new Response(`cached ${u}`))),
			match: async (r: Request | string) => store.get(key(r)),
			put: async (r: Request | string, res: Response) => void store.set(key(r), res)
		};
	};
	return {
		stores,
		open,
		keys: async () => [...stores.keys()],
		delete: async (name: string) => stores.delete(name),
		match: async (url: string) => {
			for (const store of stores.values()) if (store.has(url)) return store.get(url);
			return undefined;
		}
	};
}

function fakeSw(scope: string) {
	const listeners = new Map<string, (e: any) => void>();
	return {
		listeners,
		registration: { scope },
		clients: { claim: vi.fn(async () => {}) },
		skipWaiting: vi.fn(async () => {}),
		addEventListener: (type: string, fn: (e: any) => void) => void listeners.set(type, fn)
	};
}

/** Dispatch a fetch event; resolves with what was passed to respondWith (undefined if ignored). */
async function dispatchFetch(sw: ReturnType<typeof fakeSw>, request: Request) {
	let response: Promise<Response> | undefined;
	sw.listeners.get('fetch')!({ request, respondWith: (r: Promise<Response>) => (response = r) });
	return response && (await response);
}

const SCOPE = 'https://me.github.io/demo/';
let caches: ReturnType<typeof fakeCaches>;

beforeEach(() => {
	caches = fakeCaches();
	vi.stubGlobal('caches', caches);
});
afterEach(() => vi.unstubAllGlobals());

describe('registerAppShellCache', () => {
	it("precaches the files and the shell, and drops its own old caches (not other apps') on activate", async () => {
		const sw = fakeSw(SCOPE);
		const { cacheName, precache } = registerAppShellCache({
			sw,
			version: 'v2',
			files: [{ path: '_app/immutable/a.js' }, 'favicon.svg'],
			cachePrefix: 'demo'
		});
		expect(cacheName).toBe('demo-cache-v2');
		expect(precache).toEqual([`${SCOPE}_app/immutable/a.js`, `${SCOPE}favicon.svg`, SCOPE]);

		await caches.open('demo-cache-v1');
		await caches.open('other-app-cache-7');
		let done: Promise<unknown> = Promise.resolve();
		sw.listeners.get('install')!({ waitUntil: (p: Promise<unknown>) => (done = p) });
		await done;
		expect(sw.skipWaiting).toHaveBeenCalled();
		expect([...caches.stores.get('demo-cache-v2')!.keys()]).toEqual(precache);

		sw.listeners.get('activate')!({ waitUntil: (p: Promise<unknown>) => (done = p) });
		await done;
		expect((await caches.keys()).sort()).toEqual(['demo-cache-v2', 'other-app-cache-7']);
		expect(sw.clients.claim).toHaveBeenCalled();
	});

	it('leaves cross-origin and non-GET requests to the network', async () => {
		const sw = fakeSw(SCOPE);
		registerAppShellCache({ sw, version: '1', files: [] });
		expect(await dispatchFetch(sw, new Request('https://supabase.co/rest'))).toBeUndefined();
		expect(await dispatchFetch(sw, new Request(`${SCOPE}api`, { method: 'POST' }))).toBeUndefined();
	});

	it('serves the cached shell for navigations when offline', async () => {
		const sw = fakeSw(SCOPE);
		registerAppShellCache({ sw, version: '1', files: [] });
		let done: Promise<unknown> = Promise.resolve();
		sw.listeners.get('install')!({ waitUntil: (p: Promise<unknown>) => (done = p) });
		await done;
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Promise.reject(new TypeError('offline')))
		);
		const nav = new Request(`${SCOPE}project/1`);
		Object.defineProperty(nav, 'mode', { value: 'navigate' });
		const response = await dispatchFetch(sw, nav);
		expect(await response!.text()).toBe(`cached ${SCOPE}`);
	});

	it("leaves SvelteKit's version check to the network, uncached", async () => {
		const sw = fakeSw(SCOPE);
		registerAppShellCache({ sw, version: '1', files: [] });
		expect(await dispatchFetch(sw, new Request(`${SCOPE}_app/version.json`))).toBeUndefined();
		const custom = fakeSw(SCOPE);
		registerAppShellCache({ sw: custom, version: '1', files: [], networkOnly: ['build.txt'] });
		expect(await dispatchFetch(custom, new Request(`${SCOPE}build.txt`))).toBeUndefined();
	});

	it('caches same-scope assets on first fetch', async () => {
		const sw = fakeSw(SCOPE);
		registerAppShellCache({ sw, version: '1', files: [] });
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('fresh'))
		);
		const res = await dispatchFetch(sw, new Request(`${SCOPE}icons/icon-192.png`));
		expect(await res!.text()).toBe('fresh');
		expect(caches.stores.get('app-cache-1')!.has(`${SCOPE}icons/icon-192.png`)).toBe(true);
	});
});

describe('registerAppShellCache in development', () => {
	it('caches nothing and clears what an earlier worker cached', async () => {
		const sw = fakeSw(SCOPE);
		await caches.open('demo-cache-old');
		await caches.open('other-app-cache-1');
		const result = registerAppShellCache({ sw, version: '1', files: ['a.js'], cachePrefix: 'demo', dev: true });
		expect(result.precache).toEqual([]);
		expect(sw.listeners.has('fetch')).toBe(false);
		let done: Promise<unknown> = Promise.resolve();
		sw.listeners.get('activate')!({ waitUntil: (p: Promise<unknown>) => (done = p) });
		await done;
		expect(await caches.keys()).toEqual(['other-app-cache-1']);
		expect(sw.clients.claim).toHaveBeenCalled();
	});
});
