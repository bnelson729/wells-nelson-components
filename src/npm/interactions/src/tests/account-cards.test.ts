/**
 * The account cards every site's Profile is built from, which had no tests: signing in (Google or
 * an emailed link), the sync status in each of its states, and signing out with unsynced changes.
 * The sync layer is a fake; the cards only call it.
 */
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignInCard from '../lib/account/SignInCard.svelte';
import SignOutCard from '../lib/account/SignOutCard.svelte';
import SyncStatusCard from '../lib/account/SyncStatusCard.svelte';
import type { CloudStatus } from '../lib/account/types.js';
import { button, render, settle } from './setup.js';

const nouns = { singular: 'project', plural: 'projects' };

function fakeCloud(overrides: Partial<CloudStatus> = {}): CloudStatus {
	return {
		configured: true,
		user: null,
		email: '',
		online: true,
		active: false,
		sessionExpired: false,
		error: null,
		lastSync: null,
		hasAnyPending: false,
		pendingIds: [],
		hasPending: () => false,
		...overrides
	};
}

const signIn = () => ({ signInWithGoogle: vi.fn(async () => {}), signInWithEmail: vi.fn(async () => {}) });
const base = { returnUrl: () => 'https://example.com/profile', pitch: 'Sign in to sync.' };

function typeEmail(el: HTMLElement, value: string) {
	const input = el.querySelector<HTMLInputElement>('input[type="email"]')!;
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
	return input;
}

describe('SignInCard', () => {
	it('signs in with Google, coming back to the given address', async () => {
		const account = signIn();
		const el = render(SignInCard, { cloud: fakeCloud(), account, ...base });
		expect(el.textContent).toContain('Sign in to sync.');
		button(el, 'Continue with Google').click();
		await settle();
		expect(account.signInWithGoogle).toHaveBeenCalledWith('https://example.com/profile');
	});

	it('sends a sign-in link only to a valid address, then says where it went', async () => {
		const account = signIn();
		const el = render(SignInCard, { cloud: fakeCloud(), account, ...base });
		const send = button(el, 'Send link');
		typeEmail(el, 'not-an-email');
		expect(send.disabled).toBe(true);

		typeEmail(el, 'me@example.com');
		expect(send.disabled).toBe(false);
		send.click();
		await settle();
		expect(account.signInWithEmail).toHaveBeenCalledWith('me@example.com', 'https://example.com/profile');
		expect(el.querySelector('[role="status"]')!.textContent).toContain('We sent it to me@example.com');

		button(el, 'Use a different email').click();
		flushSync();
		expect(el.querySelector('input[type="email"]')).toBeTruthy();
	});

	// A phone keyboard's autocomplete often adds a trailing space; an email input drops it.
	it('sends the address without the spaces around it', async () => {
		const account = signIn();
		const el = render(SignInCard, { cloud: fakeCloud(), account, ...base });
		typeEmail(el, 'me@example.com ');
		button(el, 'Send link').click();
		await settle();
		expect(account.signInWithEmail).toHaveBeenCalledWith('me@example.com', expect.any(String));
	});

	it('shows why signing in failed, and lets you try again', async () => {
		const account = signIn();
		account.signInWithGoogle.mockRejectedValueOnce(new Error('Popup closed'));
		const el = render(SignInCard, { cloud: fakeCloud(), account, ...base });
		const google = button(el, 'Continue with Google');
		google.click();
		await settle();
		expect(el.querySelector('[role="alert"]')!.textContent).toContain('Popup closed');
		expect(google.disabled).toBe(false);
	});

	it("can't sign in offline, and says so", () => {
		const el = render(SignInCard, { cloud: fakeCloud({ online: false }), account: signIn(), ...base });
		expect(button(el, 'Continue with Google').disabled).toBe(true);
		expect(el.textContent).toContain("You're offline. Connect to sign in.");
	});

	it('explains an expired session, and can leave the email link out', () => {
		const el = render(SignInCard, {
			cloud: fakeCloud({ sessionExpired: true }),
			account: signIn(),
			...base,
			emailLink: false
		});
		expect(el.textContent).toContain('Your session expired. Sign in again to resume syncing.');
		expect(el.querySelector('input[type="email"]')).toBeNull();
	});
});

