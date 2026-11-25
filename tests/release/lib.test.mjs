import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	compareVersions,
	cutChangelog,
	incrementFor,
	latestVersion,
	preparePackageJson,
	readUnreleased,
	releaseProblems,
	siblingRange
} from '../../scripts/release/lib.mjs';

describe('latestVersion', () => {
	const tags = [
		'@wells-nelson/displays@0.0.9',
		'@wells-nelson/displays@0.0.10',
		'@wells-nelson/displays@0.1.0-pre.abc123',
		'@wells-nelson/displays-extra@9.9.9',
		'@wells-nelson/interactions@2.0.0',
		'unrelated'
	];

	it('compares numerically, ignores pre-releases and other packages', () => {
		assert.equal(latestVersion('@wells-nelson/displays', tags), '0.0.10');
		assert.equal(latestVersion('@wells-nelson/interactions', tags), '2.0.0');
		assert.equal(latestVersion('@wells-nelson/build-tools', tags), null);
	});

	it('orders versions', () => {
		assert.ok(compareVersions('1.10.0', '1.9.9') > 0);
		assert.equal(compareVersions('1.2.3', '1.2.3'), 0);
	});
});

describe('siblingRange', () => {
	it('allows newer releases up to the next major', () => {
		assert.equal(siblingRange('0.0.4'), '>=0.0.4 <1.0.0');
		assert.equal(siblingRange('2.3.1'), '>=2.3.1 <3.0.0');
	});
});

describe('preparePackageJson', () => {
	const pkg = {
		name: '@wells-nelson/interactions',
		version: '0.0.0',
		peerDependencies: { '@wells-nelson/displays': '*', svelte: '^5.40.0' },
		devDependencies: { '@wells-nelson/displays': '*' }
	};

	it('sets the version and real sibling ranges, leaving others alone', () => {
		const out = preparePackageJson(pkg, '0.0.7', { '@wells-nelson/displays': '0.0.12' });
		assert.equal(out.version, '0.0.7');
		assert.deepEqual(out.peerDependencies, { '@wells-nelson/displays': '>=0.0.12 <1.0.0', svelte: '^5.40.0' });
		// devDependencies aren't installed by consumers; left as is.
		assert.equal(out.devDependencies['@wells-nelson/displays'], '*');
		// The input isn't modified.
		assert.equal(pkg.peerDependencies['@wells-nelson/displays'], '*');
	});

	it('refuses to publish against a sibling that was never released', () => {
		assert.throws(() => preparePackageJson(pkg, '0.0.1', {}), /never been released/);
	});

	it('refuses non-release versions', () => {
		assert.throws(
			() => preparePackageJson(pkg, '0.0.1-pre.abc', { '@wells-nelson/displays': '0.0.1' }),
			/Not a release/
		);
	});
});

const changelog = (heading, ...entries) =>
	[
		'# Changelog: @wells-nelson/displays',
		'',
		heading,
		'',
		...entries.map((e) => `- ${e}`),
		'',
		'## 1.2.0 (2026-11-12)',
		'',
		'- Older entry.',
		''
	].join('\n');
const released = '# Changelog\n\n## 1.0.0 (2026-01-01)\n\n- y\n';

describe('readUnreleased', () => {
	it('reads the bump, the entries and Breaking markers, stopping at the next heading', () => {
		assert.deepEqual(readUnreleased(changelog('## Unreleased (minor)', 'New `PageHeader`.', 'Fix a gap.')), {
			found: true,
			level: 'minor',
			entries: ['New `PageHeader`.', 'Fix a gap.'],
			breaking: false
		});
		assert.equal(readUnreleased(changelog('## Unreleased (major)', '**Breaking:** removed X.')).breaking, true);
		assert.equal(readUnreleased(changelog('## Unreleased', 'x')).level, null);
		assert.equal(readUnreleased(released).found, false);
	});
});

describe('releaseProblems', () => {
	it('accepts a heading with a bump and entries', () => {
		assert.deepEqual(releaseProblems('displays', changelog('## Unreleased (patch)', 'Fix.')), []);
	});

	it('refuses a release without entries or without a bump', () => {
		assert.match(releaseProblems('displays', released)[0], /no entries/);
		assert.match(releaseProblems('displays', changelog('## Unreleased'))[0], /no entries/);
		assert.match(releaseProblems('displays', changelog('## Unreleased', 'Fix.'))[0], /must name the bump/);
	});

	it('refuses a breaking change in anything but a major, even when chosen by hand', () => {
		const text = changelog('## Unreleased (minor)', '**Breaking:** `confirmLabel` is required.');
		assert.match(releaseProblems('displays', text)[0], /must be major/);
		assert.match(releaseProblems('displays', text, 'patch')[0], /must be major/);
		assert.deepEqual(releaseProblems('displays', text, 'major'), []);
		assert.deepEqual(releaseProblems('displays', changelog('## Unreleased (major)', '**Breaking:** x')), []);
	});
});

describe('incrementFor', () => {
	it('takes the manual choice, else the heading', () => {
		assert.equal(incrementFor(changelog('## Unreleased (minor)', 'x')), 'minor');
		assert.equal(incrementFor(changelog('## Unreleased (minor)', 'x'), 'major'), 'major');
		assert.throws(() => incrementFor(changelog('## Unreleased', 'x')));
	});
});

describe('cutChangelog', () => {
	it('turns the Unreleased heading into the release heading', () => {
		const out = cutChangelog(changelog('## Unreleased (minor)', 'New thing.'), '1.3.0', '2026-11-25');
		assert.match(out, /^## 1\.3\.0 \(2026-11-25\)\n\n- New thing\.$/m);
		assert.doesNotMatch(out, /Unreleased/);
		assert.match(out, /## 1\.2\.0 \(2026-11-12\)/);
	});

	it('leaves a changelog without an Unreleased section alone', () => {
		assert.equal(cutChangelog(released, '1.0.1', '2026-11-25'), null);
	});
});
