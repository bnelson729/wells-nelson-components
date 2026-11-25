import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppHeader from '../lib/AppHeader.svelte';
import Badge from '../lib/Badge.svelte';
import Button from '../lib/Button.svelte';
import Chip from '../lib/Chip.svelte';
import Icon from '../lib/Icon.svelte';
import IconButton from '../lib/IconButton.svelte';
import Modal from '../lib/Modal.svelte';
import Notice from '../lib/Notice.svelte';
import PageHeader from '../lib/PageHeader.svelte';
import SortableTable from '../lib/SortableTable.svelte';
import TabBar from '../lib/TabBar.svelte';
import { iconMarkup, registerIcons, type IconName } from '../lib/icons.js';
import { phoneLayout } from '../lib/layout.js';
import { sortRows, type SortableColumn } from '../lib/types.js';
import RowFixture from './RowFixture.svelte';
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
			expect(iconMarkup(name as IconName), name).not.toBe('');
		}
	});

	it('renders registered icons', () => {
		registerIcons({ cart: '<path d="M1 1h2"/>' });
		const el = render(Icon, { name: 'cart' as IconName, label: 'Cart' });
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
		{ label: 'Home', icon: 'home' as const, href: '/', current: true },
		{ label: 'List', icon: 'check' as const },
		{ label: 'Profile', icon: 'user' as const, href: '/profile', dot: true, dotLabel: 'Unsynced changes' }
	];

	it('links each tab, marks the current one and disables tabs without a link', () => {
		const el = render(TabBar, { items });
		const links = [...el.querySelectorAll('a')];
		expect(links.map((a) => a.textContent?.trim())).toEqual(['Home', 'Profile (unsynced changes)']);
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

		const current = render(AppHeader, { ...props, labels: 'current', profileShowLabel: true, profileCurrent: true });
		expect(current.querySelector('nav')!.classList.contains('labels-current')).toBe(true);
		expect(current.querySelector('.profile')!.textContent?.trim()).toBe('Profile');
		expect(current.querySelector('.profile')!.getAttribute('aria-current')).toBe('page');
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

	it('names the table after its title, for table navigation', () => {
		const el = render(SortableTable<Row>, {
			title: 'Members',
			rows,
			columns,
			rowKey: (r: Row) => r.id,
			rowLabel: (r: Row) => r.name
		});
		const heading = el.querySelector('h2')!;
		expect(heading.id).not.toBe('');
		expect(el.querySelector('table')!.getAttribute('aria-labelledby')).toBe(heading.id);
		expect(heading.textContent).toBe('Members');
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
		const el = render(Button, { href: '/apps', variant: 'solid', tone: 'accent', children: text('Open') });
		const a = el.querySelector('a.btn')!;
		expect(a.getAttribute('href')).toBe('/apps');
		expect([...a.classList]).toEqual(expect.arrayContaining(['solid', 'tone-accent']));
	});

	it('while busy: marked busy and unavailable, clicks ignored, and it keeps focus', () => {
		const onclick = vi.fn();
		const el = render(Button, { busy: true, onclick, children: text('Saving…') });
		const b = el.querySelector('button')!;
		b.focus();
		expect(b.disabled).toBe(false);
		expect(b.getAttribute('aria-disabled')).toBe('true');
		expect(b.getAttribute('aria-busy')).toBe('true');
		b.click();
		expect(onclick).not.toHaveBeenCalled();
		expect(document.activeElement).toBe(b);
	});

	it("a busy submit button doesn't submit its form again", () => {
		const onsubmit = vi.fn((e: SubmitEvent) => e.preventDefault());
		const form = document.createElement('form');
		form.addEventListener('submit', onsubmit);
		document.body.append(form);
		const instance = mount(Button, { target: form, props: { type: 'submit', busy: true, children: text('Save') } });
		flushSync();
		form.querySelector('button')!.click();
		expect(onsubmit).not.toHaveBeenCalled();
		void unmount(instance);
	});

	it('a disabled or busy link is not a link', () => {
		for (const props of [{ disabled: true }, { busy: true }]) {
			const el = render(Button, { href: '/apps', ...props, children: text('Open') });
			const a = el.querySelector('a.btn')!;
			expect(a.hasAttribute('href')).toBe(false);
			expect(a.getAttribute('aria-disabled')).toBe('true');
			expect(a.getAttribute('role')).toBe('link');
		}
	});

	it('has a quiet danger variant and a large size', () => {
		const el = render(Button, { variant: 'ghost', tone: 'danger', size: 'lg', children: text('Delete') });
		expect([...el.querySelector('button')!.classList]).toEqual(expect.arrayContaining(['ghost', 'tone-danger', 'lg']));
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
		expect(el.querySelector('.profile')!.getAttribute('aria-label')).toBe('Profile (unsynced changes)');
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

describe('PageHeader', () => {
	it('shows the title as the page heading, its actions, and a back link', () => {
		const el = render(PageHeader, {
			title: 'Projects',
			back: { href: '/home', label: 'Back to Home' },
			actions: text('New project')
		});
		expect(el.querySelector('h1.page-title')!.textContent).toBe('Projects');
		expect(el.querySelector('.actions')!.textContent).toBe('New project');
		const back = el.querySelector('a.back')!;
		expect(back.getAttribute('href')).toBe('/home');
		expect(back.textContent).toBe('Back to Home');
	});

	it('can head a section instead, with an id to label it by', () => {
		const el = render(PageHeader, { title: 'Members', level: 2, id: 'members' });
		expect(el.querySelector('h2#members')!.textContent).toBe('Members');
		expect(el.querySelector('h1')).toBeNull();
	});
});

describe('ListRow', () => {
	it('is a line whose icon buttons are small and muted unless they say otherwise', () => {
		const el = render(RowFixture, {});
		const row = el.querySelector('li.line')!;
		expect(row.getAttribute('data-testid')).toBe('row');
		const [edit, del] = [...row.querySelectorAll('button')];
		expect(edit.querySelector('svg')!.getAttribute('width')).toBe('18');
		expect(edit.classList.contains('tone-muted')).toBe(true);
		expect(del.querySelector('svg')!.getAttribute('width')).toBe('22');
		expect(del.classList.contains('tone-danger')).toBe(true);
	});
});

describe('Icon', () => {
	it('sits in a line of text when inline', () => {
		const svg = render(Icon, { name: 'pencil', inline: true }).querySelector('svg')!;
		expect(svg.classList.contains('inline')).toBe(true);
	});

	it('warns once in development about a name nobody registered', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(Icon, { name: 'no-such-icon' as IconName });
		render(Icon, { name: 'no-such-icon' as IconName });
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0][0]).toContain('no-such-icon');
		warn.mockRestore();
	});
});

describe('Modal onclosed', () => {
	it('fires once the dialog has closed, after onclose', () => {
		const calls: string[] = [];
		const el = render(Modal, {
			open: true,
			title: 'Edit task',
			children: text('Fields'),
			onclose: () => calls.push('onclose'),
			onclosed: () => calls.push('onclosed')
		});
		el.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
		flushSync();
		expect(calls).toEqual(['onclose', 'onclosed']);
		expect(el.querySelector('dialog')!.hasAttribute('open')).toBe(false);
	});
});
