/**
 * What a modal (or other overlay) is about, kept until it has finished closing. The default pattern
 * for a modal that edits one thing: the page keeps an `Overlay`, the modal stays mounted, and the
 * thing is cleared only once the dialog is gone, so nothing inside reads a value that's already
 * been cleared while it closes.
 *
 *   // page
 *   const editTask = new Overlay<Task>();
 *   <Button onclick={() => editTask.show(task)}>Edit</Button>
 *   <TaskModal overlay={editTask} />
 *
 *   // TaskModal
 *   <Modal bind:open={overlay.isOpen} onclosed={overlay.closed} title="Edit task">
 *     {#if overlay.value}{#key overlay.value.id}<TaskForm task={overlay.value} />{/key}{/if}
 *   </Modal>
 *
 * `{#key}` starts the form fresh for each thing. For a modal about nothing in particular ("New
 * task"), use `new Overlay()` and `show()`.
 */
export class Overlay<T = true> {
	/** What the overlay is about while it's open and closing; null once it has closed. */
	value = $state<T | null>(null);
	/** Whether it's open. Bind a `Modal`'s `open` to it. */
	isOpen = $state(false);

	/** Open it about `value` (nothing to pass for an `Overlay` without a type). */
	show = (...[value]: T extends true ? [value?: T] : [value: T]) => {
		this.value = (value ?? true) as T;
		this.isOpen = true;
	};

	/** Start closing it; `value` stays until `closed` runs. */
	hide = () => {
		this.isOpen = false;
	};

	/** Pass to `Modal`'s `onclosed`: clears `value` once the dialog is gone (unless it reopened). */
	closed = () => {
		if (!this.isOpen) this.value = null;
	};
}
