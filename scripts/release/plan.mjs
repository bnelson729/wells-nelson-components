/**
 * Decide which packages to release, in dependency order, and how to bump each one.
 *
 * PACKAGES (env): comma-separated package folder names, "all", or empty. Empty releases every
 * package whose shipped files changed since its latest tag (or that was never released).
 * INCREMENT (env): patch, minor or major from a manual run; empty on a push. Without it, each
 * package's bump comes from the commits since its last release (`Release: minor` / `Release: major`
 * lines; patch otherwise).
 * Writes `packages=<JSON array>` and `increments=<JSON object>` to $GITHUB_OUTPUT, and prints the
 * reasoning.
 */
import { appendFileSync } from 'node:fs';
import {
	PACKAGES,
	changedSince,
	commitMessagesSince,
	gitTags,
	incrementFromMessages,
	latestVersion,
	packageDir,
	readPackageJson
} from './lib.mjs';

const input = (process.env.PACKAGES ?? '').trim();
const manualIncrement = (process.env.INCREMENT ?? '').trim();
const tags = gitTags();
const lastTag = (pkg) => {
	const { name } = readPackageJson(packageDir(pkg));
	const latest = latestVersion(name, tags);
	return latest ? `${name}@${latest}` : null;
};

let selected;
if (input === 'all') {
	selected = [...PACKAGES];
	console.log('Releasing every package (requested).');
} else if (input) {
	const requested = input
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	const unknown = requested.filter((p) => !PACKAGES.includes(p));
	if (unknown.length) {
		console.error(`Unknown package(s): ${unknown.join(', ')}. Choose from: ${PACKAGES.join(', ')}.`);
		process.exit(1);
	}
	selected = PACKAGES.filter((p) => requested.includes(p));
	console.log(`Releasing the requested packages: ${selected.join(', ')}.`);
} else {
	selected = PACKAGES.filter((pkg) => {
		const tag = lastTag(pkg);
		if (!tag) {
			console.log(`${pkg}: never released, releasing.`);
			return true;
		}
		const changed = changedSince(pkg, tag);
		console.log(`${pkg}: ${changed ? 'changed' : 'unchanged'} since ${tag}.`);
		return changed;
	});
}

const increments = {};
for (const pkg of selected) {
	increments[pkg] = manualIncrement || incrementFromMessages(commitMessagesSince(pkg, lastTag(pkg)));
	console.log(`${pkg}: ${increments[pkg]}${manualIncrement ? ' (requested)' : ''}.`);
}

const output = `packages=${JSON.stringify(selected)}\nincrements=${JSON.stringify(increments)}`;
console.log(output);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${output}\n`);
