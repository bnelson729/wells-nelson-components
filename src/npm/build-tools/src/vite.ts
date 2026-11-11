import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

/**
 * SvelteKit `paths.base` from the BASE_PATH env var: the one place the deploy path is configured.
 * GitHub project pages are served from /<repo-name> (the `fallback`); set BASE_PATH to "/" for
 * a custom domain. Development always serves from the root.
 */
export function basePath({
	mode,
	env,
	fallback
}: {
	mode: string;
	env: Record<string, string | undefined>;
	/** e.g. '/my-app' */
	fallback: string;
}): '' | `/${string}` {
	const raw = mode === 'development' ? '/' : env.BASE_PATH || fallback;
	return raw === '/' ? '' : `/${raw.replace(/^\/+|\/+$/g, '')}`;
}

/**
 * Runtime dependencies of `@wells-nelson/data-storage`. Pre-bundle them when the dev server
 * starts; otherwise Vite discovers some mid-session, re-bundles, and the already-loaded modules
 * break ("Cannot read properties of undefined (reading 'call')" / a 500 page) until a full reload.
 */
export const SHARED_OPTIMIZE_DEPS = [
	'@supabase/supabase-js',
	'@tanstack/db',
	'@tanstack/rxdb-db-collection',
	'@tanstack/svelte-db',
	'rxdb/plugins/core',
	'rxdb/plugins/replication-supabase',
	'rxdb/plugins/storage-dexie'
];

/**
 * Entry points of the Wells Nelson packages. They must be pre-bundled at startup too: one
 * imported only by a lazily loaded page (e.g. `interactions/account`) or by the service worker
 * otherwise triggers the same mid-session re-bundle.
 */
export const WELLS_NELSON_ENTRIES = [
	'@wells-nelson/displays',
	'@wells-nelson/interactions',
	'@wells-nelson/interactions/account',
	'@wells-nelson/data-storage',
	'@wells-nelson/build-tools/service-worker'
];

/** The entries that resolve from `root` (an app installs only the packages it uses). */
export function installedEntries(entries: string[], root = process.cwd()) {
	const require = createRequire(join(root, 'package.json'));
	return entries.filter((id) => {
		try {
			require.resolve(id);
			return true;
		} catch {
			return false;
		}
	});
}

/**
 * `optimizeDeps` with the shared runtime dependencies, every installed Wells Nelson entry point,
 * and the app's own lazily loaded deps (e.g. a search library).
 */
export function optimizeDeps(extra: string[] = [], root = process.cwd()) {
	return { include: [...extra, ...installedEntries(WELLS_NELSON_ENTRIES, root), ...SHARED_OPTIMIZE_DEPS] };
}

/**
 * Serve a git-ignored JSON file (e.g. seed data with real names) as a virtual module to the dev
 * server only. Builds always get `null`, so the data can never be bundled or deployed.
 *
 * ```js
 * plugins: [devJsonModule({ id: 'virtual:seed', file: 'seed/demo.json', enabled: command === 'serve' }), sveltekit()]
 * ```
 */
export function devJsonModule({ id, file, enabled }: { id: string; file: string; enabled: boolean }): Plugin {
	const path = resolve(file);
	const resolved = `\0${id}`;
	return {
		name: `dev-json:${id}`,
		resolveId: (source) => (source === id ? resolved : undefined),
		load(source) {
			if (source !== resolved) return;
			if (!enabled || !existsSync(path)) return 'export default null;';
			this.addWatchFile(path);
			return `export default ${readFileSync(path, 'utf8')};`;
		}
	};
}

/**
 * SvelteKit `csp` options for an offline-first app on static hosting. SvelteKit adds a
 * `<meta http-equiv="content-security-policy">` with hashes of its own inline scripts, so only
 * the app's bundled scripts run: injected markup can't load or run other scripts. Network access
 * is limited to the app's origin and its Supabase project (REST and Realtime); images also allow
 * data/blob URLs and Google profile pictures. Styles allow inline (Svelte transitions use them).
 *
 * ```js
 * sveltekit({ csp: contentSecurityPolicy({ supabaseUrl: env.VITE_SUPABASE_URL }), ... })
 * ```
 */
export function contentSecurityPolicy({
	supabaseUrl,
	connect = [],
	img = []
}: {
	/** The project URL (`VITE_SUPABASE_URL`); without it any `*.supabase.co` project is allowed. */
	supabaseUrl?: string;
	/** Extra `connect-src` sources. */
	connect?: string[];
	/** Extra `img-src` sources. */
	img?: string[];
} = {}) {
	let supabase = ['https://*.supabase.co', 'wss://*.supabase.co'];
	if (supabaseUrl) {
		try {
			const { host, protocol } = new URL(supabaseUrl);
			supabase = [`${protocol}//${host}`, `${protocol === 'http:' ? 'ws' : 'wss'}://${host}`];
		} catch {
			/* keep the wildcard */
		}
	}
	// Typed loosely (`any[]`) so it fits SvelteKit's `CspDirectives` without depending on SvelteKit.
	const directives: Record<string, any[]> = {
		'default-src': ['self'],
		'script-src': ['self'],
		'style-src': ['self', 'unsafe-inline'],
		'img-src': ['self', 'data:', 'blob:', 'https://*.googleusercontent.com', ...img],
		'font-src': ['self'],
		'connect-src': ['self', ...supabase, ...connect],
		'worker-src': ['self'],
		'manifest-src': ['self'],
		'object-src': ['none'],
		'base-uri': ['self'],
		'form-action': ['self']
	};
	return { mode: 'hash' as const, directives };
}
