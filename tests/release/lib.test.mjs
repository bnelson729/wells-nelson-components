import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareVersions, latestVersion, preparePackageJson, siblingRange } from '../../scripts/release/lib.mjs';

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
		assert.throws(() => preparePackageJson(pkg, '0.0.1-pre.abc', { '@wells-nelson/displays': '0.0.1' }), /Not a release/);
	});
});
