import type { AccountActions, CloudStatus, Member, MembersApi, Role } from '@wells-nelson/interactions/account';
import { untrack } from 'svelte';
import { delay } from './mock';

/**
 * A stand-in for data-storage's CloudSync and members API with switches for every state the
 * account UI handles. Actions log what they were called with and resolve after a short delay.
 */
export class MockCloud implements CloudStatus, AccountActions, MembersApi {
	configured = $state(true);
	signedIn = $state(true);
	online = $state(true);
	active = $state(false);
	sessionExpired = $state(false);
	error = $state<string | null>(null);
	lastSync = $state<number | null>(Date.now() - 5 * 60_000);
	pendingIds = $state<string[]>([]);
	/** Make the next members call fail, to see error handling. */
	failNext = $state(false);
	log = $state<string[]>([]);
	members = $state<Member[]>([
		{ id: 'm1', email: 'me@example.com', active: true, role: 'owner' },
		{ id: 'm2', email: 'blake@example.com', active: true, role: 'editor' },
		{ id: 'm3', email: 'casey@example.com', active: false, role: 'viewer' }
	]);

	get user() {
		return this.signedIn
			? { email: 'me@example.com', user_metadata: { full_name: 'Avery Brooks', avatar_url: undefined } }
			: null;
	}
	get email() {
		return this.signedIn ? 'me@example.com' : '';
	}
	get hasAnyPending() {
		return this.pendingIds.length > 0;
	}
	hasPending(id: string) {
		return this.pendingIds.includes(id);
	}

	#record(entry: string) {
		// Called from components' effects; don't make them depend on the log.
		untrack(() => (this.log = [`${new Date().toLocaleTimeString()}  ${entry}`, ...this.log].slice(0, 30)));
	}
	async #call<T>(entry: string, fn: () => T): Promise<T> {
		this.#record(entry);
		await delay(null, 400);
		if (this.failNext) {
			this.failNext = false;
			throw new Error('Mock failure: the server said no.');
		}
		return fn();
	}

	// AccountActions
	signInWithGoogle(redirectTo: string) {
		return this.#call(`signInWithGoogle(${redirectTo})`, () => {
			this.signedIn = true;
			this.sessionExpired = false;
		});
	}
	signInWithEmail(email: string, redirectTo: string) {
		return this.#call(`signInWithEmail(${email}, ${redirectTo})`, () => {});
	}
	signOut() {
		return this.#call('signOut()', () => {
			this.signedIn = false;
			this.pendingIds = [];
		});
	}
	forceResync() {
		return this.#call('forceResync()', () => {
			this.pendingIds = [];
			this.lastSync = Date.now();
		});
	}
	setRole(containerId: string, role: Role) {
		this.#record(`setRole(${containerId}, ${role})`);
	}

	// MembersApi
	fetchMembers(containerId: string) {
		return this.#call(`fetchMembers(${containerId})`, () => this.members.map((m) => ({ ...m })));
	}
	inviteMember(containerId: string, email: string, role?: Role) {
		return this.#call(`inviteMember(${containerId}, ${email}, ${role})`, () => {
			if (this.members.some((m) => m.email === email.toLowerCase())) throw new Error('That email already has access.');
			this.members = [
				...this.members,
				{ id: crypto.randomUUID(), email: email.toLowerCase(), active: false, role: role ?? null }
			];
		});
	}
	removeMember(memberId: string) {
		return this.#call(`removeMember(${memberId})`, () => {
			this.members = this.members.filter((m) => m.id !== memberId);
		});
	}
	setMemberRole(memberId: string, role: Role) {
		return this.#call(`setMemberRole(${memberId}, ${role})`, () => {
			this.members = this.members.map((m) => (m.id === memberId ? { ...m, role } : m));
		});
	}

	/** For callbacks the modals take (make cloud, delete…). */
	action(name: string) {
		return () => this.#call(name, () => {});
	}
	note(entry: string) {
		this.#record(entry);
	}
}
