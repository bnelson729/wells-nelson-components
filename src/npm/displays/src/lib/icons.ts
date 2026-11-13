/**
 * 24x24 stroke icons (inner SVG markup, drawn with `stroke="currentColor"`).
 * The base set covers what the shared components and typical apps need; apps add their own
 * with `registerIcons` before the first render.
 */
export const baseIcons = {
	alert: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.3v.2"/>',
	check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
	chevron: '<path d="M6 9l6 6 6-6"/>',
	cloud: '<path d="M7 18.5h10.5a4 4 0 0 0 .6-8 6 6 0 0 0-11.6 1.6A3.3 3.3 0 0 0 7 18.5z"/>',
	'cloud-pending':
		'<path d="M7 18.5h10.5a4 4 0 0 0 .6-8 6 6 0 0 0-11.6 1.6A3.3 3.3 0 0 0 7 18.5z"/><path d="M12 10.5v5M9.8 12.7l2.2-2.2 2.2 2.2"/>',
	download:
		'<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4.5 16v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3"/>',
	gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
	grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
	home: '<path d="M3.5 11L12 4l8.5 7"/><path d="M6 9.5V20h4.5v-5.5h3V20H18V9.5"/>',
	mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
	pencil: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
	plus: '<path d="M12 5v14M5 12h14"/>',
	refresh:
		'<path d="M20 11a8 8 0 0 0-14.7-4.3L4 8.5M4 13a8 8 0 0 0 14.7 4.3l1.3-1.8"/><path d="M4 4v4.5h4.5M20 20v-4.5h-4.5"/>',
	search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.4-4.4"/>',
	share:
		'<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1"/>',
	trash:
		'<path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5l1-12.5M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/>',
	upload:
		'<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4.5 16v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3"/>',
	undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
	user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
	'wifi-off':
		'<path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 4.2-2.4M14.8 10.5A10 10 0 0 1 19 12.9M2 9a15 15 0 0 1 4.1-2.6M10.7 5.1A15 15 0 0 1 22 9"/><circle cx="12" cy="20" r="0.6"/>',
	x: '<path d="M6 6l12 12M18 6L6 18"/>'
} as const;

export type BaseIconName = keyof typeof baseIcons;

/** A base icon or any name an app registered. `string & {}` keeps editor completion for the base set. */
export type IconName = BaseIconName | (string & {});

const registry = new Map<string, string>(Object.entries(baseIcons));

/**
 * Add (or replace) icons. Values are the inner SVG markup for a 24x24 viewBox, stroke-based.
 * Call once at startup, before anything renders them.
 */
export function registerIcons(icons: Record<string, string>) {
	for (const [name, markup] of Object.entries(icons)) registry.set(name, markup);
}

/** The SVG markup for an icon, or '' when the name isn't registered. */
export function iconMarkup(name: IconName): string {
	return registry.get(name) ?? '';
}

export function hasIcon(name: string): boolean {
	return registry.has(name);
}
