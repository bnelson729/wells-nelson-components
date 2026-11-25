/**
 * node scripts/release/cut-changelog.mjs <package folder> <version> [<date>]
 *
 * Turns the package's `## Unreleased (…)` heading into `## <version> (<date>)` (today, UTC, by
 * default). Run by the publish job after a release; the result is committed to main. Does nothing
 * when there's no Unreleased heading (e.g. a re-run after it was already cut).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PACKAGES, changelogPath, cutChangelog } from './lib.mjs';

const [pkg, version, date = new Date().toISOString().slice(0, 10)] = process.argv.slice(2);
if (!PACKAGES.includes(pkg) || !version) {
	console.error(`Usage: cut-changelog.mjs <${PACKAGES.join('|')}> <version> [<yyyy-mm-dd>]`);
	process.exit(1);
}

const path = changelogPath(pkg);
const next = cutChangelog(readFileSync(path, 'utf8'), version, date);
if (next === null) {
	console.log(`${path} has no Unreleased section; nothing to cut.`);
} else {
	writeFileSync(path, next);
	console.log(`${path}: Unreleased is now ${version} (${date}).`);
}
