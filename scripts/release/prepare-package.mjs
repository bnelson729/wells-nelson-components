/**
 * node scripts/release/prepare-package.mjs <package folder> <version>
 *
 * Writes the release version into the package's package.json and turns in-repo ranges for
 * sibling packages ("*") into real ones based on their latest release tags. Run in CI right
 * before `npm publish`; the change is never committed.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gitTags, latestVersion, packageDir, preparePackageJson, readPackageJson, PACKAGES } from './lib.mjs';

const [pkg, version] = process.argv.slice(2);
if (!PACKAGES.includes(pkg) || !version) {
	console.error(`Usage: prepare-package.mjs <${PACKAGES.join('|')}> <version>`);
	process.exit(1);
}

const tags = gitTags();
const released = Object.fromEntries(
	PACKAGES.map((p) => readPackageJson(packageDir(p)).name).map((name) => [name, latestVersion(name, tags)])
);
const dir = packageDir(pkg);
const prepared = preparePackageJson(readPackageJson(dir), version, released);
writeFileSync(join(dir, 'package.json'), `${JSON.stringify(prepared, null, 2)}\n`);

console.log(`${prepared.name}@${prepared.version}`);
for (const field of ['dependencies', 'peerDependencies']) {
	for (const [dep, range] of Object.entries(prepared[field] ?? {})) {
		if (dep.startsWith('@wells-nelson/')) console.log(`  ${field}: ${dep} ${range}`);
	}
}
