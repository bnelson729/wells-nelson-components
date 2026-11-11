import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import ContainerEditModal from '../lib/account/ContainerEditModal.svelte';
import DeviceDataCard from '../lib/account/DeviceDataCard.svelte';
import LocalItemsPrompt from '../lib/account/LocalItemsPrompt.svelte';
import ShareModal from '../lib/account/ShareModal.svelte';
import type { CloudStatus, Member, MembersApi } from '../lib/account/types.js';
import { ReactiveApi } from './reactive-api.svelte.js';
import { button, render, settle } from './setup.js';

const nouns = { singular: 'project', plural: 'projects' };

function fakeCloud(overrides: Partial<CloudStatus> = {}): CloudStatus & { setRole: ReturnType<typeof vi.fn> } {
	return {
		configured: true,
		user: { email: 'me@x.com' },
		email: 'me@x.com',
		online: true,
		active: false,
		sessionExpired: false,
		error: null,
		lastSync: null,
		hasAnyPending: false,
		pendingIds: [],
		hasPending: () => false,
		setRole: vi.fn(),
		...overrides
	};
}

function fakeApi(members: Member[]): MembersApi & { [K in keyof MembersApi]-?: ReturnType<typeof vi.fn> } {
	return {
		fetchMembers: vi.fn(async () => members),
		inviteMember: vi.fn(async () => {}),
		removeMember: vi.fn(async () => {}),
		setMemberRole: vi.fn(async () => {})
	};
}

const base = { containerId: 't1', name: 'Launch', nouns, appName: 'Demo', signInHref: '/profile', onclose: () => {} };

describe('ShareModal', () => {
	it('without roles lists the others with Active / Pending and removes a member', async () => {
		const api = fakeApi([
			{ id: 'm1', email: 'me@x.com', active: true },
			{ id: 'm2', email: 'friend@x.com', active: false }
		]);
		render(ShareModal, { ...base, location: 'cloud', cloud: fakeCloud(), members: api, onmakecloud: vi.fn() });
		await settle();
		const dialog = document.querySelector('dialog')!;
		expect(api.fetchMembers).toHaveBeenCalledWith('t1');
		expect(dialog.textContent).not.toContain('me@x.com');
		expect(dialog.textContent).toContain('friend@x.com');
		expect(dialog.textContent).toContain('Pending');
		expect(dialog.querySelector('select')).toBeNull();

		dialog.querySelector<HTMLButtonElement>('button[aria-label="Stop sharing with friend@x.com"]')!.click();
		await settle();
		expect(api.removeMember).toHaveBeenCalledWith('m2');
	});

	it('with roles protects the last owner and records my role', async () => {
		const api = fakeApi([
			{ id: 'm1', email: 'me@x.com', active: true, role: 'owner' },
			{ id: 'm2', email: 'editor@x.com', active: true, role: 'editor' }
		]);
		const cloud = fakeCloud();
		render(ShareModal, { ...base, location: 'cloud', roles: true, role: 'owner', cloud, members: api, onmakecloud: vi.fn() });
		await settle();
		const selects = [...document.querySelectorAll('select')];
		expect(selects).toHaveLength(2);
		expect(selects[0].disabled).toBe(true); // me, the only owner
		expect(selects[1].disabled).toBe(false);
		expect(cloud.setRole).toHaveBeenCalledWith('t1', 'owner');
		expect(document.body.textContent).toContain("You're the only owner");
	});

	it('offers to make a local container cloud-enabled', async () => {
		const onmakecloud = vi.fn(async () => {});
		render(ShareModal, { ...base, location: 'local', cloud: fakeCloud(), members: fakeApi([]), onmakecloud });
		button(document, 'Make cloud-enabled').click();
		await settle();
		expect(onmakecloud).toHaveBeenCalledOnce();
	});

	it('asks to sign in first', () => {
		render(ShareModal, { ...base, location: 'local', cloud: fakeCloud({ user: null, email: '' }), members: fakeApi([]), onmakecloud: vi.fn() });
		expect(document.querySelector('a[href="/profile"]')).not.toBeNull();
	});
});

describe('ShareModal local-only', () => {
	it("explains why it can't be shared instead of offering to make it cloud-enabled", () => {
		render(ShareModal, {
			...base,
			location: 'local',
			cloud: fakeCloud(),
			members: fakeApi([]),
			onmakecloud: vi.fn(),
			localOnlyReason: 'The sample project stays on this device.'
		});
		const dialog = document.querySelector('dialog')!;
		expect(dialog.textContent).toContain('The sample project stays on this device.');
		expect(dialog.textContent).not.toContain('Make cloud-enabled');
	});
});

describe('fetch effects', () => {
	const members = [{ id: 'm1', email: 'me@x.com', active: true }];

	it('load members once even when the API touches reactive state', async () => {
		const share = new ReactiveApi(members);
		render(ShareModal, { ...base, location: 'cloud', cloud: fakeCloud(), members: share, onmakecloud: vi.fn() });
		const edit = new ReactiveApi(members);
		render(ContainerEditModal, {
			...base,
			location: 'cloud',
			cloud: fakeCloud(),
			members: edit,
			isDefault: false,
			ondefaultchange: vi.fn(),
			onrename: vi.fn(),
			onmakecloud: vi.fn(),
			onmakelocal: vi.fn(),
			ondelete: vi.fn(),
			onleave: vi.fn()
		});
		await settle();
		expect(share.calls).toEqual(['fetch t1']);
		expect(edit.calls).toEqual(['fetch t1']);
	});
});

