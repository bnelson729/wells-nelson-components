/**
 * node scripts/codemods/v2.mjs <app folder> [--dry]
 *
 * Moves an app's .svelte files to the 2.0 component props of @wells-nelson/displays and
 * @wells-nelson/interactions. Rewrites, inside each component's opening tag only:
 *
 *   Button              variant="primary" → variant="solid" tone="accent"; "secondary" → (default);
 *                       "danger" → variant="solid" tone="danger"; "ghost" → variant="ghost" tone="accent";
 *                       "danger-ghost" → variant="ghost" tone="danger"
 *   ConfirmDialog       danger → tone="danger"; danger={x} → tone={x ? 'danger' : 'accent'}
 *   IconButton          active → current; size={18|20|22} → size="sm|md|lg"
 *   AppHeader           profileActive → profileCurrent; labels="active" → labels="current"
 *   CollapsibleSection  appearance → layout; variant → emphasis; collapsed={x} → expanded={!x};
 *                       ontogglecollapse → onexpandedchange
 *   ActiveList          appearance → layout; ontoggle → onactivechange; inactiveOpen → inactiveExpanded
 *
 * It prints what it can't rewrite (a variant computed at runtime, `TabItem.active` in scripts, AddRow)
 * with file and line, for a person to finish. With --dry it only reports.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const [root, ...flags] = process.argv.slice(2);
if (!root) {
	console.error('Usage: node scripts/codemods/v2.mjs <app folder> [--dry]');
	process.exit(1);
}
const dry = flags.includes('--dry');

/** Every .svelte, .ts and .js file under src/ (or the folder itself when it has no src/). */
function files(dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		if (name === 'node_modules' || name.startsWith('.')) continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) out.push(...files(path));
		else if (/\.(svelte|ts|js)$/.test(name)) out.push(path);
	}
	return out;
}

/** The end (index after '>') of the tag starting at `start`, skipping `{…}` expressions and quotes. */
function tagEnd(text, start) {
	let depth = 0;
	let quote = null;
	for (let i = start; i < text.length; i++) {
		const c = text[i];
		if (quote) {
			if (c === quote) quote = null;
		} else if (c === '"' || c === "'" || c === '`') {
			if (depth > 0 || c !== '`') quote = c;
		} else if (c === '{') depth++;
		else if (c === '}') depth--;
		else if (c === '>' && depth === 0) return i + 1;
	}
	return -1;
}

/** An attribute's `{…}` value starting at `from` (the '{'), as [inner text, end index]. */
function braced(text, from) {
	let depth = 0;
	for (let i = from; i < text.length; i++) {
		if (text[i] === '{') depth++;
		else if (text[i] === '}' && --depth === 0) return [text.slice(from + 1, i), i + 1];
	}
	return null;
}

const negate = (expr) => {
	const e = expr.trim();
	if (e.startsWith('!') && !/[&|?]/.test(e)) return e.slice(1).replace(/^\((.*)\)$/s, '$1');
	return /^[\w.$]+(\([^()]*\))?$/.test(e) ? `!${e}` : `!(${e})`;
};

const BUTTON = {
	primary: 'variant="solid" tone="accent"',
	secondary: '',
	danger: 'variant="solid" tone="danger"',
	ghost: 'variant="ghost" tone="accent"',
	'danger-ghost': 'variant="ghost" tone="danger"'
};
const ICON_SIZE = { 18: 'sm', 20: 'md', 22: 'lg' };

