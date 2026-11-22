/**
 * States and variants of display components that sites build their flows on, which had no tests:
 * confirmations (delete, reset, sign out), on/off and current-page icon buttons, the start-up
 * screens, and every Button variant.
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import Button from '../lib/Button.svelte';
import ConfirmDialog from '../lib/ConfirmDialog.svelte';
import FatalError from '../lib/FatalError.svelte';
import IconButton from '../lib/IconButton.svelte';
import Splash from '../lib/Splash.svelte';
import { text } from './snippet.js';

let cleanup: (() => void)[] = [];
afterEach(() => {
	for (const fn of cleanup) fn();
	cleanup = [];
	document.body.innerHTML = '';
});

function render(component: any, props: Record<string, unknown>) {
	const target = document.createElement('div');
	document.body.append(target);
	const instance = mount(component, { target, props });
	cleanup.push(() => unmount(instance));
	flushSync();
	return target;
}

const buttons = (root: ParentNode) => [...root.querySelectorAll('button')];
const byText = (root: ParentNode, label: string) => buttons(root).find((b) => b.textContent?.trim() === label)!;

/** Let the confirm handler's promise settle and Svelte update. */
async function settle() {
	for (let i = 0; i < 5; i++) {
		await Promise.resolve();
		flushSync();
	}
}

beforeAll(() => {
	// jsdom has <dialog> but not always its modal API.
	const proto = HTMLDialogElement.prototype;
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
});

describe('ConfirmDialog', () => {
	it('opens with focus on Cancel, so a stray Enter does nothing harmful', async () => {
		const el = render(ConfirmDialog, {
			open: true,
			title: 'Delete it?',
			message: 'Gone for good.',
			onconfirm: vi.fn()
		});
		await settle();
		expect(el.querySelector('dialog')!.textContent).toContain('Gone for good.');
		expect(document.activeElement?.textContent?.trim()).toBe('Cancel');
	});

	it('Cancel closes without confirming', () => {
		const onconfirm = vi.fn();
		const el = render(ConfirmDialog, { open: true, title: 'Delete it?', message: 'x', onconfirm });
		byText(el, 'Cancel').click();
		flushSync();
		expect(el.querySelector('dialog')!.hasAttribute('open')).toBe(false);
		expect(onconfirm).not.toHaveBeenCalled();
	});

	it('shows the busy label and blocks a second press while confirming, then closes', async () => {
		let finish!: () => void;
		const onconfirm = vi.fn(() => new Promise<void>((r) => (finish = r)));
		const el = render(ConfirmDialog, {
			open: true,
			title: 'Delete it?',
			message: 'x',
			confirmLabel: 'Delete',
			busyLabel: 'Deleting…',
			danger: true,
			onconfirm
		});
		const confirm = byText(el, 'Delete');
		expect(confirm.classList.contains('danger')).toBe(true);
		confirm.click();
		flushSync();
		expect(confirm.textContent?.trim()).toBe('Deleting…');
		expect(confirm.disabled).toBe(true);
		expect(confirm.getAttribute('aria-busy')).toBe('true');
		confirm.click();
		expect(onconfirm).toHaveBeenCalledOnce();

		finish();
		await settle();
		expect(el.querySelector('dialog')!.hasAttribute('open')).toBe(false);
	});

	it('says why confirming failed, and stays open to try again', async () => {
		const onconfirm = vi.fn(async (): Promise<void> => {
			throw new Error('You are offline.');
		});
		const el = render(ConfirmDialog, {
			open: true,
			title: 'Delete it?',
			message: 'x',
			confirmLabel: 'Delete',
			onconfirm
		});
		const confirm = byText(el, 'Delete');
		confirm.click();
		await settle();
		expect(el.querySelector('dialog')!.hasAttribute('open')).toBe(true);
		expect(el.querySelector('[role="alert"]')!.textContent).toBe('You are offline.');
		expect(confirm.disabled).toBe(false);

		// Trying again clears the old error first.
		onconfirm.mockResolvedValueOnce(undefined);
		confirm.click();
		await settle();
		expect(el.querySelector('[role="alert"]')).toBeNull();
		expect(el.querySelector('dialog')!.hasAttribute('open')).toBe(false);
	});

	it('takes richer content than a message', () => {
		const el = render(ConfirmDialog, {
			open: true,
			title: 'Sign out?',
			children: text('Two lists have changes.'),
			onconfirm: vi.fn()
		});
		expect(el.querySelector('dialog')!.textContent).toContain('Two lists have changes.');
	});
});

describe('IconButton', () => {
	it('marks the current page on a link, and an on/off state on a button', () => {
		const link = render(IconButton, { icon: 'home', label: 'Home', href: '/', active: true });
		expect(link.querySelector('a')!.getAttribute('aria-current')).toBe('page');

		const toggle = render(IconButton, { icon: 'search', label: 'Search', pressed: true });
		const b = toggle.querySelector('button')!;
		expect(b.getAttribute('aria-pressed')).toBe('true');
		expect(b.getAttribute('aria-label')).toBe('Search');
		expect(b.classList.contains('active')).toBe(true);
	});

	it('is an ordinary button without pressed, and can be disabled', () => {
		const onclick = vi.fn();
		const el = render(IconButton, { icon: 'pencil', label: 'Edit Milk', onclick, disabled: true });
		const b = el.querySelector('button')!;
		expect(b.hasAttribute('aria-pressed')).toBe(false);
		b.click();
		expect(onclick).not.toHaveBeenCalled();
	});
});

describe('start-up screens', () => {
	it('Splash shows the mark and tells assistive tech it is loading', () => {
		const el = render(Splash, { text: 'AB' });
		const status = el.querySelector('[role="status"]')!;
		expect(status.querySelector('[aria-hidden="true"]')!.textContent).toBe('AB');
		expect(status.textContent).toContain('Loading');
	});

	it('FatalError says what failed and offers to try again', () => {
		const reload = vi.fn();
		vi.stubGlobal('location', { ...window.location, reload });
		const el = render(FatalError, { error: 'QuotaExceededError' });
		expect(el.querySelector('h1')!.textContent).toBe('Something went wrong');
		expect(el.textContent).toContain("The local database couldn't be opened: QuotaExceededError");
		byText(el, 'Try again').click();
		expect(reload).toHaveBeenCalled();
		vi.unstubAllGlobals();
	});

	it('FatalError can leave the retry out', () => {
		const el = render(FatalError, { error: 'x', retryLabel: '' });
		expect(buttons(el)).toEqual([]);
	});
});

describe('Button variants', () => {
	it.each(['primary', 'secondary', 'danger', 'danger-ghost'] as const)('renders the %s variant', (variant) => {
		const el = render(Button, { variant, children: text('Go') });
		expect(el.querySelector('button')!.classList.contains(variant)).toBe(true);
	});

	it('submits its form only when it is a submit button', () => {
		const el = render(Button, { type: 'submit', children: text('Save') });
		expect(el.querySelector('button')!.type).toBe('submit');
		const plain = render(Button, { children: text('Cancel') });
		expect(plain.querySelector('button')!.type).toBe('button');
	});
});
