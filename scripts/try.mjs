/**
 * Try unreleased package changes in sites:
 *
 *   npm run try -- ../my-site ../my-other-site
 *
 * Builds and packs every package, then installs the tarballs into each named site: only the
 * @wells-nelson packages the site already depends on, each in the same section (dependencies or
 * devDependencies). The site's package.json then points at `file:…tgz`; its "Use published
 * packages" workflow puts it back on npm once the packages are released.
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const sites = process.argv.slice(2);
if (sites.length === 0) {
	console.error('Usage: npm run try -- <site folder> [<site folder> …]');
	process.exit(1);
}
for (const site of sites) {
	if (!existsSync(join(site, 'package.json'))) {
		console.error(`${site} has no package.json.`);
		process.exit(1);
	}
}

const run = (command, cwd = process.cwd()) => execSync(command, { cwd, stdio: 'inherit' });
run('npm run build');
run('npm run pack:all');

const packs = resolve('packs');
const tarballs = new Map(
	readdirSync(packs)
		.filter((f) => f.endsWith('.tgz'))
		.map((f) => [
			`@wells-nelson/${f.replace(/^wells-nelson-/, '').replace(/-\d+\.\d+\.\d+\.tgz$/, '')}`,
			join(packs, f)
		])
);

for (const site of sites) {
	const root = resolve(site);
	const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
	for (const [section, flag] of [
		['dependencies', ''],
		['devDependencies', ' -D']
	]) {
		const names = Object.keys(pkg[section] ?? {}).filter((n) => tarballs.has(n));
		if (names.length === 0) continue;
		const paths = names.map((n) => JSON.stringify(relative(root, tarballs.get(n)).split(sep).join('/')));
		console.log(`\n${site}: ${names.join(', ')}`);
		run(`npm install${flag} ${paths.join(' ')}`, root);
	}
}
