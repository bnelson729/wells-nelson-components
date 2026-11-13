import adapter from '@sveltejs/adapter-static';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { basePath, contentSecurityPolicy } from './vite.js';

/**
 * The SvelteKit options every site on this framework shares, for `sveltekit(siteKit({...}))` in
 * `vite.config.js`: a static SPA (404.html fallback), the GitHub Pages base path (BASE_PATH, else
 * `base`), the Content Security Policy for the site's Supabase project, runes, and the release
 * version (APP_VERSION from the deploy workflow, else `<package.json version>-local`).
 */
export function siteKit({
	mode,
	base,
	pollUpdates = false,
	connect,
	img,
	root = process.cwd()
}: {
	/** Vite's `mode`. */
	mode: string;
	/** The GitHub Pages project path, e.g. '/my-site'. */
	base: string;
	/**
	 * Check for a new deploy every 5 minutes and when the page returns to the foreground (SvelteKit's
	 * `updated`), for installed apps that offer "Update". Off for websites.
	 */
	pollUpdates?: boolean;
	/** More origins the site may connect to or load images from (see `contentSecurityPolicy`). */
	connect?: string[];
	img?: string[];
	root?: string;
}) {
	const env = loadEnv(mode, root, '');
	const packageVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version as string;
	const version = process.env.APP_VERSION || `${packageVersion}-local`;
	return {
		adapter: adapter({ fallback: '404.html' }),
		paths: { base: basePath({ mode, env, fallback: base }) },
		csp: contentSecurityPolicy({ supabaseUrl: env.VITE_SUPABASE_URL, connect, img }),
		compilerOptions: { runes: true },
		version: pollUpdates ? { name: version, pollInterval: 5 * 60_000 } : { name: version }
	};
}