/** Rewrites for one opening tag of `component`; `note` reports what needs a person. */
function rewriteTag(component, tag, note) {
	let t = tag;
	/** Renames the prop in every form: `from={…}`, `bind:from={…}`, `bind:from`, `{from}` and a bare `from`. */
	const rename = (from, to) => {
		// Shorthands name a variable too: keep the variable, rename only the prop.
		t = t.replace(new RegExp(`(\\s)bind:${from}(?=[\\s/>])`, 'g'), `$1bind:${to}={${from}}`);
		t = t.replace(new RegExp(`(\\s)\\{${from}\\}`, 'g'), `$1${to}={${from}}`);
		t = t.replace(new RegExp(`(\\s)(bind:)?${from}(?=[\\s=/>])`, 'g'), `$1$2${to}`);
	};
	switch (component) {
		case 'Button':
			t = t.replace(/(\s)variant="([\w-]+)"/g, (m, sp, v) => (v in BUTTON ? (BUTTON[v] ? sp + BUTTON[v] : '') : m));
			if (/\svariant=\{/.test(t)) note('Button variant is computed: split it into variant and tone by hand');
			break;
		case 'ConfirmDialog': {
			const at = t.search(/\sdanger=\{/);
			if (at !== -1) {
				const start = t.indexOf('{', at);
				const [expr, end] = braced(t, start);
				t = `${t.slice(0, at + 1)}tone={${expr.trim()} ? 'danger' : 'accent'}${t.slice(end)}`;
			}
			t = t.replace(/(\s)danger(?=[\s/>])/g, '$1tone="danger"');
			break;
		}
		case 'IconButton':
			rename('active', 'current');
			t = t.replace(/(\s)size=\{(18|20|22)\}/g, (_, sp, n) => `${sp}size="${ICON_SIZE[n]}"`);
			if (/\ssize=\{/.test(t)) note('IconButton size is a number: use size="sm" | "md" | "lg"');
			break;
		case 'AppHeader':
			rename('profileActive', 'profileCurrent');
			t = t.replace(/(\s)labels="active"/g, '$1labels="current"');
			if (/\slabels=\{/.test(t)) note('AppHeader labels is computed: its "active" value is now "current"');
			break;
		case 'CollapsibleSection': {
			rename('appearance', 'layout');
			rename('variant', 'emphasis');
			rename('ontogglecollapse', 'onexpandedchange');
			t = t.replace(/(\s)\{collapsed\}/g, '$1collapsed={collapsed}');
			const at = t.search(/\scollapsed=\{/);
			if (at !== -1) {
				const start = t.indexOf('{', at);
				const [expr, end] = braced(t, start);
				t = `${t.slice(0, at + 1)}expanded={${negate(expr)}}${t.slice(end)}`;
			}
			if (/\s(bind:)?collapsed(?=[\s=/>])/.test(t)) note('CollapsibleSection collapsed: use expanded (the opposite)');
			break;
		}
		case 'ActiveList':
			rename('appearance', 'layout');
			rename('ontoggle', 'onactivechange');
			rename('inactiveOpen', 'inactiveExpanded');
			break;
	}
	return t;
}

const COMPONENTS = ['Button', 'ConfirmDialog', 'IconButton', 'AppHeader', 'CollapsibleSection', 'ActiveList'];
const tagStart = new RegExp(`<(${COMPONENTS.join('|')})(?=[\\s/>])`, 'g');

let changed = 0;
const notes = new Set();
for (const file of files(join(root, 'src'))) {
	const text = readFileSync(file, 'utf8');
	const where = (index) => `${relative(root, file)}:${text.slice(0, index).split('\n').length}`;
	const note = (index) => (message) => notes.add(`${where(index)}  ${message}`);

	if (file.endsWith('.svelte')) {
		let out = '';
		let last = 0;
		for (const m of text.matchAll(tagStart)) {
			const end = tagEnd(text, m.index);
			if (end === -1 || m.index < last) continue;
			out += text.slice(last, m.index) + rewriteTag(m[1], text.slice(m.index, end), note(m.index));
			last = end;
		}
		out += text.slice(last);
		if (out !== text) {
			changed++;
			if (!dry) writeFileSync(file, out);
			console.log(`${dry ? 'would update' : 'updated'} ${relative(root, file)}`);
		}
	}
	for (const m of text.matchAll(/<AddRow\b/g)) note(m.index)('AddRow is removed: use a "+ New …" Button and NameModal');
	if (/TabBar|TabItem/.test(text))
		for (const m of text.matchAll(/\bactive\s*:/g)) note(m.index)('TabItem.active is now current');
	for (const m of text.matchAll(/\b(SignOutCard|SyncStatusCard)\b/g))
		note(m.index)(`${m[1]} is no longer exported: use AccountPanel`);
}

console.log(`\n${changed} file(s) ${dry ? 'to update' : 'updated'}.`);
if (notes.size) {
	console.log(`\nTo finish by hand:\n${[...notes].map((n) => `  ${n}`).join('\n')}`);
}
