/**
 * Decide which packages to release, in dependency order.
 *
 * PACKAGES (env): comma-separated package folder names, "all", or empty. Empty releases every
 * package whose shipped files changed since its latest tag (or that was never released).
 * Writes `packages=<JSON array>` to $GITHUB_OUTPUT, and prints the reasoning.
 */
import { appendFileSync } from 'node:fs';
import { PACKAGES, changedSince, gitTags, latestVersion, packageDir, readPackageJson } from './lib.mjs';

const input = (process.env.PACKAGES ?? '').trim();
let selected;

if (input === 'all') {
	selected = [...PACKAGES];
	console.log('Releasing every package (requested).');
} else if (input) {
	const requested = input.split(',').map((s) => s.trim()).filter(Boolean);
	const unknown = requested.filter((p) => !PACKAGES.includes(p));
	if (unknown.length) {
		console.error(`Unknown package(s): ${unknown.join(', ')}. Choose from: ${PACKAGES.join(', ')}.`);
		process.exit(1);
	}
	selected = PACKAGES.filter((p) => requested.includes(p));
	console.log(`Releasing the requested packages: ${selected.join(', ')}.`);
} else {
	const tags = gitTags();
	selected = PACKAGES.filter((pkg) => {
		const { name } = readPackageJson(packageDir(pkg));
		const latest = latestVersion(name, tags);
		if (!latest) {
			console.log(`${name}: never released, releasing.`);
			return true;
		}
		const changed = changedSince(pkg, `${name}@${latest}`);
		console.log(`${name}: ${changed ? 'changed' : 'unchanged'} since ${latest}.`);
		return changed;
	});
}

const output = `packages=${JSON.stringify(selected)}`;
console.log(output);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${output}\n`);
