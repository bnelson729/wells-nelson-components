import { getContext, setContext } from 'svelte';

/** `sm` 18px (rows of content), `md` 20px (section headers), `lg` 22px (app header, navigation rows). */
export type IconButtonSize = 'sm' | 'md' | 'lg';
/** `neutral` takes the color around it; `muted` steps back (actions on rows); `accent`, `danger`. */
export type IconButtonTone = 'neutral' | 'muted' | 'accent' | 'danger';

export const ICON_BUTTON_PX: Record<IconButtonSize, number> = { sm: 18, md: 20, lg: 22 };

export interface IconButtonDefaults {
	size?: IconButtonSize;
	tone?: IconButtonTone;
}

const KEY = Symbol('wells-nelson/icon-button-defaults');

/**
 * Defaults for every `IconButton` inside the calling component, so a kind of row or header sizes its
 * actions once instead of at every call site. `ListRow` sets `{ size: 'sm', tone: 'muted' }`.
 */
export function setIconButtonDefaults(defaults: IconButtonDefaults) {
	setContext(KEY, defaults);
}

export function getIconButtonDefaults(): IconButtonDefaults {
	return getContext<IconButtonDefaults | undefined>(KEY) ?? {};
}
