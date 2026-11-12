import { flushSync, mount, unmount } from 'svelte';
import { afterEach } from 'vitest';

// jsdom has <dialog> but not always the modal API the Modal component uses.
const proto = HTMLDialogElement.prototype as HTMLDialogElement & Record<string, unknown>;
if (!proto.showModal) {
	proto.showModal = function (this: HTMLDialogElement) {
		this.setAttribute('open', '');
	};
	proto.close = function (this: HTMLDialogElement) {
		if (!this.hasAttribute('open')) return;
		this.removeAttribute('open');
		this.dispatchEvent(new Event('close'));
	};
}

// jsdom has no ResizeObserver (Svelte's size bindings use it). This one reports when a test calls `resize`.
const observers = new Set<{ callback: ResizeObserverCallback; targets: Set<Element>; observer: ResizeObserver }>();
if (!('ResizeObserver' in globalThis)) {
	globalThis.ResizeObserver = class {
		#entry: { callback: ResizeObserverCallback; targets: Set<Element>; observer: ResizeObserver };
		constructor(callback: ResizeObserverCallback) {
			this.#entry = { callback, targets: new Set(), observer: this as unknown as ResizeObserver };
			observers.add(this.#entry);
		}
		observe(target: Element) {
			this.#entry.targets.add(target);
		}
		unobserve(target: Element) {
			this.#entry.targets.delete(target);
		}
		disconnect() {
			this.#entry.targets.clear();
		}
	} as unknown as typeof ResizeObserver;
}

/** Give an element a width (jsdom lays nothing out) and tell its observers. */
export function resize(el: Element, width: number) {
	Object.defineProperty(el, 'clientWidth', { configurable: true, value: width });
	for (const o of observers) {
		if (o.targets.has(el)) o.callback([{ target: el, contentRect: { width } } as unknown as ResizeObserverEntry], o.observer);
	}
	flushSync();
}

let mounted: ReturnType<typeof mount>[] = [];
afterEach(() => {
	for (const m of mounted) unmount(m);
	mounted = [];
	document.body.innerHTML = '';
});

export function render(component: any, props: Record<string, unknown>) {
	const target = document.createElement('div');
	document.body.append(target);
	mounted.push(mount(component, { target, props }));
	flushSync();
	return target;
}

/** Let pending promises (fake API calls) and the resulting effects run. */
export async function settle() {
	for (let i = 0; i < 5; i++) {
		await Promise.resolve();
		flushSync();
	}
}

export function button(root: ParentNode, text: string): HTMLButtonElement {
	const found = [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
	if (!found) throw new Error(`No button "${text}" in: ${[...root.querySelectorAll('button')].map((b) => b.textContent?.trim()).join(' | ')}`);
	return found;
}
