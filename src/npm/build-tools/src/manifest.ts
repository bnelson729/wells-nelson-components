export interface ManifestOptions {
	/** e.g. "My App — Projects" */
	name: string;
	/** e.g. "MA" */
	shortName: string;
	description: string;
	/** Splash background, usually the theme's --bg. */
	backgroundColor: string;
	/** Browser UI color, usually the theme's --accent. */
	themeColor: string;
}

/**
 * `static/manifest.webmanifest` for an installable PWA served from any base path (relative
 * start_url and scope), using the icons `writeIcons` produces.
 */
export function renderManifest(o: ManifestOptions): string {
	const manifest = {
		name: o.name,
		short_name: o.shortName,
		description: o.description,
		start_url: './',
		scope: './',
		display: 'standalone',
		background_color: o.backgroundColor,
		theme_color: o.themeColor,
		icons: [
			{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
			{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
			{ src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
			{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }
		]
	};
	return `${JSON.stringify(manifest, null, '\t')}\n`;
}
