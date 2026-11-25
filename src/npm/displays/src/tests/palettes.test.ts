/**
 * The palette contract and contrast: every palette sets the accent tokens (and all or none of the
 * neutral tint) in light and dark, and every pair of tokens drawn on each other passes WCAG AA in
 * every palette and mode. See src/lib/palettes/README.md.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PALETTES, PALETTE_ACCENT_TOKENS, PALETTE_NEUTRAL_TOKENS } from '../lib/palettes.js';

const lib = join(import.meta.dirname, '../lib');
const read = (file: string) => readFileSync(join(lib, file), 'utf8');

type Tokens = Record<string, string>;

/** The custom properties declared in a block's body. */
function declarations(body: string): Tokens {
	const out: Tokens = {};
	for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
	return out;
}

/** `:root` tokens outside any at-rule (light), and inside the dark color-scheme media query. */
function parse(css: string): { light: Tokens; dark: Tokens } {
	const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
	const darkAt = text.search(/@media\s*\(prefers-color-scheme:\s*dark\)/);
	const firstRoot = /:root\s*\{([^}]*)\}/.exec(darkAt === -1 ? text : text.slice(0, darkAt));
	let dark: Tokens = {};
	if (darkAt !== -1) {
		const inner = /:root\s*\{([^}]*)\}/.exec(text.slice(darkAt));
		dark = inner ? declarations(inner[1]) : {};
	}
	return { light: firstRoot ? declarations(firstRoot[1]) : {}, dark };
}

const theme = parse(read('theme.css'));

function resolve(tokens: Tokens, name: string, depth = 0): string {
	const value = tokens[name];
	if (value === undefined) throw new Error(`${name} is not defined`);
	const ref = /^var\((--[\w-]+)\)$/.exec(value);
	return ref && depth < 5 ? resolve(tokens, ref[1], depth + 1) : value;
}

function rgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6);
	if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Not a hex color: ${hex}`);
	return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string) {
	const [r, g, b] = rgb(hex).map((c) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** [foreground, background, minimum] */
const PAIRS: [string, string, number][] = [
	...['--text', '--muted'].flatMap((fg) =>
		['--bg', '--surface', '--surface-2'].map((bg): [string, string, number] => [fg, bg, 4.5])
	),
	...['--surface', '--bg', '--accent-soft'].map((bg): [string, string, number] => ['--accent-text', bg, 4.5]),
	['--on-accent', '--accent', 4.5],
	['--on-danger', '--danger', 4.5],
	['--on-warning', '--warning', 4.5],
	['--on-success', '--success', 4.5],
	...['--danger', '--warning', '--success'].flatMap((fg): [string, string, number][] => [
		[fg, '--surface', 4.5],
		[fg, `${fg}-soft`, 4.5]
	]),
	...['--control-border', '--accent'].flatMap((fg) =>
		['--surface', '--bg'].map((bg): [string, string, number] => [fg, bg, 3])
	)
];

describe.each(PALETTES)('palette %s', (name) => {
	const palette = parse(read(`palettes/${name}.css`));

	it('sets every accent token in light and dark', () => {
		for (const mode of ['light', 'dark'] as const) {
			const missing = PALETTE_ACCENT_TOKENS.filter((t) => !(t in palette[mode]));
			expect(missing, `${mode} mode`).toEqual([]);
		}
	});

	it('tints the neutrals in both modes or not at all', () => {
		const set = (mode: 'light' | 'dark') => PALETTE_NEUTRAL_TOKENS.filter((t) => t in palette[mode]);
		const light = set('light');
		const dark = set('dark');
		expect([0, PALETTE_NEUTRAL_TOKENS.length]).toContain(light.length);
		expect(dark).toEqual(light);
	});

	it('sets nothing outside the contract', () => {
		const allowed = new Set<string>([...PALETTE_ACCENT_TOKENS, ...PALETTE_NEUTRAL_TOKENS, '--surface']);
		for (const mode of ['light', 'dark'] as const) {
			expect(
				Object.keys(palette[mode]).filter((t) => !allowed.has(t)),
				`${mode} mode`
			).toEqual([]);
		}
	});

	describe.each(['light', 'dark'] as const)('%s mode', (mode) => {
		// The cascade an app gets: theme light, theme dark (in dark), then the palette's.
		const tokens: Tokens =
			mode === 'light'
				? { ...theme.light, ...palette.light }
				: { ...theme.light, ...theme.dark, ...palette.light, ...palette.dark };

		it.each(PAIRS)('%s on %s is at least %s:1', (fg, bg, min) => {
			const ratio = contrast(resolve(tokens, fg), resolve(tokens, bg));
			expect(ratio, `${fg} ${resolve(tokens, fg)} on ${bg} ${resolve(tokens, bg)}`).toBeGreaterThanOrEqual(min);
		});
	});
});
