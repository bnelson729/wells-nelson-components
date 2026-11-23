import { createRawSnippet, flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ActiveList from '../lib/ActiveList.svelte';
import AppVersion from '../lib/AppVersion.svelte';
import CollapsibleSection from '../lib/CollapsibleSection.svelte';
import Combobox from '../lib/Combobox.svelte';
import { reorder } from '../lib/dnd.js';
import { LONG_PRESS_MS, longpress } from '../lib/longpress.js';
import { UndoStack } from '../lib/undo.svelte.js';
import { preventZoom } from '../lib/zoom.js';
import { button, render, resize, settle } from './setup.js';

function pointer(type: string, init: { x?: number; y?: number; id?: number } = {}) {
	return new PointerEvent(type, {
		bubbles: true,
		clientX: init.x ?? 0,
		clientY: init.y ?? 0,
		pointerId: init.id ?? 1,
		button: 0
	});
}

describe('AppVersion', () => {
	it('shows the version and an Update button once a new version is out', () => {
		const onupdate = vi.fn();
		const el = render(AppVersion, { version: '1.4.2', updateAvailable: true, onupdate });
		expect(el.textContent).toContain('Version 1.4.2');
		expect(el.textContent).toContain('A new version is available.');
		button(el, 'Update now').click();
		expect(onupdate).toHaveBeenCalled();
	});

	it('checks on request and says when it is already the latest', async () => {
		const oncheck = vi.fn(async () => false);
		const el = render(AppVersion, { version: '1.4.2', oncheck });
		button(el, 'Check for updates').click();
		await settle();
		expect(oncheck).toHaveBeenCalled();
		expect(el.textContent).toContain('You have the latest version.');
	});

	it('offers the update when a check finds one', async () => {
		const el = render(AppVersion, { version: '1.4.2', oncheck: async () => true });
		button(el, 'Check for updates').click();
		await settle();
		expect(button(el, 'Update now')).toBeTruthy();
	});
});

describe('reorder', () => {
	it('moves an id to an index counted without it', () => {
		expect(reorder(['a', 'b', 'c', 'd'], 'a', 2)).toEqual(['b', 'c', 'a', 'd']);
		expect(reorder(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b']);
		expect(reorder(['a', 'b', 'c'], 'b', 99)).toEqual(['a', 'c', 'b']);
	});
});

describe('UndoStack', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('undoes in reverse order and hides when empty', async () => {
		const stack = new UndoStack();
		const done: number[] = [];
		stack.push({ undo: () => void done.push(1) });
		stack.push({ undo: () => void done.push(2) });
		expect(stack.visible).toBe(true);
		await stack.undo();
		expect(done).toEqual([2]);
		expect(stack.visible).toBe(true);
		await stack.undo();
		expect(done).toEqual([2, 1]);
		expect(stack.visible).toBe(false);
	});

	it('stays up while hovered or focused, and says what it would undo', () => {
		const stack = new UndoStack();
		stack.push({ undo: vi.fn(), label: 'Got Milk' });
		expect(stack.message).toBe('Got Milk');
		stack.pause();
		vi.advanceTimersByTime(20_000);
		expect(stack.visible).toBe(true);
		stack.resume();
		vi.advanceTimersByTime(8_001);
		expect(stack.visible).toBe(false);
		expect(stack.message).toBe('Got Milk');
	});

	it('announces what the button would undo', async () => {
		const { default: UndoButton } = await import('../lib/UndoButton.svelte');
		const stack = new UndoStack();
		const el = render(UndoButton, { stack });
		const region = el.querySelector('[role="status"]')!;
		expect(region.textContent?.trim()).toBe('');
		stack.push({ undo: vi.fn(), label: 'Got Milk' });
		flushSync();
		expect(region.textContent?.replace(/\s+/g, ' ').trim()).toBe('Got Milk. Undo');
	});

	it('hides the button after 8 seconds but keeps history for a minute', async () => {
		const stack = new UndoStack();
		const undo = vi.fn();
		stack.push({ undo });
		vi.advanceTimersByTime(7_900);
		expect(stack.visible).toBe(true);
		vi.advanceTimersByTime(101);
		expect(stack.visible).toBe(false);
		expect(stack.size).toBe(1);
		vi.advanceTimersByTime(52_000);
		expect(stack.size).toBe(0);
		await stack.undo();
		expect(undo).not.toHaveBeenCalled();
	});
});

describe('longpress', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('fires after a still hold and swallows the following click', () => {
		const node = document.createElement('button');
		document.body.append(node);
		const handler = vi.fn();
		const clicked = vi.fn();
		node.addEventListener('click', clicked);
		const action = longpress(node, handler)!;

		node.dispatchEvent(pointer('pointerdown'));
		vi.advanceTimersByTime(LONG_PRESS_MS + 1);
		expect(handler).toHaveBeenCalledOnce();
		node.click();
		expect(clicked).not.toHaveBeenCalled();
		node.click();
		expect(clicked).toHaveBeenCalledOnce();
		action.destroy?.();
	});

	it('is cancelled by moving the pointer', () => {
		const node = document.createElement('div');
		document.body.append(node);
		const handler = vi.fn();
		const action = longpress(node, handler)!;
		node.dispatchEvent(pointer('pointerdown'));
		window.dispatchEvent(pointer('pointermove', { x: 30 }));
		vi.advanceTimersByTime(LONG_PRESS_MS + 1);
		expect(handler).not.toHaveBeenCalled();
		action.destroy?.();
	});
});

describe('appearance', () => {
	const rows = createRawSnippet(() => ({ render: () => '<li>Row</li>' }));
	const section = (props: Record<string, unknown>) =>
		render(CollapsibleSection, {
			title: 'To do',
			count: 1,
			ontogglecollapse: () => {},
			children: rows,
			...props
		}).querySelector('section')!;

	it('renders CollapsibleSection as a card by default, marking it collapsed', () => {
		const open = section({ collapsed: false });
		expect([...open.classList]).toEqual(expect.arrayContaining(['card', 'default']));
		expect(open.classList.contains('collapsed')).toBe(false);
		expect(section({ collapsed: true }).classList.contains('collapsed')).toBe(true);
	});

	it('renders CollapsibleSection as lines on request', () => {
		const lines = section({ collapsed: false, appearance: 'lines' });
		expect(lines.classList.contains('lines')).toBe(true);
		expect(lines.classList.contains('card')).toBe(false);
	});

	it('renders ActiveList as lines on request', () => {
		const items = [
			{ id: '1', name: 'Ann', active: true },
			{ id: '2', name: 'Bo', active: false }
		];
		const props = {
			items,
			noun: 'Members',
			label: (i: { name: string }) => i.name,
			onopen: () => {},
			ontoggle: () => {}
		};
		const cards = [...render(ActiveList, props).querySelectorAll('section')];
		expect(cards.every((s) => s.classList.contains('card'))).toBe(true);
		const lines = [...render(ActiveList, { ...props, appearance: 'lines' }).querySelectorAll('section')];
		expect(lines).toHaveLength(2);
		expect(lines.every((s) => s.classList.contains('lines') && !s.classList.contains('card'))).toBe(true);
	});
});

describe('ActiveList', () => {
	const items = [
		{ id: '1', name: 'Ann', active: true },
		{ id: '2', name: 'Bo', active: false }
	];

	it('lists active rows and toggles the inactive section', () => {
		const ontoggle = vi.fn();
		const el = render(ActiveList, {
			items,
			noun: 'Members',
			label: (i: { name: string }) => i.name,
			onopen: () => {},
			ontoggle
		});
		expect(el.textContent).toContain('Active members');
		expect(el.textContent).toContain('Ann');
		expect(el.textContent).not.toContain('Bo');

		el.querySelector<HTMLButtonElement>('button.toggle')!.click();
		flushSync();
		expect(el.textContent).toContain('Bo');

		const box = el.querySelector<HTMLInputElement>('input[type=checkbox]')!;
		expect(box.getAttribute('aria-label')).toBe('Ann is active');
		box.click();
		flushSync();
		expect(ontoggle).toHaveBeenCalledWith(items[0], false);
	});

	const props = {
		items,
		noun: 'Members',
		label: (i: { name: string }) => i.name,
		onopen: () => {},
		ontoggle: () => {}
	};

	it('collapses the active section on request, starting expanded every time', () => {
		const el = render(ActiveList, { ...props, collapsibleActive: true });
		const toggle = button(el, 'Active members 1');
		expect(toggle.getAttribute('aria-expanded')).toBe('true');
		toggle.click();
		flushSync();
		expect(el.textContent).not.toContain('Ann');
		expect(render(ActiveList, { ...props, collapsibleActive: true }).textContent).toContain('Ann');
	});

	it('shows both sections side by side, expanded, once wide enough', () => {
		const el = render(ActiveList, { ...props, collapsibleActive: true, sideBySide: true });
		const list = el.querySelector('.active-list')!;
		resize(list, 500);
		expect(list.classList.contains('columns')).toBe(false);
		expect(el.textContent).not.toContain('Bo');

		resize(list, 800);
		expect(list.classList.contains('columns')).toBe(true);
		expect(el.textContent).toContain('Ann');
		expect(el.textContent).toContain('Bo');
		expect(el.querySelector('button.toggle')).toBeNull();
	});

	it('keeps an empty inactive column when side by side', () => {
		const el = render(ActiveList, { ...props, items: [items[0]], sideBySide: true });
		resize(el.querySelector('.active-list')!, 800);
		expect(el.querySelectorAll('section')).toHaveLength(2);
		expect(el.textContent).toContain('Inactive members');
	});
});

describe('preventZoom', () => {
	it('allows panning only, cancels Safari pinch gestures, and undoes both', () => {
		const undo = preventZoom();
		expect(document.documentElement.style.touchAction).toBe('pan-x pan-y');
		const pinch = new Event('gesturestart', { cancelable: true });
		document.dispatchEvent(pinch);
		expect(pinch.defaultPrevented).toBe(true);

		undo();
		expect(document.documentElement.style.touchAction).toBe('');
		const later = new Event('gesturestart', { cancelable: true });
		document.dispatchEvent(later);
		expect(later.defaultPrevented).toBe(false);
	});
});

describe('Combobox in a scrolling container', () => {
	afterEach(() => vi.restoreAllMocks());

	it('makes room below for the options when it is near the end, and gives it back on close', () => {
		const scroller = render(Combobox, { label: 'Department', options: [{ id: 'd1', label: 'Dairy' }] });
		scroller.style.overflowY = 'auto';
		// jsdom has no layout: the field ends at 300px and its open list would reach 500px.
		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
			const bottom = this.getAttribute('role') === 'listbox' ? 500 : 300;
			return { bottom, top: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} } as DOMRect;
		});

		const input = scroller.querySelector('input')!;
		input.dispatchEvent(new FocusEvent('focus'));
		flushSync();
		expect(scroller.querySelector<HTMLElement>('.reserve')?.style.height).toBe('208px');

		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		flushSync();
		expect(scroller.querySelector('.reserve')).toBeNull();
	});
});

