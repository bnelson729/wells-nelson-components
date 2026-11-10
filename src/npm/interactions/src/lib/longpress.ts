import type { Action } from 'svelte/action';
import { watchPress } from './press.js';

export const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 10;

/**
 * Calls `handler` after holding a pointer still for LONG_PRESS_MS (touch or mouse).
 * The click that follows a long press is swallowed so the normal tap action doesn't also run.
 *
 * ```svelte
 * <button onclick={open} use:longpress={() => startEditing(row)}>…</button>
 * ```
 */
export const longpress: Action<HTMLElement, (() => void) | undefined> = (node, initial) => {
	let handler = initial;
	let stopWatching: (() => void) | null = null;
	let fired = false;

	const cancel = () => {
		stopWatching?.();
		stopWatching = null;
	};
	const onDown = (e: PointerEvent) => {
		if (!handler || e.button !== 0) return;
		fired = false;
		cancel();
		stopWatching = watchPress(e, {
			delay: LONG_PRESS_MS,
			tolerance: MOVE_TOLERANCE,
			onpress: () => {
				stopWatching = null;
				fired = true;
				navigator.vibrate?.(25);
				handler?.();
			}
		});
	};
	const onClick = (e: MouseEvent) => {
		if (fired) {
			fired = false;
			e.stopImmediatePropagation();
			e.preventDefault();
		}
	};
	const onContextMenu = (e: Event) => {
		if (handler) e.preventDefault();
	};

	node.addEventListener('pointerdown', onDown);
	node.addEventListener('pointerleave', cancel);
	node.addEventListener('click', onClick, { capture: true });
	node.addEventListener('contextmenu', onContextMenu);

	return {
		update(next) {
			handler = next;
		},
		destroy() {
			cancel();
			node.removeEventListener('pointerdown', onDown);
			node.removeEventListener('pointerleave', cancel);
			node.removeEventListener('click', onClick, { capture: true });
			node.removeEventListener('contextmenu', onContextMenu);
		}
	};
};
