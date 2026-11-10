import { Persisted } from './persisted.svelte.js';
import type { Location } from './types.js';

const KEEP_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Tombstones for deleted rows. A deletion hides its rows from the UI immediately (before the
 * async delete finishes), and keeps hiding them if a sync briefly brings an older copy back.
 * Keys include the data set, because moving a container between local and cloud keeps its ids.
 * Entries are pruned after a week.
 */
export class Tombstones {
	#ids: Persisted<Record<string, number>>;

	/** @param prefix localStorage key prefix, e.g. 'demo' (stored as `demo:hidden`). */
	constructor(prefix: string) {
		this.#ids = new Persisted<Record<string, number>>(`${prefix}:hidden`, {});
		const cutoff = Date.now() - KEEP_MS;
		const kept = Object.fromEntries(Object.entries(this.#ids.value).filter(([, t]) => t > cutoff));
		if (Object.keys(kept).length !== Object.keys(this.#ids.value).length) this.#ids.value = kept;
	}

	has(location: Location, id: string) {
		return `${location}:${id}` in this.#ids.value;
	}

	hide(location: Location, ids: string[]) {
		if (ids.length === 0) return;
		const next = { ...this.#ids.value };
		const t = Date.now();
		for (const id of ids) next[`${location}:${id}`] = t;
		this.#ids.value = next;
	}

	/** Rows written again on purpose (e.g. a container moved back to this data set) become visible. */
	unhide(location: Location, ids: string[]) {
		const next = { ...this.#ids.value };
		let changed = false;
		for (const id of ids) {
			const key = `${location}:${id}`;
			if (key in next) {
				delete next[key];
				changed = true;
			}
		}
		if (changed) this.#ids.value = next;
	}
}
