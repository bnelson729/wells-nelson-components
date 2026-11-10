/**
 * Long-press drag and drop that works for touch and mouse.
 *
 * - `draggable` starts a drag after holding still for DRAG_PRESS_MS (the shared long-press
 *   detection in press.ts); moving earlier cancels it, so normal scrolling still works.
 * - `dropZone` marks an element that accepts drops. Ordered zones report the insertion index
 *   among their `[data-dnd-item]` children (the dragged element excluded).
 */
import type { Action } from 'svelte/action';
import { watchPress } from './press.js';

export interface DragData {
	type: string;
	id: string;
	[key: string]: unknown;
}

export interface DraggableOptions {
	data: DragData;
	disabled?: boolean;
	onstart?: (data: DragData) => void;
	onend?: (data: DragData) => void;
}

export interface DropZoneOptions {
	accepts: (data: DragData) => boolean;
	ondrop: (data: DragData, index: number) => void;
	/** Show an insertion line and compute an index (reordering) instead of highlighting the zone. */
	ordered?: boolean;
}

export const DRAG_PRESS_MS = 300;
const MOVE_TOLERANCE = 8;
const EDGE = 72;

const zones = new Map<HTMLElement, DropZoneOptions>();

interface ActiveDrag {
	data: DragData;
	source: HTMLElement;
	ghost: HTMLElement;
	offsetX: number;
	offsetY: number;
	x: number;
	y: number;
	zone: HTMLElement | null;
	index: number;
	indicator: HTMLElement;
	scrollFrame: number;
	/** Page scroll when the drag began; restored after the drop. */
	startScrollY: number;
	options: DraggableOptions;
}

let active: ActiveDrag | null = null;

export function isDragging() {
	return active !== null;
}

function findZone(x: number, y: number, data: DragData): HTMLElement | null {
	for (const el of document.elementsFromPoint(x, y)) {
		let node: Element | null = el;
		while (node) {
			if (node instanceof HTMLElement) {
				const opts = zones.get(node);
				if (opts?.accepts(data)) return node;
			}
			node = node.parentElement;
		}
	}
	return null;
}

function zoneItems(zone: HTMLElement, source: HTMLElement) {
	return [...zone.querySelectorAll<HTMLElement>(':scope > [data-dnd-item]')].filter(
		(el) => el !== source && !el.contains(source)
	);
}

function updateTarget(drag: ActiveDrag) {
	const zone = findZone(drag.x, drag.y, drag.data);
	if (drag.zone && drag.zone !== zone) drag.zone.classList.remove('dnd-over');
	drag.zone = zone;
	drag.indicator.hidden = true;
	if (!zone) return;

	const opts = zones.get(zone)!;
	if (!opts.ordered) {
		zone.classList.add('dnd-over');
		drag.index = 0;
		return;
	}
	const items = zoneItems(zone, drag.source);
	let index = items.length;
	for (let i = 0; i < items.length; i++) {
		const r = items[i].getBoundingClientRect();
		if (drag.y < r.top + r.height / 2) {
			index = i;
			break;
		}
	}
	drag.index = index;
	const zr = zone.getBoundingClientRect();
	let lineY: number;
	if (items.length === 0) lineY = zr.top + 4;
	else if (index < items.length) lineY = items[index].getBoundingClientRect().top - 2;
	else lineY = items[items.length - 1].getBoundingClientRect().bottom + 2;
	Object.assign(drag.indicator.style, {
		top: `${lineY - 2}px`,
		left: `${zr.left}px`,
		width: `${zr.width}px`
	});
	drag.indicator.hidden = false;
}

function autoScroll() {
	if (!active) return;
	const { y } = active;
	let dy = 0;
	if (y < EDGE) dy = -Math.ceil((EDGE - y) / 6);
	else if (y > window.innerHeight - EDGE) dy = Math.ceil((y - (window.innerHeight - EDGE)) / 6);
	if (dy !== 0) {
		window.scrollBy(0, dy);
		updateTarget(active);
	}
	active.scrollFrame = requestAnimationFrame(autoScroll);
}

function onMove(e: PointerEvent) {
	if (!active) return;
	active.x = e.clientX;
	active.y = e.clientY;
	active.ghost.style.transform = `translate(${e.clientX - active.offsetX}px, ${e.clientY - active.offsetY}px)`;
	updateTarget(active);
}

function suppressNextClick() {
	const stop = (e: Event) => {
		e.stopPropagation();
		e.preventDefault();
	};
	window.addEventListener('click', stop, { capture: true, once: true });
	setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 50);
}

