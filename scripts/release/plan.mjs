/**
 * Decide which packages to release, in dependency order, and how to bump each one.
 *
 * PACKAGES (env): comma-separated package folder names, "all", or empty. Empty releases every
 * package whose shipped files changed since its latest tag (or that was never released).
 * INCREMENT (env): patch, minor or major from a manual run; empty on a push. Without it, each
 * package's bump comes from its CHANGELOG.md: the heading `## Unreleased (patch|minor|major)`.
 *
 * Fails when a package to release has no Unreleased entries, when its heading names no bump, or
 * when an entry starts with **Breaking:** and the bump isn't major.
 *
 * Writes `packages=<JSON array>` and `increments=<JSON object>` to $GITHUB_OUTPUT, and prints the
 * reasoning. With `--check` (pull requests), it only checks the changed packages and writes nothing.
 */
import { appendFileSync, readFileSync } from 'node:fs';
import {
	PACKAGES,
	changedSince,
	changelogPath,
	gitTags,
	incrementFor,
	latestVersion,
	packageDir,
	readPackageJson,
	releaseProblems
} from './lib.mjs';

const checkOnly = process.argv.includes('--check');
const input = checkOnly ? '' : (process.env.PACKAGES ?? '').trim();
const manualIncrement = checkOnly ? '' : (process.env.INCREMENT ?? '').trim();
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

const changelogs = Object.fromEntries(selected.map((pkg) => [pkg, readFileSync(changelogPath(pkg), 'utf8')]));
const problems = selected.flatMap((pkg) => releaseProblems(pkg, changelogs[pkg], manualIncrement));
if (problems.length) {
	for (const p of problems) console.error(`::error::${p}`);
	process.exit(1);
}

const increments = {};
for (const pkg of selected) {
	increments[pkg] = incrementFor(changelogs[pkg], manualIncrement);
	console.log(`${pkg}: ${increments[pkg]}${manualIncrement ? ' (requested)' : ' (from its changelog)'}.`);
}

if (checkOnly) {
	console.log(selected.length ? 'Changelogs are ready to release.' : 'Nothing to release.');
	process.exit(0);
}

const output = `packages=${JSON.stringify(selected)}\nincrements=${JSON.stringify(increments)}`;
console.log(output);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${output}\n`);
