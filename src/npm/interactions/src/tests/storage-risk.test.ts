/**
 * The data-loss warning for local-only containers, and the Profile's links to the policies.
 * Safari (and every browser on iPhone and iPad) deletes a site's data after 7 days without a
 * visit unless the app is installed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppVersion from '../lib/AppVersion.svelte';
import DataRiskButton from '../lib/account/DataRiskButton.svelte';
import { deviceMayClearData, installHint } from '../lib/account/storage-risk.js';
import { render, settle } from './setup.js';

/** The warning sign, found by its accessible name (it has no visible text). */
const sign = (root: ParentNode, name: string) => root.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;

const nav = (userAgent: string, standalone?: boolean) => ({ userAgent, standalone }) as unknown as Navigator;
const IPHONE =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const MAC_SAFARI =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const MAC_CHROME =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const ANDROID =
	'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

afterEach(() => vi.unstubAllGlobals());

describe('deviceMayClearData', () => {
	it('is true for Safari tabs: iPhone and iPad (any browser) and Safari on a Mac', () => {
		expect(deviceMayClearData(nav(IPHONE, false))).toBe(true);
		expect(deviceMayClearData(nav(MAC_SAFARI))).toBe(true);
	});

	it('is false for installed apps and for browsers that keep site data', () => {
		expect(deviceMayClearData(nav(IPHONE, true))).toBe(false);
		expect(deviceMayClearData(nav(MAC_CHROME))).toBe(false);
		expect(deviceMayClearData(nav(ANDROID))).toBe(false);
		expect(deviceMayClearData(undefined)).toBe(false);
		vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(display-mode: standalone)' }));
		expect(deviceMayClearData(nav(MAC_SAFARI))).toBe(false);
	});

	it('says how to install on this device', () => {
		expect(installHint(nav(IPHONE, false))).toContain('Add to Home Screen');
		expect(installHint(nav(MAC_SAFARI))).toContain('Add to Dock');
	});
});

describe('DataRiskButton', () => {
	const nouns = { singular: 'project', plural: 'projects' };

	it('explains the risk and the ways to keep the data, offering sign-in when signed out', async () => {
		const el = render(DataRiskButton, {
			name: 'Launch',
			nouns,
			appName: 'Task Planner',
			signInHref: '/profile',
			profileHref: '/profile'
		});
		sign(el, '“Launch” may be deleted from this device').click();
		await settle();
		const dialog = document.querySelector('dialog')!;
		expect(dialog.textContent).toContain('“Launch” could be deleted');
		expect(dialog.textContent).toContain("haven't opened it for 7 days");
		expect(dialog.textContent).toContain('Install Task Planner.');
		expect(dialog.textContent).toContain('Sign in');
		expect(dialog.textContent).toContain('Use a different browser');
		expect(dialog.querySelector('a[href="/profile"]')).toBeTruthy();
	});

	it("suggests making it cloud-enabled once signed in, and leaves sign-in out when it isn't available", async () => {
		const signedIn = render(DataRiskButton, { name: 'Home', nouns, appName: 'Task Planner', signedIn: true });
		sign(signedIn, '“Home” may be deleted from this device').click();
		await settle();
		expect(document.querySelector('dialog')!.textContent).toContain('Make it cloud-enabled.');
		signedIn.remove();
		document.querySelectorAll('dialog').forEach((d) => d.remove());

		const local = render(DataRiskButton, { name: 'Home', nouns, appName: 'Task Planner', cloudConfigured: false });
		sign(local, '“Home” may be deleted from this device').click();
		await settle();
		const text = document.querySelector('dialog')!.textContent ?? '';
		expect(text).not.toContain('cloud-enabled');
		expect(text).toContain('Install Task Planner.');
	});
});

describe('AppVersion links', () => {
	it('lists the given links under the version, opening in a new tab', () => {
		const el = render(AppVersion, {
			version: '1.0.0',
			links: [
				{ label: 'Privacy policy', href: 'https://example.com/privacy' },
				{ label: 'Terms of service', href: 'https://example.com/terms' }
			]
		});
		const links = [...el.querySelectorAll('a')];
		expect(links.map((a) => a.getAttribute('href'))).toEqual([
			'https://example.com/privacy',
			'https://example.com/terms'
		]);
		expect(links.every((a) => a.target === '_blank')).toBe(true);
		expect(links[0].textContent).toBe('Privacy policy (opens in a new tab)');
	});
});
