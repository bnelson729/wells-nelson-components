/** Something that can be reversed. Capture whatever it needs in the closure. */
export interface UndoEntry {
	undo(): void | Promise<void>;
}

export interface UndoStackOptions {
	/** How long the Undo button stays visible after the latest push or undo (ms). */
	visibleMs?: number;
	/** History is dropped after this long without a push (ms). */
	idleMs?: number;
}

/**
 * Stackable undo for quick, reversible actions (e.g. ticking items off). Do the action, then
 * `push` how to reverse it. The Undo button shows for 5 seconds after the latest push or undo;
 * the history survives 1 minute without pushes, so a new push can bring older entries back.
 */
export class UndoStack {
	visible = $state(false);
	#stack: UndoEntry[] = [];
	#visibleMs: number;
	#idleMs: number;
	#hideTimer: ReturnType<typeof setTimeout> | undefined;
	#dropTimer: ReturnType<typeof setTimeout> | undefined;

	constructor({ visibleMs = 5_000, idleMs = 60_000 }: UndoStackOptions = {}) {
		this.#visibleMs = visibleMs;
		this.#idleMs = idleMs;
	}

	get size() {
		return this.#stack.length;
	}

	push(entry: UndoEntry) {
		this.#stack.push(entry);
		this.#show();
		clearTimeout(this.#dropTimer);
		this.#dropTimer = setTimeout(() => (this.#stack = []), this.#idleMs);
	}

	/** Reverse the latest entry. */
	async undo() {
		const entry = this.#stack.pop();
		if (!entry) {
			this.#hide();
			return;
		}
		if (this.#stack.length === 0) this.#hide();
		else this.#show();
		await entry.undo();
	}

	clear() {
		this.#stack = [];
		clearTimeout(this.#dropTimer);
		this.#hide();
	}

	#show() {
		this.visible = true;
		clearTimeout(this.#hideTimer);
		this.#hideTimer = setTimeout(() => (this.visible = false), this.#visibleMs);
	}

	#hide() {
		clearTimeout(this.#hideTimer);
		this.visible = false;
	}
}
