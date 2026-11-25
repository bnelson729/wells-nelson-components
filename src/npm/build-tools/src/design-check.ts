import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * The design check (`wn-check-design`): catches a site using the design system in ways that drift
 * from it, which type-checking and lint can't see. Each finding names what to use instead.
 *
 * Errors:
 * - `raw-color`: a hex, rgb() or hsl() color in a component's styles. Colors are tokens
 *   (`var(--accent)`); a site's own tokens live in `src/app.css` (or a file marked tokens).
 * - `library-internals`: a selector reaching into a library component's internals
 *   (`:global(.icon-btn)`, `.line .icon-btn`). Ask for an option instead (e.g. `IconButton
 *   tone="muted"`); a renamed internal class would silently break the override.
 *
 * Warnings (errors with `strict`):
 * - `font-size`, `z-index`: a literal instead of a scale token (`var(--text-sm)`, `var(--z-fixed)`).
 *
 * A line is allowed with a `design-allow: <reason>` comment on it or on the line above.
 */
export interface DesignFinding {
	file: string;
	line: number;
	rule: 'raw-color' | 'library-internals' | 'font-size' | 'z-index';
	severity: 'error' | 'warning';
	message: string;
}

export interface DesignCheckOptions {
	/** The site's root (its `src` folder is checked). */
	root: string;
	/** Warnings count as errors. */
	strict?: boolean;
}

/** Classes on the library components' own elements: internals, not an API. */
const LIBRARY_CLASSES = [
	'icon-btn',
	'btn',
	'icon',
	'badge',
	'chip',
	'checkbox',
	'checkbox-field',
	'box',
	'toggle',
	'track',
	'thumb',
	'segmented',
	'combo',
	'group-header',
	'tab-bar',
	'app-header',
	'modal',
	'notice-box',
	'search-bar',
	'page-header',
	'field',
	'field-label',
	'field-message'
];
const LIBRARY_CLASS = new RegExp(`\\.(${LIBRARY_CLASSES.join('|')})(?![\\w-])`);
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/;
const ALLOW = /design-allow:/;

function walk(dir: string): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		if (name === 'node_modules' || name.startsWith('.')) continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) out.push(...walk(path));
		else if (/\.(svelte|css)$/.test(name)) out.push(path);
	}
	return out;
}

/** The CSS of a file, as [line number, text] pairs: a .svelte file's <style> block, or all of a .css file. */
function cssLines(path: string, text: string): [number, string][] {
	const lines = text.split(/\r?\n/);
	if (path.endsWith('.css')) return lines.map((l, i) => [i + 1, l]);
	const out: [number, string][] = [];
	let inStyle = false;
	lines.forEach((l, i) => {
		if (/<style[\s>]/.test(l)) inStyle = true;
		else if (/<\/style>/.test(l)) inStyle = false;
		else if (inStyle) out.push([i + 1, l]);
	});
	return out;
}

/** Find drift in a site's `src`. */
export function checkDesign({ root, strict = false }: DesignCheckOptions): DesignFinding[] {
	const findings: DesignFinding[] = [];
	const src = join(root, 'src');
	for (const path of walk(src)) {
		const text = readFileSync(path, 'utf8');
		const file = relative(root, path).replaceAll('\\', '/');
		const all = text.split(/\r?\n/);
		const tokenFile = file === 'src/app.css' || /\/\*\s*tokens\s*\*\//.test(text);
		const add = (line: number, rule: DesignFinding['rule'], warning: boolean, message: string) => {
			if (ALLOW.test(all[line - 1] ?? '') || ALLOW.test(all[line - 2] ?? '')) return;
			findings.push({ file, line, rule, severity: warning && !strict ? 'warning' : 'error', message });
		};
		for (const [line, raw] of cssLines(path, text)) {
			const css = raw.replace(/\/\*.*?\*\//g, '');
			if (!tokenFile && RAW_COLOR.test(css))
				add(
					line,
					'raw-color',
					false,
					'Raw color: use a token (var(--accent), var(--muted), …) or add one to src/app.css.'
				);
			const selector = css.includes('{') ? css.slice(0, css.indexOf('{')) : /[,{]\s*$|^[^:;]*$/.test(css) ? css : '';
			// A component's own styles are scoped, so only what it marks :global can reach the library's
			// elements; in a global stylesheet every selector can.
			const reaching = path.endsWith('.css')
				? selector
				: [...selector.matchAll(/:global\(([^)]*\)?)\)/g)].map((m) => m[1]).join(' ');
			if (reaching && LIBRARY_CLASS.test(reaching))
				add(
					line,
					'library-internals',
					false,
					`Styles a library component's internals (${LIBRARY_CLASS.exec(reaching)![0]}): use its options (tone, size, class) or ask for one.`
				);
			const size = /^\s*font-size\s*:\s*([^;]+)/.exec(css);
			if (size && /\d(rem|px)\b/.test(size[1]) && !size[1].includes('var('))
				add(line, 'font-size', true, `Literal font size ${size[1].trim()}: use var(--text-xs|sm|md|lg|xl).`);
			const z = /^\s*z-index\s*:\s*(\d+)/.exec(css);
			if (z)
				add(
					line,
					'z-index',
					true,
					`Literal z-index ${z[1]}: use var(--z-raised|sticky|dropdown|fixed|floating|overlay).`
				);
		}
	}
	return findings;
}

/** Findings as `file:line  severity  rule  message` lines, errors first. */
export function formatFindings(findings: DesignFinding[]): string {
	return [...findings]
		.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1))
		.map((f) => `${f.file}:${f.line}  ${f.severity}  ${f.rule}  ${f.message}`)
		.join('\n');
}