function finish(drop: boolean) {
	const drag = active;
	if (!drag) return;
	active = null;
	cancelAnimationFrame(drag.scrollFrame);
	window.removeEventListener('pointermove', onMove);
	window.removeEventListener('pointerup', onUp);
	window.removeEventListener('pointercancel', onCancel);
	window.removeEventListener('keydown', onKey);
	drag.ghost.remove();
	drag.indicator.remove();
	drag.zone?.classList.remove('dnd-over');
	drag.source.classList.remove('dnd-source');
	document.body.classList.remove('dnd-active');
	suppressNextClick();

	if (drop && drag.zone) {
		const opts = zones.get(drag.zone);
		opts?.ondrop(drag.data, drag.index);
	}
	drag.options.onend?.(drag.data);
	// Groups collapsed for the drag expand again on the next render; then return to where we were.
	const y = drag.startScrollY;
	requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: y })));
}

function onUp() {
	finish(true);
}
function onCancel() {
	finish(false);
}
function onKey(e: KeyboardEvent) {
	if (e.key === 'Escape') finish(false);
}

function begin(node: HTMLElement, options: DraggableOptions, x: number, y: number) {
	const rect = node.getBoundingClientRect();
	const ghost = node.cloneNode(true) as HTMLElement;
	ghost.classList.add('dnd-ghost');
	Object.assign(ghost.style, {
		position: 'fixed',
		top: '0',
		left: '0',
		width: `${rect.width}px`,
		transform: `translate(${rect.left}px, ${rect.top}px)`,
		pointerEvents: 'none',
		zIndex: '1000'
	});
	const indicator = document.createElement('div');
	indicator.className = 'dnd-indicator';
	indicator.hidden = true;
	document.body.append(ghost, indicator);

	node.classList.add('dnd-source');
	document.body.classList.add('dnd-active');
	navigator.vibrate?.(25);

	active = {
		data: options.data,
		source: node,
		ghost,
		offsetX: x - rect.left,
		offsetY: y - rect.top,
		x,
		y,
		zone: null,
		index: 0,
		indicator,
		scrollFrame: 0,
		startScrollY: window.scrollY,
		options
	};
	window.addEventListener('pointermove', onMove);
	window.addEventListener('pointerup', onUp);
	window.addEventListener('pointercancel', onCancel);
	window.addEventListener('keydown', onKey);
	options.onstart?.(options.data);
	// Layout may change in onstart (e.g. groups collapse); measure after it settles.
	requestAnimationFrame(() => active && updateTarget(active));
	active.scrollFrame = requestAnimationFrame(autoScroll);
}

export const draggable: Action<HTMLElement, DraggableOptions> = (node, initial) => {
	let options = initial;
	let stopWatching: (() => void) | null = null;

	const cancelPress = () => {
		stopWatching?.();
		stopWatching = null;
	};

	const onPointerDown = (e: PointerEvent) => {
		if (options.disabled || active || e.button !== 0) return;
		cancelPress();
		stopWatching = watchPress(e, {
			delay: DRAG_PRESS_MS,
			tolerance: MOVE_TOLERANCE,
			onpress: (point) => {
				stopWatching = null;
				begin(node, options, point.x, point.y);
			}
		});
	};

	// While dragging on touch screens, stop the page from scrolling instead of the drag.
	const onTouchMove = (e: TouchEvent) => {
		if (active?.source === node && e.cancelable) e.preventDefault();
	};
	const onContextMenu = (e: Event) => {
		if (stopWatching || active) e.preventDefault();
	};

	node.addEventListener('pointerdown', onPointerDown);
	node.addEventListener('touchmove', onTouchMove, { passive: false });
	node.addEventListener('contextmenu', onContextMenu);

	return {
		update(next) {
			options = next;
		},
		destroy() {
			cancelPress();
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('touchmove', onTouchMove);
			node.removeEventListener('contextmenu', onContextMenu);
			// An active drag keeps going: the ghost is a clone, and the drop handler doesn't need the node.
		}
	};
};

export const dropZone: Action<HTMLElement, DropZoneOptions> = (node, options) => {
	zones.set(node, options);
	return {
		update(next) {
			zones.set(node, next);
		},
		destroy() {
			zones.delete(node);
		}
	};
};

/** Move `id` to `index` within `ids` (index counted without `id`, as reported by ordered zones). */
export function reorder(ids: string[], id: string, index: number) {
	const rest = ids.filter((x) => x !== id);
	rest.splice(Math.max(0, Math.min(index, rest.length)), 0, id);
	return rest;
}
