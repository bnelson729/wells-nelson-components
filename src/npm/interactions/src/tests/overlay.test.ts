import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';
import { Overlay } from '../lib/overlay.svelte.js';
import OverlayFixture from './OverlayFixture.svelte';
import { render } from './setup.js';

describe('Overlay', () => {
	it('keeps what it shows until the dialog has closed, then clears it', () => {
		const overlay = new Overlay<{ id: string; name: string }>();
		const seen: string[] = [];
		const el = render(OverlayFixture, { overlay, seen });
		const dialog = el.querySelector('dialog')!;
		expect(dialog.hasAttribute('open')).toBe(false);

		overlay.show({ id: 't1', name: 'Write the plan' });
		flushSync();
		expect(dialog.hasAttribute('open')).toBe(true);
		expect(dialog.textContent).toContain('Write the plan');

		overlay.hide();
		flushSync();
		expect(dialog.hasAttribute('open')).toBe(false);
		expect(overlay.value).toBeNull();
		expect(seen).toEqual(['Write the plan']);

		overlay.show({ id: 't2', name: 'Send it' });
		flushSync();
		expect(dialog.textContent).toContain('Send it');
	});

	it("doesn't clear a value that was shown again before the last close finished", () => {
		const overlay = new Overlay<string>();
		overlay.show('a');
		overlay.hide();
		overlay.show('b');
		overlay.closed();
		expect(overlay.value).toBe('b');
	});

	it('needs no value for a modal about nothing in particular', () => {
		const overlay = new Overlay();
		overlay.show();
		expect(overlay.isOpen).toBe(true);
		expect(overlay.value).toBe(true);
	});
});
