/**
 * An app declares the icons it registers, through the published types (dist), and gets them
 * type-checked like the base set's; an undeclared name is an error.
 */
import { registerIcons, type IconName } from '@wells-nelson/displays';

declare module '@wells-nelson/displays' {
	interface AppIcons {
		calendar: true;
	}
}

registerIcons({ calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/>' });

export const declared: IconName = 'calendar';
export const base: IconName = 'chevron-left';
// @ts-expect-error: not a base icon, and not declared
export const typo: IconName = 'calender';