describe('Combobox for assistive tech', () => {
	it('points the field at the highlighted option and marks only the chosen one selected', () => {
		const el = render(Combobox, {
			label: 'Department',
			options: [
				{ id: 'd1', label: 'Dairy' },
				{ id: 'd2', label: 'Bakery' }
			],
			choice: { id: 'd2' }
		});
		const input = el.querySelector('input')!;
		input.dispatchEvent(new FocusEvent('focus'));
		flushSync();
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
		flushSync();
		const options = [...el.querySelectorAll('[role="option"]')];
		expect(input.getAttribute('aria-activedescendant')).toBe(options[1].id);
		expect(options.map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'true']);
	});

	it('ties an error to the field and announces it', () => {
		const el = render(Combobox, { label: 'Department', options: [], error: 'Pick a department.' });
		const message = el.querySelector('[role="alert"]')!;
		expect(message.textContent).toBe('Pick a department.');
		expect(el.querySelector('input')!.getAttribute('aria-describedby')).toBe(message.id);
	});
});

describe('TextField', () => {
	it('ties the error to the input, announces it, and marks required fields', async () => {
		const { default: TextField } = await import('../lib/TextField.svelte');
		const el = render(TextField, { label: 'Name', required: true, error: 'Give it a name.' });
		const input = el.querySelector('input')!;
		const message = el.querySelector('[role="alert"]')!;
		expect(input.getAttribute('aria-describedby')).toBe(message.id);
		expect(input.getAttribute('aria-invalid')).toBe('true');
		expect(el.querySelector('label')!.textContent).toBe('Name (required)');
	});

	it('marks optional fields in the label, not in a placeholder', async () => {
		const { default: TextField } = await import('../lib/TextField.svelte');
		const el = render(TextField, { label: 'Phone number', optional: true });
		expect(el.querySelector('label')!.textContent).toBe('Phone number (optional)');
		expect(el.querySelector('input')!.placeholder).toBe('');
	});
});

