/** Something that can be reversed. Capture whatever it needs in the closure. */
export interface UndoEntry {
	undo(): void | Promise<void>;
	/** What was done, e.g. "Got Milk": shown beside Undo and read out by assistive tech. */
	label?: string;
}

export interface UndoStackOptions {
	/** How long the Undo button stays visible after the latest push or undo (ms). */
	visibleMs?: number;
	/** History is dropped after this long without a push (ms). */
	idleMs?: number;
}

/**
 * Stackable undo for quick, reversible actions (e.g. ticking items off). Do the action, then
 * `push` how to reverse it. The Undo button shows for 8 seconds after the latest push or undo,
 * and doesn't go away while it's hovered or focused (`pause` / `resume`); the history survives
 * 1 minute without pushes, so a new push can bring older entries back.
 */
export class UndoStack {
	visible = $state(false);
	/** The label of the entry Undo would reverse ('' when it has none). */
	message = $state('');
	#stack: UndoEntry[] = [];
	#visibleMs: number;
	#idleMs: number;
	#paused = false;
	#hideTimer: ReturnType<typeof setTimeout> | undefined;
	#dropTimer: ReturnType<typeof setTimeout> | undefined;

	constructor({ visibleMs = 8_000, idleMs = 60_000 }: UndoStackOptions = {}) {
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

	/** Keep the button up (while it's hovered or focused). */
	pause() {
		this.#paused = true;
		clearTimeout(this.#hideTimer);
	}

	/** Start the countdown again after `pause`. */
	resume() {
		this.#paused = false;
		if (this.visible) this.#startTimer();
	}

	#show() {
		this.visible = true;
		this.message = this.#stack.at(-1)?.label ?? '';
		if (!this.#paused) this.#startTimer();
	}

	#startTimer() {
		clearTimeout(this.#hideTimer);
		this.#hideTimer = setTimeout(() => (this.visible = false), this.#visibleMs);
	}

	#hide() {
		clearTimeout(this.#hideTimer);
		this.visible = false;
		this.message = '';
	}
}
