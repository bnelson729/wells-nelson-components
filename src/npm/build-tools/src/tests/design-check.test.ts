import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkDesign } from '../design-check.js';

const dirs: string[] = [];
function site(files: Record<string, string>) {
	const root = mkdtempSync(join(tmpdir(), 'wn-design-'));
	dirs.push(root);
	for (const [name, text] of Object.entries(files)) {
		mkdirSync(dirname(join(root, name)), { recursive: true });
		writeFileSync(join(root, name), text);
	}
	return root;
}
afterEach(() => {
	for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const rules = (root: string, strict = false) =>
	checkDesign({ root, strict }).map((f) => `${f.file}:${f.line} ${f.severity} ${f.rule}`);

describe('checkDesign', () => {
	it('flags raw colors in components, not in the token stylesheet', () => {
		const root = site({
			'src/app.css': ':root {\n\t--brand: #6b3fa0;\n}\n',
			'src/lib/Card.svelte':
				'<p style="color: red">x</p>\n<style>\n\t.a {\n\t\tcolor: #fff;\n\t\tbackground: rgb(0 0 0 / 0.5);\n\t}\n</style>\n'
		});
		expect(rules(root)).toEqual(['src/lib/Card.svelte:4 error raw-color', 'src/lib/Card.svelte:5 error raw-color']);
	});

	it("flags :global reaches into library internals, and global selectors on them, but not a component's own classes", () => {
		const root = site({
			'src/app.css': '.line .icon-btn {\n\tcolor: var(--muted);\n}\n.line-name {\n\tfont-weight: 500;\n}\n',
			'src/routes/+page.svelte':
				'<style>\n\t.row :global(.icon-btn) {\n\t\tcolor: var(--muted);\n\t}\n\t.icon {\n\t\tdisplay: block;\n\t}\n\t.head :global(.my-thing) {\n\t\tgap: 0;\n\t}\n</style>\n'
		});
		expect(rules(root)).toEqual([
			'src/app.css:1 error library-internals',
			'src/routes/+page.svelte:2 error library-internals'
		]);
	});

	it('warns about literal font sizes and z-indexes, as errors when strict', () => {
		const root = site({
			'src/A.svelte':
				'<style>\n\t.a {\n\t\tfont-size: 0.9rem;\n\t\tz-index: 5;\n\t\tfont-size: var(--text-sm);\n\t\tfont-size: inherit;\n\t}\n</style>\n'
		});
		expect(rules(root)).toEqual(['src/A.svelte:3 warning font-size', 'src/A.svelte:4 warning z-index']);
		expect(rules(root, true)).toEqual(['src/A.svelte:3 error font-size', 'src/A.svelte:4 error z-index']);
	});

	it('allows a line marked design-allow', () => {
		const root = site({
			'src/Logo.svelte':
				'<style>\n\t.g {\n\t\t/* design-allow: the brand mark is a fixed color */\n\t\tfill: #4285f4;\n\t}\n</style>\n'
		});
		expect(rules(root)).toEqual([]);
	});
});
