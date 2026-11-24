/**
 * Controls every site uses that had no tests: adding a row by name, searching, the segmented and
 * toggle controls, the Undo button, a collapsible section's actions, the Combobox from the
 * keyboard, and drag and drop between and within zones.
 */
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AddRow from '../lib/AddRow.svelte';
import CollapsibleSection from '../lib/CollapsibleSection.svelte';
import Combobox from '../lib/Combobox.svelte';
import { ChoiceProps } from './reactive-api.svelte.js';
import { DRAG_PRESS_MS, draggable, dropZone, type DragData } from '../lib/dnd.js';
import SearchBar from '../lib/SearchBar.svelte';
import Segmented from '../lib/Segmented.svelte';
import Toggle from '../lib/Toggle.svelte';
import UndoButton from '../lib/UndoButton.svelte';
import { UndoStack } from '../lib/undo.svelte.js';
import { button, render, settle } from './setup.js';

function type(input: HTMLInputElement, value: string) {
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function key(el: Element, k: string) {
	el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
	flushSync();
}

describe('AddRow', () => {
	it('adds the trimmed name, clears the field and keeps focus there for the next one', () => {
		const onadd = vi.fn();
		const el = render(AddRow, { placeholder: 'New list name', label: 'Create list', onadd });
		const input = el.querySelector('input')!;
		const submit = el.querySelector('button')!;
		// The field is named by what it shows, the button by what it does.
		expect(input.getAttribute('aria-label')).toBe('New list name');
		expect(submit.getAttribute('aria-label')).toBe('Create list');
		expect(submit.disabled).toBe(true);

		type(input, '  Groceries ');
		expect(submit.disabled).toBe(false);
		submit.click();
		flushSync();
		expect(onadd).toHaveBeenCalledWith('Groceries');
		expect(input.value).toBe('');
		expect(document.activeElement).toBe(input);
	});

	it('adds nothing for a blank name, even from Enter', () => {
		const onadd = vi.fn();
		const el = render(AddRow, { placeholder: 'New', label: 'Create', onadd });
		type(el.querySelector('input')!, '   ');
		el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
		expect(onadd).not.toHaveBeenCalled();
	});
});

describe('SearchBar', () => {
	it('names the field by its placeholder and clears it with one tap', () => {
		const el = render(SearchBar, { placeholder: 'Search items' });
		const input = el.querySelector('input')!;
		expect(input.type).toBe('search');
		expect(input.getAttribute('aria-label')).toBe('Search items');
		expect(el.querySelector('[aria-label="Clear search"]')).toBeNull();

		type(input, 'milk');
		const clear = el.querySelector<HTMLButtonElement>('[aria-label="Clear search"]')!;
		clear.click();
		flushSync();
		expect(input.value).toBe('');
		expect(el.querySelector('[aria-label="Clear search"]')).toBeNull();
	});
});

describe('Segmented', () => {
	it('is a named radio group that reports the chosen value', () => {
		const onchange = vi.fn();
		const el = render(Segmented, {
			label: 'Units',
			value: true,
			options: [
				{ value: true, label: 'Metric' },
				{ value: false, label: 'Imperial' }
			],
			onchange
		});
		expect(el.querySelector('legend')!.textContent).toBe('Units');
		const [metric, imperial] = el.querySelectorAll<HTMLInputElement>('input[type="radio"]');
		expect(metric.checked).toBe(true);
		imperial.click();
		flushSync();
		expect(onchange).toHaveBeenCalledWith(false);
		expect(imperial.closest('label')!.classList.contains('selected')).toBe(true);
	});

	it('can be disabled as a whole', () => {
		const el = render(Segmented, {
			label: 'Size',
			value: 's',
			disabled: true,
			options: [{ value: 's', label: 'Small' }]
		});
		expect(el.querySelector('fieldset')!.disabled).toBe(true);
	});
});

describe('Toggle', () => {
	it('is a labelled switch that reports its state', () => {
		const onchange = vi.fn();
		const el = render(Toggle, { label: 'Show all', onchange });
		const input = el.querySelector('input')!;
		expect(input.getAttribute('role')).toBe('switch');
		expect(input.closest('label')!.textContent).toContain('Show all');
		input.click();
		flushSync();
		expect(onchange).toHaveBeenCalledWith(true);
	});
});

describe('UndoButton', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('appears with what it would undo, undoes it, and goes away', async () => {
		const stack = new UndoStack();
		const el = render(UndoButton, { stack });
		expect(el.querySelector('button')).toBeNull();

		const undo = vi.fn();
		stack.push({ undo, label: 'Got Milk' });
		flushSync();
		const b = el.querySelector('button')!;
		expect(b.closest('[role="status"]')).toBeTruthy();
		expect(b.textContent?.replace(/\s+/g, ' ').trim()).toBe('Got Milk. Undo');

		b.click();
		await settle();
		expect(undo).toHaveBeenCalledOnce();
		expect(el.querySelector('button')).toBeNull();
	});

	it('stays up while the pointer is on it', () => {
		const stack = new UndoStack();
		const el = render(UndoButton, { stack });
		stack.push({ undo: vi.fn(), label: 'Got Milk' });
		flushSync();
		el.querySelector('button')!.dispatchEvent(new Event('pointerenter'));
		vi.advanceTimersByTime(20_000);
		flushSync();
		expect(el.querySelector('button')).toBeTruthy();
		el.querySelector('button')!.dispatchEvent(new Event('pointerleave'));
		vi.advanceTimersByTime(9_000);
		flushSync();
		expect(el.querySelector('button')).toBeNull();
	});
});

