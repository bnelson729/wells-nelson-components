import type { IconName } from './icons.js';

/** One destination of `TabBar`. */
export interface TabItem {
	label: string;
	icon: IconName;
	/** Where it goes; without one the tab shows disabled (e.g. nothing to open yet). */
	href?: string;
	/** The current section (highlighted, `aria-current="page"`). */
	active?: boolean;
	/** A round image instead of the icon, e.g. the signed-in user's avatar. */
	imageUrl?: string | null;
	/** A warning dot on the icon, e.g. unsynced changes; `dotLabel` says what it means. */
	dot?: boolean;
	dotLabel?: string;
}

/** A sortable column of `SortableTable`. */
export interface SortableColumn<T> {
	/** Unique key; also what `sortKey` refers to. */
	key: string;
	/** Short header text, e.g. "PP". */
	title: string;
	/** Full name for the header tooltip, e.g. "Points played". */
	full?: string;
	/** Value to sort by. Rows without a value (null/undefined) always sort last. */
	value: (row: T) => number | null | undefined;
	/** What the cell shows; defaults to `value`, blank when missing. */
	display?: (row: T) => string | number;
}

/** One "top N" card of `Leaderboards`. */
export interface Leaderboard<T> {
	title: string;
	rows: T[];
	value: (row: T) => string | number;
}

/**
 * Sort rows by a numeric value; rows without a value go last whichever the direction, and ties
 * fall back to the label so the order is stable.
 */
export function sortRows<T>(
	rows: readonly T[],
	value: (row: T) => number | null | undefined,
	label: (row: T) => string,
	descending: boolean
): T[] {
	return [...rows].sort((a, b) => {
		const av = value(a);
		const bv = value(b);
		if (av == null || bv == null) {
			const diff = (av == null ? 1 : 0) - (bv == null ? 1 : 0);
			return diff || label(a).localeCompare(label(b));
		}
		return (descending ? bv - av : av - bv) || label(a).localeCompare(label(b));
	});
}
