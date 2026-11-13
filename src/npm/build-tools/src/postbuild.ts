import { copyFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface PostbuildOptions {
	/** adapter-static output directory. */
	dir?: string;
	/** The SPA shell adapter-static writes (its `fallback`). */
	shell?: string;
	/**
	 * Strings that must never appear in the build, e.g. names from dev-only seed data. The build
	 * fails if any text file contains one.
	 */
	forbid?: string[];
	log?: (message: string) => void;
}

const TEXT_FILE = /\.(js|html|json|css|webmanifest|txt|xml|svg)$/;

/**
 * GitHub Pages fixups for a SvelteKit adapter-static build:
 * - copy the SPA shell (404.html, which Pages serves for every unknown path) to index.html, so
 *   the root URL and the service worker's offline shell exist too;
 * - write .nojekyll so Pages' Jekyll doesn't hide the _app directory;
 * - optionally check that forbidden strings (e.g. dev seed data) didn't leak into the build.
 */
export function postbuild({
	dir = 'build',
	shell = '404.html',
	forbid = [],
	log = console.log
}: PostbuildOptions = {}) {
	const shellPath = join(dir, shell);
	if (!existsSync(shellPath)) throw new Error(`${shellPath} not found; did the build run?`);
	copyFileSync(shellPath, join(dir, 'index.html'));
	writeFileSync(join(dir, '.nojekyll'), '');
	log(`postbuild: wrote ${join(dir, 'index.html')} and ${join(dir, '.nojekyll')}`);

	const needles = forbid.filter(Boolean);
	if (needles.length === 0) return;
	const files: string[] = [];
	const walk = (d: string) => {
		for (const name of readdirSync(d)) {
			const path = join(d, name);
			if (statSync(path).isDirectory()) walk(path);
			else if (TEXT_FILE.test(name)) files.push(path);
		}
	};
	walk(dir);
	for (const file of files) {
		const text = readFileSync(file, 'utf8');
		const hit = needles.find((n) => text.includes(n));
		if (hit !== undefined) throw new Error(`postbuild: forbidden content found in ${file}. It must never be deployed.`);
	}
	log(`postbuild: checked ${files.length} files, no forbidden content in the build`);
}

/**
 * Collect strings from a JSON value along a dotted path, walking through arrays, e.g.
 * `collectStrings(seed, 'people.name')`. Strings shorter than `minLength` are skipped so
 * common short words don't cause false alarms.
 */
export function collectStrings(value: unknown, path: string, minLength = 4): string[] {
	let current: unknown[] = [value];
	for (const key of path.split('.').filter(Boolean)) {
		current = current
			.flatMap((v) => (Array.isArray(v) ? v : [v]))
			.map((v) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[key] : undefined));
	}
	return current
		.flatMap((v) => (Array.isArray(v) ? v : [v]))
		.filter((v): v is string => typeof v === 'string' && v.length >= minLength);
}
