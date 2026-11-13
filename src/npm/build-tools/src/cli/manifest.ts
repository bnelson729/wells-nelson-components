#!/usr/bin/env node
/**
 * wn-manifest --name "My App" --short-name MA --description "…"
 *             --background "#f3f5f8" --theme "#1f5fa8" [--out static/manifest.webmanifest]
 */
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { renderManifest } from '../manifest.js';

const { values } = parseArgs({
	options: {
		name: { type: 'string' },
		'short-name': { type: 'string' },
		description: { type: 'string', default: '' },
		background: { type: 'string' },
		theme: { type: 'string' },
		out: { type: 'string', default: 'static/manifest.webmanifest' }
	}
});

const { name, 'short-name': shortName, background, theme } = values;
if (!name || !shortName || !background || !theme) {
	console.error(
		'Usage: wn-manifest --name <name> --short-name <short> --background <#hex> --theme <#hex> [--description <text>] [--out <path>]'
	);
	process.exit(1);
}

writeFileSync(
	values.out,
	renderManifest({ name, shortName, description: values.description, backgroundColor: background, themeColor: theme })
);
console.log(`manifest written: ${values.out}`);
