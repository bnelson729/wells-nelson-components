/**
 * The palette contract: what a brand palette (`palettes/<name>.css`) sets on `:root`, in light and
 * again in `@media (prefers-color-scheme: dark)`. See palettes/README.md.
 */

/** Every palette sets these, in both modes. */
export const PALETTE_ACCENT_TOKENS = [
	'--accent',
	'--accent-strong',
	'--accent-text',
	'--accent-soft',
	'--on-accent'
] as const;

/**
 * A palette may tint the neutrals to match its accent: then it sets all of these, in both modes, or
 * none of them. `--surface` may be added to the dark set (cards a shade above the page).
 */
export const PALETTE_NEUTRAL_TOKENS = [
	'--bg',
	'--surface-2',
	'--surface-hover',
	'--text',
	'--muted',
	'--border',
	'--border-strong'
] as const;

/** The palettes that ship with the package: `@wells-nelson/displays/palettes/<name>.css`. */
export const PALETTES = ['blue', 'green', 'purple'] as const;
export type PaletteName = (typeof PALETTES)[number];
