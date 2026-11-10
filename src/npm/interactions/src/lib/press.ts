/** Shared long-press detection used by the `longpress` and `draggable` actions. */

export interface PressOptions {
	/** How long the pointer has to stay down, in ms. */
	delay: number;
	/** How far (px) the pointer may move before the press is cancelled (e.g. the page scrolls). */
	tolerance: number;
	/** Called once the press has been held long enough, with the latest pointer position. */
	onpress: (point: { x: number; y: number }) => void;
}

/**
 * Watch the pointer that just went down. Moving further than `tolerance`, releasing or
 * cancelling the pointer ends the watch; holding still for `delay` calls `onpress`.
 * Returns a function that stops watching early.
 */
export function watchPress(down: PointerEvent, options: PressOptions): () => void {
	const id = down.pointerId;
	const start = { x: down.clientX, y: down.clientY };
	let last = { ...start };

	const onMove = (e: PointerEvent) => {
		if (e.pointerId !== id) return;
		last = { x: e.clientX, y: e.clientY };
		if (Math.hypot(last.x - start.x, last.y - start.y) > options.tolerance) stop();
	};
	const onEnd = (e: PointerEvent) => {
		if (e.pointerId === id) stop();
	};
	const timer = setTimeout(() => {
		stop();
		options.onpress(last);
	}, options.delay);

	function stop() {
		clearTimeout(timer);
		window.removeEventListener('pointermove', onMove);
		window.removeEventListener('pointerup', onEnd);
		window.removeEventListener('pointercancel', onEnd);
	}

	window.addEventListener('pointermove', onMove);
	window.addEventListener('pointerup', onEnd);
	window.addEventListener('pointercancel', onEnd);
	return stop;
}
