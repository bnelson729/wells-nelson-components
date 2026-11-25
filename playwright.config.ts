import { defineConfig, devices } from '@playwright/test';

/**
 * The sandbox in a real browser (`npm run test:visual`): axe over its pages in light and dark, and
 * screenshots of the States page in every palette, light and dark, and in forced colors. Screenshots
 * are compared on Linux only (fonts differ between systems), where CI runs them; elsewhere only the
 * accessibility checks run. Update the baselines on purpose, when a change is meant to look different:
 * run the Packages workflow's "Update visual baselines" job, or `npm run test:visual:update` on Linux.
 *
 * Locally, PLAYWRIGHT_CHANNEL=msedge (or chrome) uses an installed browser instead of
 * `npx playwright install chromium`.
 */
const PORT = 4320;

export default defineConfig({
	testDir: 'tests/visual',
	snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: 0,
	reporter: process.env.CI ? 'github' : 'list',
	// A missing baseline is written (and the test passes) so a new state can't fail the first run.
	updateSnapshots: 'missing',
	expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled' } },
	use: {
		baseURL: `http://localhost:${PORT}/`,
		channel: process.env.PLAYWRIGHT_CHANNEL || undefined
	},
	projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 900 } } }],
	webServer: {
		command: `npm run bundle -w src/sandbox && npm run preview -w src/sandbox -- --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}/`,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000
	}
});