describe('focusFirstInvalid', () => {
	it('focuses the first field marked invalid', async () => {
		const { focusFirstInvalid } = await import('../lib/forms.js');
		const form = document.createElement('form');
		form.innerHTML = '<input id="a"><input id="b" aria-invalid="true"><input id="c" aria-invalid="true">';
		document.body.append(form);
		await focusFirstInvalid(form);
		expect(document.activeElement?.id).toBe('b');
	});
});

describe('Checkbox', () => {
	it('can be disabled', async () => {
		const { default: Checkbox } = await import('../lib/Checkbox.svelte');
		const el = render(Checkbox, { label: 'Done', disabled: true });
		expect(el.querySelector('input')!.disabled).toBe(true);
	});
});

describe('SyncBanners', () => {
	it('shows each error until it is dismissed', async () => {
		const { default: SyncBanners } = await import('../lib/SyncBanners.svelte');
		const app = { writeError: 'Quota exceeded' as string | null };
		const cloud = { rejectedWrite: null as string | null };
		const el = render(SyncBanners, { app, cloud });
		expect(el.textContent).toContain("A change couldn't be saved on this device. This device is out of storage space.");
		expect(el.querySelector('details')!.textContent).toContain('Quota exceeded');
		expect(el.textContent).not.toContain('cloud');
		el.querySelector<HTMLButtonElement>('button[aria-label="Dismiss"]')!.click();
		flushSync();
		expect(app.writeError).toBeNull();
	});
});
