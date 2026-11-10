#!/usr/bin/env node
/**
 * wn-icons --letters WN --background "#1f5fa8" [--foreground "#ffffff"] [--out static]
 *
 * Writes the PWA icons and favicon; commit the output under static/.
 */
import { parseArgs } from 'node:util';
import { writeIcons } from '../icons.js';

const { values } = parseArgs({
	options: {
		letters: { type: 'string' },
		background: { type: 'string' },
		foreground: { type: 'string', default: '#ffffff' },
		out: { type: 'string', default: 'static' }
	}
});

if (!values.letters || !values.background) {
	console.error('Usage: wn-icons --letters WN --background "#1f5fa8" [--foreground "#ffffff"] [--out static]');
	process.exit(1);
}

try {
	const files = writeIcons({
		letters: values.letters,
		background: values.background,
		foreground: values.foreground,
		outDir: values.out
	});
	console.log(`icons written: ${files.join(', ')}`);
} catch (err) {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
}
