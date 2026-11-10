/** Reactive value mirrored to localStorage. Storage failures (private mode, quota) are ignored. */
export class Persisted<T> {
	#key: string;
	#value = $state() as T;

	constructor(key: string, initial: T) {
		this.#key = key;
		this.#value = Persisted.read(key, initial);
	}

	get value(): T {
		return this.#value;
	}

	set value(v: T) {
		this.#value = v;
		Persisted.write(this.#key, v);
	}

	/** Re-point at another key (e.g. when the signed-in user changes). */
	rekey(key: string, initial: T) {
		this.#key = key;
		this.#value = Persisted.read(key, initial);
	}

	static read<T>(key: string, fallback: T): T {
		try {
			const raw = localStorage.getItem(key);
			return raw === null ? fallback : (JSON.parse(raw) as T);
		} catch {
			return fallback;
		}
	}

	static write(key: string, value: unknown) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			/* ignore */
		}
	}

	static remove(key: string) {
		try {
			localStorage.removeItem(key);
		} catch {
			/* ignore */
		}
	}
}
