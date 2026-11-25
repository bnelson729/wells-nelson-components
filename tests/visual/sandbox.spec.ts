/**
 * The design system in a browser: no serious accessibility problems on the sandbox's pages (axe,
 * light and dark), and the States page looks as it did, in every palette and mode (Linux only).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PALETTES = ['blue', 'green', 'purple'] as const;
const SCHEMES = ['light', 'dark'] as const;
const compareScreenshots = process.platform === 'linux';

async function open(page: Page, path: string) {
	await page.goto(path);
	await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	// Fonts and icons settled, nothing mid-transition.
	await page.evaluate(() => document.fonts.ready);
}

async function seriousViolations(page: Page) {
	const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
	return results.violations
		.filter((v) => v.impact === 'serious' || v.impact === 'critical')
		.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

for (const scheme of SCHEMES) {
	for (const palette of PALETTES) {
		test(`States page, ${palette}, ${scheme}: no serious accessibility problems`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
			await open(page, `/#/states?palette=${palette}`);
			expect(await seriousViolations(page)).toEqual([]);
			if (compareScreenshots)
				await expect(page).toHaveScreenshot(`states-${palette}-${scheme}.png`, { fullPage: true });
		});
	}

	for (const path of ['displays', 'interactions']) {
		test(`${path} page, ${scheme}: no serious accessibility problems`, async ({ page }) => {
			await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
			await open(page, `/#/${path}`);
			expect(await seriousViolations(page)).toEqual([]);
		});
	}
}

test('States page in forced colors keeps every state visible', async ({ page }) => {
	test.skip(!compareScreenshots, 'Screenshots are compared on Linux only.');
	await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
	await open(page, '/#/states');
	await expect(page).toHaveScreenshot('states-forced-colors.png', { fullPage: true });
});
