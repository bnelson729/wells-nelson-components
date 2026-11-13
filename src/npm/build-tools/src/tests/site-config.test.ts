import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { siteKit } from '../kit.js';
import { siteVitest } from '../vitest.js';

const site = (env = '') => {
	const root = mkdtempSync(join(tmpdir(), 'site-'));
	writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '2.3.4' }));
	if (env) writeFileSync(join(root, '.env.production'), env);
	return root;
};

describe('siteKit', () => {
	afterEach(() => delete process.env.APP_VERSION);

	it('builds a static SPA under the Pages path, with the local version and the Supabase CSP', () => {
		const kit = siteKit({
			mode: 'production',
			base: '/my-site',
			root: site('VITE_SUPABASE_URL=https://abc.supabase.co')
		});
		expect(kit.paths.base).toBe('/my-site');
		expect(kit.version).toEqual({ name: '2.3.4-local' });
		expect(kit.compilerOptions.runes).toBe(true);
		expect(JSON.stringify(kit.csp)).toContain('https://abc.supabase.co');
		expect(kit.adapter.name).toBe('@sveltejs/adapter-static');
	});

	it('uses BASE_PATH, the deployed version, and polls for updates on request', () => {
		process.env.APP_VERSION = '1.4.0';
		const kit = siteKit({ mode: 'production', base: '/my-site', pollUpdates: true, root: site('BASE_PATH=/') });
		expect(kit.paths.base).toBe('');
		expect(kit.version).toEqual({ name: '1.4.0', pollInterval: 300_000 });
	});

	it('serves from the root in development', () => {
		expect(siteKit({ mode: 'development', base: '/my-site', root: site() }).paths.base).toBe('');
	});
});

describe('siteVitest', () => {
	it('stands in for $app/env with a file that exists', () => {
		const config = siteVitest();
		expect(
			existsSync(config.resolve.alias['$app/env'].replace(/\.js$/, '.ts')) ||
				existsSync(config.resolve.alias['$app/env'])
		).toBe(true);
		expect(config.test.include).toEqual(['src/**/*.test.ts']);
	});
});
