import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

/** `optimizeDeps` with the shared list plus the app's own lazily loaded deps (e.g. a search library). */
export function optimizeDeps(extra: string[] = []) {
	return { include: [...extra, ...SHARED_OPTIMIZE_DEPS] };
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