describe('ContainerEditModal', () => {
	const handlers = () => ({
		isDefault: false,
		ondefaultchange: vi.fn(),
		onrename: vi.fn(),
		onmakecloud: vi.fn(async () => {}),
		onmakelocal: vi.fn(async () => {}),
		ondelete: vi.fn(async () => {}),
		onleave: vi.fn(async () => {})
	});

	it('offers delete for a local container', () => {
		render(ContainerEditModal, { ...base, ...handlers(), location: 'local', cloud: fakeCloud(), members: fakeApi([]) });
		expect(button(document, 'Delete project')).toBeTruthy();
	});

	it('leaves instead of deleting a shared container without roles', async () => {
		const h = handlers();
		const api = fakeApi([
			{ id: 'm1', email: 'me@x.com', active: true },
			{ id: 'm2', email: 'friend@x.com', active: true }
		]);
		render(ContainerEditModal, { ...base, ...h, location: 'cloud', cloud: fakeCloud(), members: api });
		await settle();
		expect(button(document, 'Leave project')).toBeTruthy();
	});

	it('lets the only owner delete a shared container with roles', async () => {
		const api = fakeApi([
			{ id: 'm1', email: 'me@x.com', active: true, role: 'owner' },
			{ id: 'm2', email: 'fan@x.com', active: true, role: 'viewer' }
		]);
		render(ContainerEditModal, { ...base, ...handlers(), roles: true, role: 'owner', location: 'cloud', cloud: fakeCloud(), members: api });
		await settle();
		expect(button(document, 'Delete project')).toBeTruthy();
	});

	it('replaces the cloud option with the reason a container stays local-only', () => {
		render(ContainerEditModal, {
			...base,
			...handlers(),
			location: 'local',
			cloud: fakeCloud(),
			members: fakeApi([]),
			localOnlyReason: 'The sample project stays on this device.'
		});
		const dialog = document.querySelector('dialog')!;
		expect(dialog.textContent).toContain('The sample project stays on this device.');
		expect(dialog.textContent).not.toContain('Cloud-enabled');
	});

	it('renames on save', () => {
		const h = handlers();
		render(ContainerEditModal, { ...base, ...h, location: 'local', cloud: fakeCloud(), members: fakeApi([]) });
		const input = document.querySelector<HTMLInputElement>('input[type=text], input:not([type])')!;
		input.value = 'Launch 2';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		document.querySelector('form')!.requestSubmit();
		flushSync();
		expect(h.onrename).toHaveBeenCalledWith('Launch 2');
	});
});

describe('LocalItemsPrompt', () => {
	it('makes the checked ones cloud-enabled and marks all as prompted', async () => {
		const onmakecloud = vi.fn(async () => {});
		const onprompted = vi.fn();
		render(LocalItemsPrompt, {
			items: [
				{ id: 'a', name: 'A' },
				{ id: 'b', name: 'B' }
			],
			nouns,
			onmakecloud,
			onprompted
		});
		document.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
		flushSync();
		button(document, 'Make selected cloud-enabled').click();
		await settle();
		expect(onmakecloud).toHaveBeenCalledExactlyOnceWith('a');
		expect(onprompted).toHaveBeenCalledWith(['a', 'b']);
	});
});

describe('ShareModal without member status', () => {
	it("shows neither Active nor Pending when the server doesn't say", async () => {
		const api = fakeApi([
			{ id: 'm1', email: 'me@x.com', active: true, role: 'viewer' },
			{ id: 'm2', email: 'owner@x.com', active: null, role: 'owner' }
		]);
		const cloud = fakeCloud();
		render(ShareModal, { ...base, location: 'cloud', cloud, members: api, roles: true, role: 'viewer', onmakecloud: vi.fn() });
		await settle();
		const dialog = document.querySelector('dialog')!;
		expect(dialog.textContent).toContain('owner@x.com');
		expect(dialog.textContent).not.toContain('Pending');
	});
});

describe('DeviceDataCard', () => {
	const items = [
		{ id: 'a', name: 'Website refresh', location: 'local' as const },
		{ id: 'b', name: 'B', location: 'cloud' as const }
	];

	it('shows whether data is kept, asks again, and exports everything', async () => {
		const onpersist = vi.fn(async () => true);
		const onexport = vi.fn(async () => ({ format: 'x' }));
		URL.createObjectURL = vi.fn(() => 'blob:x');
		URL.revokeObjectURL = vi.fn();
		const root = render(DeviceDataCard, { nouns, items, persisted: false, onpersist, onexport, onimport: vi.fn(), filename: 'demo' });
		expect(root.textContent).toContain('The browser may clear it');
		button(root, 'Keep data on this device').click();
		await settle();
		expect(onpersist).toHaveBeenCalled();

		button(root, 'Export all projects').click();
		await settle();
		expect(onexport).toHaveBeenCalledWith([
			{ id: 'a', location: 'local' },
			{ id: 'b', location: 'cloud' }
		]);
	});

	it('imports a file and says what was added, or why not', async () => {
		const onimport = vi.fn(async () => ['n1', 'n2']);
		const root = render(DeviceDataCard, { nouns, items, persisted: true, onexport: vi.fn(), onimport, filename: 'demo' });
		expect(root.textContent).toContain('Stored permanently');
		const input = root.querySelector<HTMLInputElement>('input[type=file]')!;
		const pick = (text: string) => {
			Object.defineProperty(input, 'files', { configurable: true, value: [new File([text], 'b.json')] });
			input.dispatchEvent(new Event('change', { bubbles: true }));
		};
		pick('{"format":"wells-nelson-containers"}');
		await vi.waitFor(() => expect(root.textContent).toContain('Added 2 projects'));
		expect(onimport).toHaveBeenCalledWith({ format: 'wells-nelson-containers' });

		pick('not json');
		await vi.waitFor(() => expect(root.textContent).toContain('not a backup'));
	});
});
