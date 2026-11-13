import { Persisted } from './persisted.svelte.js';
import type { Nouns } from './types.js';

export interface DevicePrefsKeys {
	collapsed: string;
	prompted: string;
	defaultContainer: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Default localStorage keys, e.g. for prefix `demo` and noun project:
 * `demo:collapsed`, `demo:promptedLocalProjects`, `demo:defaultProject`.
 */
export function defaultPrefsKeys(prefix: string, nouns: Nouns): DevicePrefsKeys {
	return {
		collapsed: `${prefix}:collapsed`,
		prompted: `${prefix}:promptedLocal${cap(nouns.plural)}`,
		defaultContainer: `${prefix}:default${cap(nouns.singular)}`
	};
}

/**
 * The cold-start redirect to the default container. Call it from an effect on the page that lists
 * the containers; it returns the id to open, once, or null. It waits while the containers load
 * and, for a default that isn't there yet (it may be a cloud container), until the session is
 * restored; after that it gives up for this page load (`defaultChecked`). Pages other than the
 * list should set `prefs.defaultChecked = true` themselves, so deep links never redirect.
 */
export function defaultContainerToOpen(
	prefs: DevicePrefs,
	state: { ready: boolean; restored: boolean; exists: (id: string) => boolean }
): string | null {
	if (prefs.defaultChecked || !state.ready) return null;
	const id = prefs.defaultContainerId;
	if (id && state.exists(id)) {
		prefs.defaultChecked = true;
		return id;
	}
	if (!id || state.restored) prefs.defaultChecked = true;
	return null;
}

/**
 * Per-device preferences that never sync: the default container (cold-start redirect), which
 * local-only containers were already offered for cloud sync, and collapsed sections.
 * Subclass it for app-specific prefs; override `replaceContainer` to keep them in step when a
 * container changes id or is deleted.
 */
export class DevicePrefs {
	#collapsed: Persisted<Record<string, boolean>>;
	#prompted: Persisted<string[]>;
	#defaultContainer: Persisted<string | null>;
	/** Set once the cold-start redirect to the default container was considered for this page load. */
	defaultChecked = false;

	constructor(keys: DevicePrefsKeys) {
		this.#collapsed = new Persisted<Record<string, boolean>>(keys.collapsed, {});
		this.#prompted = new Persisted<string[]>(keys.prompted, []);
		this.#defaultContainer = new Persisted<string | null>(keys.defaultContainer, null);
	}

	/** The container a cold start of the app opens straight into. */
	get defaultContainerId() {
		return this.#defaultContainer.value;
	}

	setDefaultContainer(id: string | null) {
		this.#defaultContainer.value = id;
	}

	/** A container moved to a new id (`newId`) or was deleted (`null`). */
	replaceContainer(oldId: string, newId: string | null) {
		if (this.#defaultContainer.value === oldId) this.#defaultContainer.value = newId;
	}

	isCollapsed(key: string, fallback = false) {
		return this.#collapsed.value[key] ?? fallback;
	}

	setCollapsed(key: string, collapsed: boolean) {
		this.#collapsed.value = { ...this.#collapsed.value, [key]: collapsed };
	}

	/** Local-only containers already offered in the "make cloud-enabled?" prompt after sign-in. */
	wasPrompted(id: string) {
		return this.#prompted.value.includes(id);
	}

	markPrompted(ids: string[]) {
		this.#prompted.value = [...new Set([...this.#prompted.value, ...ids])];
	}
}
