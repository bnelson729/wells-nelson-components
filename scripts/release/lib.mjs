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

const INCREMENTS = ['patch', 'minor', 'major'];

export const changelogPath = (pkg) => join(packageDir(pkg), 'CHANGELOG.md');

const UNRELEASED = /^## Unreleased\b(.*)$/m;

/**
 * The `## Unreleased (patch|minor|major)` section of a changelog: the bump it asks for (null when
 * the heading names none), its entries (top-level `- ` lines) and whether any of them starts with
 * `**Breaking:**`. `found` is false when there's no Unreleased heading at all.
 */
export function readUnreleased(text) {
	const m = UNRELEASED.exec(text);
	if (!m) return { found: false, level: null, entries: [], breaking: false };
	const level = /^\s*\((patch|minor|major)\)\s*$/i.exec(m[1])?.[1].toLowerCase() ?? null;
	const rest = text.slice(m.index + m[0].length);
	const next = rest.search(/^## /m);
	const body = next === -1 ? rest : rest.slice(0, next);
	const entries = body
		.split(/\r?\n/)
		.filter((line) => line.startsWith('- '))
		.map((line) => line.slice(2));
	const breaking = entries.some((e) => e.startsWith('**Breaking:**'));
	return { found: true, level, entries, breaking };
}

/**
 * Why a changed package can't be released, or [] when it can. The changelog is the source of
 * truth: its Unreleased heading names the bump, an entry marked **Breaking:** needs `major`, and a
 * package whose shipped files changed needs entries. `manual` is a bump chosen on a manual run;
 * it overrides the heading but not the Breaking rule.
 */
export function releaseProblems(pkg, changelog, manual = '') {
	const { found, level, entries, breaking } = readUnreleased(changelog);
	const file = `src/npm/${pkg}/CHANGELOG.md`;
	if (!found || entries.length === 0)
		return [`${pkg}: its shipped files changed, but ${file} has no entries under "## Unreleased (patch|minor|major)".`];
	const problems = [];
	if (!manual && !level)
		problems.push(`${pkg}: the Unreleased heading in ${file} must name the bump: "## Unreleased (patch|minor|major)".`);
	const bump = manual || level;
	if (breaking && bump && bump !== 'major')
		problems.push(`${pkg}: ${file} lists a **Breaking:** change, so the release must be major, not ${bump}.`);
	return problems;
}

/** The bump for a package: the manual choice, else its changelog's Unreleased heading. */
export function incrementFor(changelog, manual = '') {
	if (manual) return manual;
	const { level } = readUnreleased(changelog);
	if (!level || !INCREMENTS.includes(level)) throw new Error('The changelog names no bump.');
	return level;
}

/**
 * The changelog with its Unreleased heading turned into the release's: `## <version> (<date>)`.
 * null when there's no Unreleased heading (e.g. it was already cut).
 */
export function cutChangelog(text, version, date) {
	const m = UNRELEASED.exec(text);
	if (!m) return null;
	return `${text.slice(0, m.index)}## ${version} (${date})${text.slice(m.index + m[0].length)}`;
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
