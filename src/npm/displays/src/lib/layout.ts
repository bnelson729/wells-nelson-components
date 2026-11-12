import { MediaQuery } from 'svelte/reactivity';

/**
 * Screens that get the phone layout (a bottom `TabBar` instead of the `AppHeader`): narrow ones,
 * and touch screens that are short, i.e. a phone held sideways. Tablets and desktops keep the
 * header. Device type comes from how the screen is used (pointer, size), not the user agent, which
 * can't tell an iPad from a Mac.
 */
export const PHONE_LAYOUT_QUERY = '(max-width: 40rem), (pointer: coarse) and (max-height: 30rem)';

let query: MediaQuery | undefined;

/**
 * Reactive `PHONE_LAYOUT_QUERY`: read `phoneLayout.current` in a component or effect. False where
 * there's no `matchMedia` (server rendering, tests).
 */
export const phoneLayout = {
	get current(): boolean {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
		return (query ??= new MediaQuery(PHONE_LAYOUT_QUERY)).current;
	}
};
