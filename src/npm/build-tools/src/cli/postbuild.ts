#!/usr/bin/env node
/**
 * wn-postbuild [--dir build] [--shell 404.html] [--forbid <text>]... [--forbid-from <file.json>#<path>]...
 *
 * Example: wn-postbuild --forbid-from seed/demo.json#people.name
 * A missing --forbid-from file is skipped (the seed is git-ignored, so CI doesn't have it).
 */
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { collectStrings, postbuild } from '../postbuild.js';

const { values } = parseArgs({
	options: {
		dir: { type: 'string', default: 'build' },
		shell: { type: 'string', default: '404.html' },
		forbid: { type: 'string', multiple: true, default: [] },
		'forbid-from': { type: 'string', multiple: true, default: [] }
	}
});

const forbid = [...values.forbid];
for (const spec of values['forbid-from']) {
	const [file, path = ''] = spec.split('#');
	if (!existsSync(file)) continue;
	forbid.push(...collectStrings(JSON.parse(readFileSync(file, 'utf8')), path));
}

try {
	postbuild({ dir: values.dir, shell: values.shell, forbid });
} catch (err) {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
}