describe('SyncStatusCard', () => {
	const user = { email: 'me@example.com', user_metadata: { full_name: 'Me Example' } };
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('shows who is signed in and that everything is synced', () => {
		const el = render(SyncStatusCard, {
			cloud: fakeCloud({ user, email: user.email, lastSync: Date.UTC(2026, 10, 1) }),
			account: { forceResync: vi.fn() },
			nouns,
			pending: []
		});
		expect(el.textContent).toContain('Me Example');
		expect(el.textContent).toContain('me@example.com');
		expect(el.textContent).toContain('Online');
		expect(el.textContent).toContain('Everything is synced.');
		expect(el.textContent).not.toContain('Not yet');
	});

	it('lists what is waiting to sync, and the last error with what it means', () => {
		const el = render(SyncStatusCard, {
			cloud: fakeCloud({ user, error: 'Failed to fetch', active: true }),
			account: { forceResync: vi.fn() },
			nouns,
			pending: [{ id: 'p1', name: 'Launch' }]
		});
		expect(el.textContent).toContain('Online · syncing…');
		expect(el.textContent).toContain('Projects with changes waiting to sync');
		expect(el.querySelector('.pending')!.textContent).toContain('Launch');
		expect(el.querySelector('[role="alert"]')!.textContent).toBe('Last sync error: Failed to fetch');
		expect(el.textContent).toContain('Your changes are safe on this device.');
	});

	it('forces a re-sync online, and not offline', async () => {
		const forceResync = vi.fn(async () => {});
		const el = render(SyncStatusCard, { cloud: fakeCloud({ user }), account: { forceResync }, nouns, pending: [] });
		button(el, 'Force re-sync').click();
		await settle();
		expect(forceResync).toHaveBeenCalledOnce();
		expect(button(el, 'Syncing…').disabled).toBe(true);
		vi.advanceTimersByTime(700);
		flushSync();
		expect(button(el, 'Force re-sync').disabled).toBe(false);

		const offline = render(SyncStatusCard, {
			cloud: fakeCloud({ user, online: false }),
			account: { forceResync },
			nouns,
			pending: []
		});
		expect(offline.textContent).toContain('Offline');
		expect(button(offline, 'Force re-sync').disabled).toBe(true);
	});
});

describe('SignOutCard', () => {
	it('signs out at once when everything is synced', async () => {
		const signOut = vi.fn(async () => {});
		const el = render(SignOutCard, { cloud: fakeCloud(), account: { signOut }, nouns, pending: [] });
		button(el, 'Sign out').click();
		await settle();
		expect(signOut).toHaveBeenCalledOnce();
	});

	it('asks first when changes have not reached the cloud, naming them', async () => {
		const signOut = vi.fn(async () => {});
		const el = render(SignOutCard, {
			cloud: fakeCloud({ hasAnyPending: true }),
			account: { signOut },
			nouns,
			pending: [{ id: 'p1', name: 'Launch' }]
		});
		button(el, 'Sign out').click();
		flushSync();
		expect(signOut).not.toHaveBeenCalled();
		const dialog = document.querySelector('dialog[open]')!;
		expect(dialog.textContent).toContain('Sign out with unsynced changes?');
		expect(dialog.textContent).toContain('• Launch');
		button(dialog, 'Sign out anyway').click();
		await settle();
		expect(signOut).toHaveBeenCalledOnce();
	});

	it('shows why signing out failed', async () => {
		const signOut = vi.fn(async () => {
			throw new Error('Network down');
		});
		const el = render(SignOutCard, { cloud: fakeCloud(), account: { signOut }, nouns, pending: [] });
		button(el, 'Sign out').click();
		await settle();
		expect(el.querySelector('[role="alert"]')!.textContent).toContain('Network down');
	});
});
