import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { SUPPORTED_LETTERS, markPaths, parseHex, renderPng, renderSvg, writeIcons } from '../icons.js';
import { renderManifest } from '../manifest.js';
import { collectStrings, postbuild } from '../postbuild.js';
import { WELLS_NELSON_ENTRIES, basePath, contentSecurityPolicy, devJsonModule, installedEntries, optimizeDeps } from '../vite.js';

const dirs: string[] = [];
const tempDir = () => {
	const d = mkdtempSync(join(tmpdir(), 'wn-build-tools-'));
	dirs.push(d);
	return d;
};
afterEach(() => {
	for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** Decode our own (unfiltered, RGBA) PNGs: returns size and a pixel reader. */
function decodePng(png: Buffer) {
	expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	const width = png.readUInt32BE(16);
	const height = png.readUInt32BE(20);
	const idatLen = png.readUInt32BE(33);
	const raw = inflateSync(png.subarray(41, 41 + idatLen));
	const pixel = (x: number, y: number) => {
		const i = y * (width * 4 + 1) + 1 + x * 4;
		return [...raw.subarray(i, i + 4)];
	};
	return { width, height, pixel };
}

describe('icons', () => {
	it('has a glyph for every letter, inside the design space', () => {
		expect(SUPPORTED_LETTERS).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
		for (const letters of ['A', 'WN', 'ABC', ...SUPPORTED_LETTERS]) {
			for (const [x, y] of markPaths(letters).flat()) {
				expect(x).toBeGreaterThanOrEqual(5);
				expect(x).toBeLessThanOrEqual(95);
				expect(y).toBeGreaterThanOrEqual(20);
				expect(y).toBeLessThanOrEqual(80);
			}
		}
	});

	it('rejects unsupported marks', () => {
		expect(() => markPaths('ABCD')).toThrow(/1 to 3 letters/);
		expect(() => markPaths('U2')).toThrow(/No glyph for "2"/);
		expect(() => parseHex('blue')).toThrow(/#rrggbb/);
	});

	it('renders the background with letters in the foreground color', () => {
		const { width, height, pixel } = decodePng(renderPng(96, { letters: 'WL', background: '#2f6f4f' }));
		expect([width, height]).toEqual([96, 96]);
		// Between the two letters: background.
		expect(pixel(48, 48)).toEqual([0x2f, 0x6f, 0x4f, 255]);
		// On the L's vertical stroke (x = 58 in design space, scaled by 0.82 around the center): white.
		const x = Math.round(((58 * 0.82 + 9) / 100) * 96);
		expect(pixel(x, 48)).toEqual([255, 255, 255, 255]);
		// Rounded corner: transparent.
		expect(pixel(0, 0)[3]).toBe(0);
	});

	it('makes maskable icons full-bleed', () => {
		const { pixel } = decodePng(renderPng(64, { letters: 'WN', background: '#1f5fa8' }, { maskable: true }));
		expect(pixel(0, 0)).toEqual([0x1f, 0x5f, 0xa8, 255]);
	});

	it('writes the icon set and favicon', () => {
		const out = tempDir();
		const files = writeIcons({ letters: 'UL', background: '#1f5fa8', outDir: out });
		expect(files.every((f) => existsSync(f))).toBe(true);
		const svg = readFileSync(join(out, 'favicon.svg'), 'utf8');
		expect(svg).toContain('fill="#1f5fa8"');
		expect(svg.match(/<path /g)).toHaveLength(2);
		expect(renderSvg({ letters: 'X', background: '#000000' }).match(/<path /g)).toHaveLength(2);
	});
});

describe('postbuild', () => {
	function build(files: Record<string, string>) {
		const dir = tempDir();
		for (const [name, text] of Object.entries(files)) {
			mkdirSync(join(dir, name, '..'), { recursive: true });
			writeFileSync(join(dir, name), text);
		}
		return dir;
	}

	it('copies the SPA shell and writes .nojekyll', () => {
		const dir = build({ '404.html': '<html>shell</html>' });
		postbuild({ dir, log: () => {} });
		expect(readFileSync(join(dir, 'index.html'), 'utf8')).toBe('<html>shell</html>');
		expect(existsSync(join(dir, '.nojekyll'))).toBe(true);
	});

	it('fails when the shell is missing', () => {
		expect(() => postbuild({ dir: tempDir(), log: () => {} })).toThrow(/404.html not found/);
	});

	it('fails when forbidden content leaked into the build', () => {
		const dir = build({ '404.html': 'x', '_app/chunk.js': 'const p = "Jordan Smith";' });
		expect(() => postbuild({ dir, forbid: ['Jordan Smith'], log: () => {} })).toThrow(/forbidden content found in .*chunk\.js/);
		expect(() => postbuild({ dir, forbid: ['Someone Else'], log: () => {} })).not.toThrow();
	});

	it('collects strings along a path through arrays', () => {
		const seed = { people: [{ name: 'Jordan Smith' }, { name: 'Al' }, { name: 'Casey Lee' }], groups: [{ name: 'Launch' }] };
		expect(collectStrings(seed, 'people.name')).toEqual(['Jordan Smith', 'Casey Lee']);
		expect(collectStrings(seed, 'missing.name')).toEqual([]);
	});
});

describe('vite helpers', () => {
	it('derives the base path', () => {
		expect(basePath({ mode: 'development', env: { BASE_PATH: '/x' }, fallback: '/demo' })).toBe('');
		expect(basePath({ mode: 'production', env: {}, fallback: '/my-app' })).toBe('/my-app');
		expect(basePath({ mode: 'production', env: { BASE_PATH: '/' }, fallback: '/demo' })).toBe('');
		expect(basePath({ mode: 'production', env: { BASE_PATH: 'apps/demo/' }, fallback: '/demo' })).toBe('/apps/demo');
	});

	it('includes the shared deps after the app’s own', () => {
		const { include } = optimizeDeps(['some-lazy-dep']);
		expect(include[0]).toBe('some-lazy-dep');
		expect(include).toContain('rxdb/plugins/replication-supabase');
	});

	it('pre-bundles only the Wells Nelson entry points the app has installed', () => {
		const app = tempDir();
		writeFileSync(join(app, 'package.json'), '{"name":"app"}');
		const pkg = join(app, 'node_modules', '@wells-nelson', 'interactions');
		mkdirSync(join(pkg, 'dist', 'account'), { recursive: true });
		writeFileSync(
			join(pkg, 'package.json'),
			JSON.stringify({
				name: '@wells-nelson/interactions',
				exports: { '.': { default: './dist/index.js' }, './account': { default: './dist/account/index.js' } }
			})
		);
		writeFileSync(join(pkg, 'dist', 'index.js'), '');
		writeFileSync(join(pkg, 'dist', 'account', 'index.js'), '');
		expect(installedEntries(WELLS_NELSON_ENTRIES, app)).toEqual(['@wells-nelson/interactions', '@wells-nelson/interactions/account']);
		const { include } = optimizeDeps(['fuse.js'], app);
		expect(include.slice(0, 3)).toEqual(['fuse.js', '@wells-nelson/interactions', '@wells-nelson/interactions/account']);
	});

	it('serves the JSON in dev only', () => {
		const dir = tempDir();
		const file = join(dir, 'seed.json');
		writeFileSync(file, '{"a":1}');
		const ctx = { addWatchFile: () => {} };
		const load = (enabled: boolean) => {
			const plugin = devJsonModule({ id: 'virtual:seed', file, enabled });
			const id = (plugin.resolveId as (s: string) => string | undefined)('virtual:seed')!;
			expect((plugin.resolveId as (s: string) => string | undefined)('other')).toBeUndefined();
			return (plugin.load as unknown as (this: typeof ctx, id: string) => string | undefined).call(ctx, id);
		};
		expect(load(true)).toBe('export default {"a":1};');
		expect(load(false)).toBe('export default null;');
	});
});

describe('renderManifest', () => {
	it('uses relative scope and the generated icons', () => {
		const m = JSON.parse(
			renderManifest({ name: 'My App', shortName: 'MA', description: 'd', backgroundColor: '#f3f5f8', themeColor: '#1f5fa8' })
		);
		expect(m.start_url).toBe('./');
		expect(m.theme_color).toBe('#1f5fa8');
		expect(m.icons.map((i: { src: string }) => i.src)).toContain('icons/icon-maskable-512.png');
	});
});

describe('contentSecurityPolicy', () => {
	it('allows only the app and its Supabase project to be reached', () => {
		const csp = contentSecurityPolicy({ supabaseUrl: 'https://abcd.supabase.co' });
		expect(csp.mode).toBe('hash');
		expect(csp.directives['script-src']).toEqual(['self']);
		expect(csp.directives['connect-src']).toEqual(['self', 'https://abcd.supabase.co', 'wss://abcd.supabase.co']);
		expect(csp.directives['object-src']).toEqual(['none']);
	});

	it('falls back to any Supabase project, and takes extra sources', () => {
		const csp = contentSecurityPolicy({ connect: ['https://api.example.com'], img: ['https://img.example.com'] });
		expect(csp.directives['connect-src']).toEqual(['self', 'https://*.supabase.co', 'wss://*.supabase.co', 'https://api.example.com']);
		expect(csp.directives['img-src']).toContain('https://img.example.com');
	});
});
