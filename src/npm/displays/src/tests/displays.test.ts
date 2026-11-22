import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import AppHeader from '../lib/AppHeader.svelte';
import Badge from '../lib/Badge.svelte';
import Button from '../lib/Button.svelte';
import Chip from '../lib/Chip.svelte';
import Icon from '../lib/Icon.svelte';
import IconButton from '../lib/IconButton.svelte';
import Modal from '../lib/Modal.svelte';
import Notice from '../lib/Notice.svelte';
import SortableTable from '../lib/SortableTable.svelte';
import TabBar from '../lib/TabBar.svelte';
import { iconMarkup, registerIcons } from '../lib/icons.js';
import { phoneLayout } from '../lib/layout.js';
import { sortRows, type SortableColumn } from '../lib/types.js';
import { text } from './snippet.js';

let cleanup: (() => void)[] = [];
afterEach(() => {
	for (const fn of cleanup) fn();
	cleanup = [];
	document.body.innerHTML = '';
});

function render<P extends Record<string, unknown>>(component: any, props: P) {
	const target = document.createElement('div');
	document.body.append(target);
	const instance = mount(component, { target, props });
	cleanup.push(() => unmount(instance));
	flushSync();
	return target;
}

describe('icons', () => {
	it('ships the base set', () => {
		for (const name of [
			'plus',
			'x',
			'check',
			'pencil',
			'trash',
			'share',
			'chevron',
			'alert',
			'cloud',
			'wifi-off',
			'user',
			'gear',
			'undo',
			'refresh',
			'mail',
			'search',
			'home',
			'download',
			'upload'
		]) {
			expect(iconMarkup(name), name).not.toBe('');
		}
	});

	it('renders registered icons', () => {
		registerIcons({ cart: '<path d="M1 1h2"/>' });
		const el = render(Icon, { name: 'cart', label: 'Cart' });
		const svg = el.querySelector('svg')!;
		expect(svg.innerHTML).toContain('M1 1h2');
		expect(svg.getAttribute('role')).toBe('img');
		expect(svg.getAttribute('aria-label')).toBe('Cart');
	});

	it('hides decorative icons from assistive tech', () => {
		const el = render(Icon, { name: 'plus' });
		expect(el.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
	});
});

describe('TabBar', () => {
	const items = [
		{ label: 'Home', icon: 'home', href: '/', active: true },
		{ label: 'List', icon: 'check' },
		{ label: 'Profile', icon: 'user', href: '/profile', dot: true, dotLabel: 'Unsynced changes' }
	];

	it('links each tab, marks the current one and disables tabs without a link', () => {
		const el = render(TabBar, { items });
		const links = [...el.querySelectorAll('a')];
		expect(links.map((a) => a.textContent?.trim())).toEqual(['Home', 'Profile (Unsynced changes)']);
		expect(links[0].getAttribute('aria-current')).toBe('page');
		expect(links[1].getAttribute('aria-current')).toBeNull();
		expect(el.querySelector('[aria-disabled="true"]')!.textContent).toContain('List');
	});

	it('reserves the bottom of the screen while mounted', () => {
		const target = document.createElement('div');
		document.body.append(target);
		const instance = mount(TabBar, { target, props: { items } });
		flushSync();
		expect(document.documentElement.style.getPropertyValue('--footer-offset')).toContain('--tabbar-h');
		// It replaces the header, so pages start at the top.
		expect(document.documentElement.style.getPropertyValue('--header-h')).toBe('0px');
		void unmount(instance);
		expect(document.documentElement.style.getPropertyValue('--footer-offset')).toBe('');
		expect(document.documentElement.style.getPropertyValue('--header-h')).toBe('');
	});
});

describe('phoneLayout', () => {
	it('is false where there is no matchMedia (tests, server rendering)', () => {
		expect(phoneLayout.current).toBe(false);
	});
});

describe('IconButton labels', () => {
	it('shows the label next to the icon on request, keeping the accessible name', () => {
		const plain = render(IconButton, { icon: 'home', label: 'Lists', href: '/' }).querySelector('a')!;
		expect(plain.textContent?.trim()).toBe('');
		expect(plain.getAttribute('title')).toBe('Lists');

		const labeled = render(IconButton, { icon: 'home', label: 'Lists', href: '/', showLabel: true }).querySelector(
			'a'
		)!;
		expect(labeled.textContent?.trim()).toBe('Lists');
		expect(labeled.classList.contains('labeled')).toBe(true);
		expect(labeled.getAttribute('aria-label')).toBe('Lists');
	});

	it("tells the header's nav which labels to show, and labels the profile on request", () => {
		const props = { brand: text('B'), brandHref: '/', brandLabel: 'Home', profileHref: '/profile' };
		const always = render(AppHeader, props);
		expect(always.querySelector('nav')!.classList.contains('labels-always')).toBe(true);
		expect(always.querySelector('.profile')!.textContent?.trim()).toBe('');

		const active = render(AppHeader, { ...props, labels: 'active', profileShowLabel: true });
		expect(active.querySelector('nav')!.classList.contains('labels-active')).toBe(true);
		expect(active.querySelector('.profile')!.textContent?.trim()).toBe('Profile');
	});
});

describe('sortRows', () => {
	type Row = { name: string; n: number | null };
	const rows: Row[] = [
		{ name: 'b', n: 2 },
		{ name: 'none', n: null },
		{ name: 'a', n: 2 },
		{ name: 'c', n: 5 }
	];

	it('sorts descending with ties by label and missing values last', () => {
		expect(
			sortRows(
				rows,
				(r) => r.n,
				(r) => r.name,
				true
			).map((r) => r.name)
		).toEqual(['c', 'a', 'b', 'none']);
	});

	it('keeps missing values last when ascending', () => {
		expect(
			sortRows(
				rows,
				(r) => r.n,
				(r) => r.name,
				false
			).map((r) => r.name)
		).toEqual(['a', 'b', 'c', 'none']);
	});
});

describe('SortableTable', () => {
	it('stays selectable on touch screens', () => {
		const columns: SortableColumn<{ id: string; n: number }>[] = [{ key: 'n', title: 'N', value: (r) => r.n }];
		const el = render(SortableTable, {
			title: 'T',
			rows: [{ id: 'a', n: 1 }],
			columns,
			rowKey: (r: { id: string }) => r.id,
			rowLabel: (r: { id: string }) => r.id,
			sortKey: 'n'
		});
		expect(el.querySelector('.selectable')).not.toBeNull();
	});

	type Row = { id: string; name: string; tasks: number; done: number | null };
	const columns: SortableColumn<Row>[] = [
		{ key: 'tasks', title: 'Tasks', full: 'Tasks assigned', value: (r) => r.tasks },
		{ key: 'done', title: 'Done %', value: (r) => r.done, display: (r) => (r.done == null ? '–' : `${r.done}%`) }
	];
	const rows: Row[] = [
		{ id: '1', name: 'Ann', tasks: 3, done: 50 },
		{ id: '2', name: 'Bo', tasks: 7, done: null },
		{ id: '3', name: 'Cy', tasks: 5, done: 80 }
	];
	const names = (el: HTMLElement) => [...el.querySelectorAll('tbody th')].map((th) => th.textContent);

	it('sorts by the first column, then by a tapped header, and flips on a second tap', () => {
		const el = render(SortableTable<Row>, {
			title: 'Members',
			rows,
			columns,
			rowKey: (r: Row) => r.id,
			rowLabel: (r: Row) => r.name
		});
		expect(names(el)).toEqual(['Bo', 'Cy', 'Ann']);

		const doneButton = el.querySelectorAll<HTMLButtonElement>('thead button')[1];
		doneButton.click();
		flushSync();
		expect(names(el)).toEqual(['Cy', 'Ann', 'Bo']);
		expect(el.querySelector('tbody tr:last-child td:last-child')!.textContent).toBe('–');

		doneButton.click();
		flushSync();
		expect(names(el)).toEqual(['Ann', 'Cy', 'Bo']);
		expect(doneButton.closest('th')!.getAttribute('aria-sort')).toBe('ascending');
	});

	it('shows the empty text without rows', () => {
		const el = render(SortableTable<Row>, {
			rows: [],
			columns,
			rowKey: (r: Row) => r.id,
			rowLabel: (r: Row) => r.name,
			emptyText: 'Nada'
		});
		expect(el.textContent).toContain('Nada');
		expect(el.querySelector('table')).toBeNull();
	});
});

describe('Badge', () => {
	it('applies the tone', () => {
		const el = render(Badge, { tone: 'warning', children: text('Pending') });
		const badge = el.querySelector('.badge')!;
		expect(badge.classList.contains('warning')).toBe(true);
		expect(badge.textContent).toBe('Pending');
	});
});

describe('Badge', () => {
	it('gives a count a fuller name for assistive tech', () => {
		const el = render(Badge, { tone: 'count', label: '3 items', children: text('3') });
		expect(el.querySelector('[aria-hidden="true"]')!.textContent).toBe('3');
		expect(el.querySelector('.visually-hidden')!.textContent).toBe('3 items');
	});
});

describe('Button', () => {
	it('renders a link when given href', () => {
		const el = render(Button, { href: '/apps', variant: 'primary', children: text('Open') });
		const a = el.querySelector('a.btn')!;
		expect(a.getAttribute('href')).toBe('/apps');
		expect(a.classList.contains('primary')).toBe(true);
	});

	it('is disabled and marked busy while busy', () => {
		const el = render(Button, { busy: true, children: text('Saving…') });
		const b = el.querySelector('button')!;
		expect(b.disabled).toBe(true);
		expect(b.getAttribute('aria-busy')).toBe('true');
	});

	it('has a quiet danger variant and a large size', () => {
		const el = render(Button, { variant: 'danger-ghost', size: 'lg', children: text('Delete') });
		expect([...el.querySelector('button')!.classList]).toEqual(expect.arrayContaining(['danger-ghost', 'lg']));
	});
});

describe('Chip', () => {
	it('is a toggle with pressed, an action without', () => {
		const on = render(Chip, { pressed: true, children: text('Sat') });
		expect(on.querySelector('button')!.getAttribute('aria-pressed')).toBe('true');
		const action = render(Chip, { children: text('Line 1') });
		expect(action.querySelector('button')!.hasAttribute('aria-pressed')).toBe(false);
	});
});

describe('Notice', () => {
	it('shows its text with a role and can be dismissed', () => {
		let dismissed = false;
		const el = render(Notice, {
			tone: 'danger',
			role: 'alert',
			ondismiss: () => (dismissed = true),
			children: text('Failed')
		});
		expect(el.querySelector('[role="alert"]')!.textContent).toContain('Failed');
		el.querySelector<HTMLButtonElement>('button[aria-label="Dismiss"]')!.click();
		expect(dismissed).toBe(true);
	});
});

describe('AppHeader', () => {
	it('names the unsynced dot on the profile link', () => {
		const el = render(AppHeader, {
			brand: text('US'),
			brandHref: '/',
			brandLabel: 'Home',
			profileHref: '/profile',
			unsynced: true
		});
		expect(el.querySelector('.profile')!.getAttribute('aria-label')).toBe('Profile (Unsynced changes)');
	});
});

describe('Modal', () => {
	// jsdom has <dialog> but not always its modal API.
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

	const press = (down: Element, up: Element) => {
		down.dispatchEvent(new Event('pointerdown', { bubbles: true }));
		up.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		flushSync();
	};

	it('offers a large size for dense content', () => {
		const el = render(Modal, { title: 'Pick players', size: 'lg', open: false, children: text('Body') });
		expect(el.querySelector('dialog')!.classList.contains('lg')).toBe(true);
	});

	it('closes on a press outside, but not on one that started inside', () => {
		const el = render(Modal, { title: 'Edit', open: true, children: text('Body') });
		const dialog = el.querySelector('dialog')!;
		press(dialog.querySelector('.body')!, dialog);
		expect(dialog.hasAttribute('open')).toBe(true);
		press(dialog, dialog);
		expect(dialog.hasAttribute('open')).toBe(false);
	});

	it('stops closing on a press outside once something was typed', () => {
		const el = render(Modal, { title: 'Edit', open: true, children: text('Body') });
		const dialog = el.querySelector('dialog')!;
		dialog.querySelector('.body')!.dispatchEvent(new Event('input', { bubbles: true }));
		press(dialog, dialog);
		expect(dialog.hasAttribute('open')).toBe(true);
	});

	it('can refuse a press outside altogether', () => {
		const el = render(Modal, { title: 'Edit', open: true, dismissible: false, children: text('Body') });
		const dialog = el.querySelector('dialog')!;
		press(dialog, dialog);
		expect(dialog.hasAttribute('open')).toBe(true);
	});
});