describe('CollapsibleSection actions', () => {
	it('collapses from the chevron or the name, and runs add and edit', () => {
		const ontogglecollapse = vi.fn();
		const onadd = vi.fn();
		const onedit = vi.fn();
		const el = render(CollapsibleSection, {
			title: 'Dairy',
			count: 2,
			collapsed: false,
			ontogglecollapse,
			onadd,
			addLabel: 'Add item to Dairy',
			onedit,
			editLabel: 'Edit Dairy',
			children: () => {}
		});
		el.querySelector<HTMLButtonElement>('.collapse')!.click();
		button(el, 'Dairy').click();
		expect(ontogglecollapse).toHaveBeenCalledTimes(2);
		el.querySelector<HTMLButtonElement>('[aria-label="Add item to Dairy"]')!.click();
		el.querySelector<HTMLButtonElement>('[aria-label="Edit Dairy"]')!.click();
		expect(onadd).toHaveBeenCalledOnce();
		expect(onedit).toHaveBeenCalledOnce();
		expect(el.textContent).toContain('2');
	});

	it('counts with the right plural, and names add and edit after the section by default', () => {
		const one = render(CollapsibleSection, {
			title: 'Dairy',
			count: 1,
			collapsed: false,
			onadd: () => {},
			onedit: () => {},
			children: () => {}
		});
		expect(one.querySelector('.badge')!.textContent).toContain('1 item');
		expect(one.querySelector('.badge')!.textContent).not.toContain('1 items');
		expect(one.querySelector('button[aria-label="Add to Dairy"]')).toBeTruthy();
		expect(one.querySelector('button[aria-label="Edit Dairy"]')).toBeTruthy();
		const three = render(CollapsibleSection, { title: 'Fridge', count: 3, collapsed: false, children: () => {} });
		expect(three.querySelector('.badge')!.textContent).toContain('3 items');
	});

	it('hides its rows while collapsed and says so', () => {
		const el = render(CollapsibleSection, { title: 'Dairy', count: 0, collapsed: true, children: () => {} });
		expect(el.querySelector('ul')!.hidden).toBe(true);
		expect(button(el, 'Dairy').getAttribute('aria-expanded')).toBe('false');
	});

	it('titles the section with a heading, and keeps the chevron out of the tab order', () => {
		const el = render(CollapsibleSection, { title: 'Dairy', count: 1, collapsed: false, children: () => {} });
		const heading = el.querySelector('h2')!;
		expect(heading.querySelector('button')!.textContent).toBe('Dairy');
		const chevron = el.querySelector('.collapse')!;
		expect(chevron.getAttribute('tabindex')).toBe('-1');
		expect(chevron.getAttribute('aria-hidden')).toBe('true');

		const nested = render(CollapsibleSection, {
			title: 'Fridge',
			count: 0,
			collapsed: false,
			headingLevel: 3,
			children: () => {}
		});
		expect(nested.querySelector('h3')!.textContent).toBe('Fridge');
	});
});

describe('Combobox from the keyboard', () => {
	const options = [
		{ id: 'c1', label: 'Dairy' },
		{ id: 'c2', label: 'Produce' }
	];

	function setup() {
		const el = render(Combobox, { label: 'Category', options });
		const input = el.querySelector('input')!;
		input.dispatchEvent(new FocusEvent('focus'));
		flushSync();
		return { el, input };
	}

	it('picks an option with the arrows and Enter', () => {
		const { el, input } = setup();
		key(input, 'ArrowDown');
		key(input, 'Enter');
		expect(input.value).toBe('Produce');
		expect(el.querySelector('[role="listbox"]')).toBeNull();
	});

	it('offers to create what was typed, and reuses an option typed in another case', () => {
		const { el, input } = setup();
		type(input, 'Bakery');
		const create = [...el.querySelectorAll('[role="option"]')].at(-1)!;
		expect(create.textContent).toBe('Create “Bakery”');

		type(input, '  dairy ');
		// An exact match (ignoring case and spaces) is the existing option, not a new one.
		expect([...el.querySelectorAll('[role="option"]')].map((o) => o.textContent)).toEqual(['Dairy']);
	});

	it('closes on Escape without picking', () => {
		const { el, input } = setup();
		expect(input.getAttribute('aria-expanded')).toBe('true');
		key(input, 'Escape');
		expect(input.getAttribute('aria-expanded')).toBe('false');
		expect(el.querySelector('[role="listbox"]')).toBeNull();
	});
});

