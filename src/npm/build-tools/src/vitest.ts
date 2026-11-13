import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

/**
 * The Vitest config of a site on this framework (`export default siteVitest()` in
 * `vitest.config.js`). Unit tests run without the SvelteKit plugin, which needs a dev server Vitest
 * doesn't provide: Svelte compiles the rune modules, `$app/env` is a stand-in (version 'test'), and
 * the @wells-nelson packages are compiled with the site's tests (they ship rune modules too).
 */
export function siteVitest({ environment = 'node' }: { environment?: 'node' | 'jsdom' } = {}) {
	return {
		plugins: [svelte()],
		resolve: { alias: { '$app/env': fileURLToPath(new URL('./test/app-env.js', import.meta.url)) } },
		test: {
			environment,
			include: ['src/**/*.test.ts'],
			server: { deps: { inline: [/@wells-nelson\//] } }
		}
	};
}
