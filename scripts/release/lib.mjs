/**
 * Release helpers shared by plan.mjs and prepare-package.mjs. Each package is versioned on its
 * own with git tags named `<package name>@<version>`, e.g. `@wells-nelson/displays@1.4.2`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Every package, in dependency order (a package comes after the ones it depends on). */
export const PACKAGES = ['displays', 'interactions', 'data-storage', 'build-tools'];

export const packageDir = (pkg) => join('src', 'npm', pkg);

export function readPackageJson(dir) {
	return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
}

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseVersion(version) {
	const m = SEMVER.exec(version);
	return m ? m.slice(1, 4).map(Number) : null;
}

export function compareVersions(a, b) {
	const pa = parseVersion(a);
	const pb = parseVersion(b);
	for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
	return 0;
}

/** The highest released version of `name` among `tags`, or null. Pre-release tags are ignored. */
export function latestVersion(name, tags) {
	const prefix = `${name}@`;
	const versions = tags
		.filter((t) => t.startsWith(prefix))
		.map((t) => t.slice(prefix.length))
		.filter((v) => parseVersion(v));
	return versions.sort(compareVersions).at(-1) ?? null;
}

/** Range for a sibling package: at least the latest release, below its next major. */
export function siblingRange(version) {
	const [major] = parseVersion(version);
	return `>=${version} <${major + 1}.0.0`;
}

/**
 * Set the version and replace in-repo ranges ("*") for sibling packages with real ones.
 * `released` maps package names to their latest released version.
 */
export function preparePackageJson(pkg, version, released) {
	if (!parseVersion(version)) throw new Error(`Not a release version: ${version}`);
	const next = { ...pkg, version };
	for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
		if (!next[field]) continue;
		next[field] = { ...next[field] };
		for (const dep of Object.keys(next[field])) {
			if (!dep.startsWith('@wells-nelson/')) continue;
			const latest = released[dep];
			if (!latest) throw new Error(`${pkg.name} depends on ${dep}, which has never been released. Release it first.`);
			next[field][dep] = siblingRange(latest);
		}
	}
	return next;
}

export function gitTags() {
	return execFileSync('git', ['tag', '--list'], { encoding: 'utf8' }).split('\n').filter(Boolean);
}

/** True when the package's shipped files changed since `tag` (tests and Markdown don't count). */
export function changedSince(pkg, tag) {
	const dir = packageDir(pkg).replaceAll('\\', '/');
	try {
		execFileSync(
			'git',
			['diff', '--quiet', tag, 'HEAD', '--', dir, `:(exclude)${dir}/src/tests`, `:(exclude,glob)${dir}/**/*.md`],
			{ stdio: 'ignore' }
		);
		return false;
	} catch (err) {
		if (err.status === 1) return true;
		throw err;
	}
}