describe('drag and drop', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// jsdom lays nothing out and doesn't scroll.
		document.elementsFromPoint = () => [];
		window.scrollBy = vi.fn();
		window.scrollTo = vi.fn();
	});
	afterEach(() => {
		vi.useRealTimers();
		document.body.innerHTML = '';
	});

	/** Point `document.elementsFromPoint` at `el` (jsdom lays nothing out). */
	function under(el: Element) {
		document.elementsFromPoint = () => [el];
	}
	function box(el: Element, top: number, height = 40) {
		el.getBoundingClientRect = () => ({ top, bottom: top + height, height, left: 0, width: 300 }) as DOMRect;
	}
	const pointer = (type: string, x: number, y: number) =>
		new PointerEvent(type, { bubbles: true, pointerId: 1, clientX: x, clientY: y, button: 0 });

	function setupZones() {
		const zone = document.createElement('ul');
		const other = document.createElement('div');
		const rows = ['a', 'b', 'c'].map((id, i) => {
			const li = document.createElement('li');
			li.dataset.dndItem = '';
			li.textContent = id;
			box(li, 200 + i * 40);
			zone.append(li);
			return li;
		});
		document.body.append(zone, other);
		box(zone, 200, 120);
		const ondrop = vi.fn();
		const onOther = vi.fn();
		const zoneAction = dropZone(zone, { accepts: (d: DragData) => d.type === 'row', ordered: true, ondrop });
		const otherAction = dropZone(other, { accepts: (d: DragData) => d.type === 'row', ondrop: onOther });
		const drag = draggable(rows[0], { data: { type: 'row', id: 'a' } });
		return {
			zone,
			other,
			rows,
			ondrop,
			onOther,
			destroy: () => [zoneAction, otherAction, drag].forEach((a) => a?.destroy?.())
		};
	}

	it('starts only after a still press, and reports where in an ordered zone it was dropped', () => {
		const { zone, rows, ondrop, destroy } = setupZones();
		rows[0].dispatchEvent(pointer('pointerdown', 10, 210));
		vi.advanceTimersByTime(DRAG_PRESS_MS + 10);
		under(zone);
		window.dispatchEvent(pointer('pointermove', 10, 315));
		window.dispatchEvent(pointer('pointerup', 10, 315));
		// Below every row (the dragged one doesn't count): the end of the zone.
		expect(ondrop).toHaveBeenCalledWith({ type: 'row', id: 'a' }, 2);
		destroy();
	});

	it('is cancelled by moving before the press is long enough (a scroll)', () => {
		const { zone, rows, ondrop, destroy } = setupZones();
		rows[0].dispatchEvent(pointer('pointerdown', 10, 210));
		window.dispatchEvent(pointer('pointermove', 10, 260));
		vi.advanceTimersByTime(DRAG_PRESS_MS + 10);
		under(zone);
		window.dispatchEvent(pointer('pointerup', 10, 260));
		expect(ondrop).not.toHaveBeenCalled();
		destroy();
	});

	it('drops on an unordered zone, and Escape cancels a drag', () => {
		const { other, rows, onOther, destroy } = setupZones();
		rows[0].dispatchEvent(pointer('pointerdown', 10, 210));
		vi.advanceTimersByTime(DRAG_PRESS_MS + 10);
		under(other);
		window.dispatchEvent(pointer('pointermove', 400, 210));
		expect(other.classList.contains('dnd-over')).toBe(true);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(onOther).not.toHaveBeenCalled();
		expect(other.classList.contains('dnd-over')).toBe(false);

		rows[0].dispatchEvent(pointer('pointerdown', 10, 210));
		vi.advanceTimersByTime(DRAG_PRESS_MS + 10);
		window.dispatchEvent(pointer('pointermove', 400, 210));
		window.dispatchEvent(pointer('pointerup', 400, 210));
		expect(onOther).toHaveBeenCalledWith({ type: 'row', id: 'a' }, 0);
		destroy();
	});
});

describe('Combobox choice set from outside', () => {
	it('shows a choice the app fills in, and leaves typed text alone', async () => {
		const props = new ChoiceProps('Section', [
			{ id: 'd1', label: 'Produce' },
			{ id: 'd2', label: 'Dairy and eggs' }
		]);
		const el = render(Combobox, props as unknown as Record<string, unknown>);
		const input = el.querySelector('input')!;
		expect(input.value).toBe('');

		props.choice = { id: 'd2' };
		flushSync();
		expect(input.value).toBe('Dairy and eggs');

		// Typing in another case keeps what was typed (it still means the same option).
		type(input, 'produce');
		flushSync();
		expect(input.value).toBe('produce');
	});
});
