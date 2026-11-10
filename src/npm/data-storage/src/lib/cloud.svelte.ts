import type { User } from '@supabase/supabase-js';
import { replicateSupabase, type RxSupabaseReplicationState } from 'rxdb/plugins/replication-supabase';
import type { Subscription } from 'rxjs';
import { tick } from 'svelte';
import type { AppState } from './app.svelte.js';
import { openDatabase, type Database, type StorageFactory } from './database.js';
import { createDataSet, disposeDataSet } from './dataset.js';
import { Persisted } from './persisted.svelte.js';
import { replicationClient, schemaNotExposed, type SupabaseApi } from './supabase.js';
import { containerIdOf, type DocMap, type Role, type StoreSchema } from './types.js';

interface UserSyncState {
	/** containerId -> write version of its newest unsynced change */
	pending: Record<string, number>;
	/** Containers removed from this device whose local deletes must never be pushed. */
	blocked: string[];
	/** Cloud containers this user was unshared from; they choose to keep a local copy or remove them. */
	revoked: string[];
	/** containerId -> this user's role, cached so permissions work offline (roles only). */
	roles: Record<string, Role>;
	lastSync: number | null;
}

const emptyState = (): UserSyncState => ({ pending: {}, blocked: [], revoked: [], roles: {}, lastSync: null });
const MEMBERSHIP_CHECK_INTERVAL = 30_000;

/** Push errors caused by the server refusing the write (RLS, triggers), not by connectivity. */
export function isRejection(err: unknown): boolean {
	const e = err as { parameters?: { direction?: string; errors?: { code?: string }[] } };
	if (e?.parameters?.direction !== 'push') return false;
	const code = e.parameters.errors?.[0]?.code;
	// 42501: RLS violation; P0001: raised by a trigger (e.g. last owner); 23xxx: constraint violations.
	return !!code && (code === '42501' || code === 'P0001' || code.startsWith('23'));
}

/**
 * A replication or API error as one line for the UI. With `schema`, a schema the Supabase API
 * doesn't expose is reported as the setting to change.
 */
export function errorMessage(err: unknown, schema?: string): string {
	if (err && typeof err === 'object') {
		const e = err as { message?: string; code?: string; parameters?: { errors?: { message?: string; code?: string }[] } };
		const inner = e.parameters?.errors?.[0];
		const unexposed = schema ? (schemaNotExposed(inner, schema) ?? schemaNotExposed(e, schema)) : null;
		return unexposed ?? inner?.message ?? e.message ?? String(err);
	}
	return String(err);
}

export interface CloudSyncOptions<D extends DocMap> {
	/** Prefix for database names and localStorage keys, e.g. 'demo'. */
	appKey: string;
	schema: StoreSchema<D>;
	app: AppState<D>;
	supabase: SupabaseApi;
	/** Containers have viewer / editor / owner roles. Without roles everyone is an owner. */
	roles?: boolean;
	storage?: StorageFactory;
}

/**
 * Supabase session, the per-user cloud database and its live replication, and sync status:
 * pending changes per container (cleared once replication settles), last sync time, blocked
 * containers, membership / revocation checks, cached roles and rejected writes.
 */
export class CloudSync<D extends DocMap> {
	readonly configured: boolean;
	user = $state.raw<User | null>(null);
	/** Supabase dropped the session on its own (e.g. refresh token revoked); data is kept until sign-in. */
	sessionExpired = $state(false);
	online = $state(typeof navigator === 'undefined' ? true : navigator.onLine);
	active = $state(false);
	error = $state<string | null>(null);
	/**
	 * A write the server rejected (e.g. a permission or last-owner rule). Unlike transient
	 * network errors this needs the user's attention; show it until dismissed.
	 */
	rejectedWrite = $state<string | null>(null);

	#appKey: string;
	#schema: StoreSchema<D>;
	#app: AppState<D>;
	#sb: SupabaseApi;
	#roles: boolean;
	#storage: StorageFactory | undefined;
	#state: Persisted<UserSyncState>;
	#replications: RxSupabaseReplicationState<any>[] = [];
	#subscriptions: Subscription[] = [];
	#activeReps = new Set<number>();
	#writeVersion = 0;
	#settling = false;
	#resettle = false;
	#settleTimer: ReturnType<typeof setTimeout> | undefined;
	#lastMembershipCheck = 0;
	#signingOut = false;
	#queue: Promise<unknown> = Promise.resolve();

	constructor(options: CloudSyncOptions<D>) {
		this.#appKey = options.appKey;
		this.#schema = options.schema;
		this.#app = options.app;
		this.#sb = options.supabase;
		this.#roles = options.roles ?? false;
		this.#storage = options.storage;
		this.configured = options.supabase.configured;
		this.#state = new Persisted<UserSyncState>(this.#stateKey('anonymous'), emptyState());
	}

	#stateKey(userId: string) {
		return `${this.#appKey}:sync:${userId}`;
	}

	get email() {
		return this.user?.email?.toLowerCase() ?? '';
	}
	get lastSync() {
		return this.#state.value.lastSync;
	}
	/** Containers with local changes that haven't reached Supabase yet. */
	get pendingIds() {
		return Object.keys(this.#state.value.pending);
	}
	get hasAnyPending() {
		return this.pendingIds.length > 0;
	}
	hasPending(containerId: string) {
		return containerId in this.#state.value.pending;
	}
	isRevoked(containerId: string) {
		return this.#state.value.revoked.includes(containerId);
	}
	get revokedIds() {
		return this.#state.value.revoked;
	}
	/**
	 * This user's role on a cloud container. A container created here that hasn't synced yet is
	 * ours. Without roles everyone is an owner.
	 */
	roleOf(containerId: string): Role {
		if (!this.#roles) return 'owner';
		const role = this.#state.value.roles[containerId];
		if (role) return role;
		return this.hasPending(containerId) ? 'owner' : 'viewer';
	}
	/** Record our role right away (e.g. after creating a container or changing roles). */
	setRole(containerId: string, role: Role) {
		if (this.#roles) this.#update((s) => (s.roles[containerId] = role));
	}

	async init() {
		if (typeof window !== 'undefined') {
			window.addEventListener('online', () => {
				this.online = true;
				for (const rep of this.#replications) rep.reSync();
				this.#scheduleSettle();
			});
			window.addEventListener('offline', () => (this.online = false));
		}

		const sb = this.#sb.getClient();
		if (!sb) return;

		const { data } = await sb.auth.getSession();
		if (data.session) await this.#serial(() => this.#startFor(data.session!.user));

		sb.auth.onAuthStateChange((event, session) => {
			// Supabase recommends not awaiting other calls inside this callback.
			setTimeout(() => {
				if (session?.user && session.user.id !== this.user?.id) {
					void this.#serial(() => this.#startFor(session.user));
				} else if (session?.user) {
					this.user = session.user;
					this.sessionExpired = false;
				} else if (event === 'SIGNED_OUT' && this.user && !this.#signingOut) {
					this.sessionExpired = true;
				}
			});
		});
	}

	#serial<T>(fn: () => Promise<T>): Promise<T> {
		const next = this.#queue.then(fn, fn);
		this.#queue = next.catch(() => undefined);
		return next;
	}

	async #startFor(user: User) {
		if (this.user?.id === user.id && this.#app.cloud) {
			this.user = user;
			this.sessionExpired = false;
			return;
		}
		if (this.user) await this.#teardown(false);

		this.#state.rekey(this.#stateKey(user.id), emptyState());
		this.#writeVersion = Math.max(0, ...Object.values(this.#state.value.pending));
		const db = await openDatabase<D>(
			`${this.#appKey}_cloud_${user.id.replace(/[^a-z0-9]/gi, '').toLowerCase()}`,
			this.#schema,
			{ storage: this.#storage }
		);
		this.user = user;
		this.sessionExpired = false;
		this.#app.cloud = createDataSet('cloud', db, this.#schema);
		this.#startReplication(db);
		this.#scheduleSettle();
	}

	#startReplication(db: Database<D>) {
		const sb = replicationClient(this.#sb.getClient()!, this.#sb.schema);
		this.#schema.collections.forEach((name, index) => {
			const rep = replicateSupabase<any>({
				replicationIdentifier: `supabase-${name}`,
				client: sb,
				tableName: name,
				collection: db.collections[name] as any,
				live: true,
				waitForLeadership: false,
				retryTime: 10_000,
				autoStart: true,
				pull: { batchSize: 200 },
				push: {
					batchSize: 50,
					modifier: (doc: any) =>
						this.#state.value.blocked.includes(containerIdOf(this.#schema, name, doc)) ? null : doc
				}
			});
			this.#replications.push(rep);
			this.#subscriptions.push(
				rep.error$.subscribe((err) => {
					this.error = errorMessage(err, this.#sb.schema);
					if (isRejection(err)) this.rejectedWrite = this.error;
				}),
				rep.active$.subscribe((isActive) => {
					if (isActive) this.#activeReps.add(index);
					else this.#activeReps.delete(index);
					this.active = this.#activeReps.size > 0;
				}),
				rep.received$.subscribe(() => this.#scheduleSettle()),
				rep.sent$.subscribe(() => this.#scheduleSettle())
			);
		});
	}

	async #teardown(removeData: boolean) {
		clearTimeout(this.#settleTimer);
		for (const sub of this.#subscriptions) sub.unsubscribe();
		this.#subscriptions = [];
		const reps = this.#replications;
		this.#replications = [];
		this.#activeReps.clear();
		this.active = false;
		await Promise.allSettled(reps.map((r) => r.cancel()));

		const ds = this.#app.cloud;
		this.#app.cloud = null;
		if (ds) {
			// Let the UI drop its live queries on these collections before cleaning them up;
			// cleaning up a collection a live query still depends on is TanStack DB error 254.
			await tick();
			await new Promise((r) => setTimeout(r, 0));
			await disposeDataSet(ds, this.#schema.collections).catch((err) => console.warn('Collection cleanup failed', err));
			if (removeData) await ds.db.remove();
			else await ds.db.close();
		}
		if (removeData && this.user) Persisted.remove(this.#stateKey(this.user.id));
		this.#state.rekey(this.#stateKey('anonymous'), emptyState());
		this.user = null;
		this.error = null;
	}

	#update(fn: (s: UserSyncState) => void) {
		const next = $state.snapshot(this.#state.value) as UserSyncState;
		fn(next);
		this.#state.value = next;
	}

	/** Record that a container has local changes that still need to reach Supabase. */
	markPending(containerId: string) {
		const version = ++this.#writeVersion;
		this.#update((s) => (s.pending[containerId] = version));
		this.#scheduleSettle();
	}

	clearPending(containerId: string) {
		this.#update((s) => delete s.pending[containerId]);
	}

	/** Stop pushing anything for this container (used right before removing it from this device). */
	block(containerId: string) {
		this.#update((s) => {
			if (!s.blocked.includes(containerId)) s.blocked.push(containerId);
			delete s.pending[containerId];
			s.revoked = s.revoked.filter((id) => id !== containerId);
		});
	}

	#scheduleSettle() {
		clearTimeout(this.#settleTimer);
		this.#settleTimer = setTimeout(() => void this.#settle(), 300);
	}

	/** Waits until every replication is idle, then clears pending changes made before the wait began. */
	async #settle() {
		if (this.#settling) {
			this.#resettle = true;
			return;
		}
		this.#settling = true;
		try {
			do {
				this.#resettle = false;
				const reps = this.#replications;
				if (reps.length === 0) return;
				const version = this.#writeVersion;
				await Promise.all(reps.map((r) => r.awaitInSync()));
				if (reps !== this.#replications) return;
				this.#update((s) => {
					for (const [id, v] of Object.entries(s.pending)) if (v <= version) delete s.pending[id];
					s.lastSync = Date.now();
				});
				this.error = null;
				void this.checkMemberships();
			} while (this.#resettle);
		} finally {
			this.#settling = false;
		}
	}

	/** Detect cloud containers this user no longer has access to (someone unshared them). */
	async checkMemberships(force = false) {
		const ds = this.#app.cloud;
		if (!ds || !this.online || !this.email) return;
		if (!force && Date.now() - this.#lastMembershipCheck < MEMBERSHIP_CHECK_INTERVAL) return;
		this.#lastMembershipCheck = Date.now();
		try {
			const memberOf = await this.#sb.fetchMyMemberships(this.email);
			const containers = await ds.db.collections[this.#schema.container].find().exec();
			if (ds !== this.#app.cloud) return;
			this.#update((s) => {
				if (this.#roles) {
					s.roles = Object.fromEntries([...memberOf].filter((e): e is [string, Role] => e[1] !== null));
				}
				s.revoked = containers
					.map((c) => c.primary as string)
					.filter((id) => !memberOf.has(id) && !(id in s.pending) && !s.blocked.includes(id));
				// A container that was re-shared becomes pushable again.
				s.blocked = s.blocked.filter((id) => !memberOf.has(id));
			});
		} catch (err) {
			this.error = errorMessage(err, this.#sb.schema);
		}
	}

	async forceResync() {
		for (const rep of this.#replications) rep.reSync();
		this.#scheduleSettle();
		await this.checkMemberships(true);
	}

	async signInWithGoogle(redirectTo: string) {
		const sb = this.#sb.getClient();
		if (!sb) throw new Error('Cloud sync is not configured.');
		const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
		if (error) throw error;
	}

	/** Email a magic sign-in link. The link has to be opened in this browser (PKCE). */
	async signInWithEmail(email: string, redirectTo: string) {
		const sb = this.#sb.getClient();
		if (!sb) throw new Error('Cloud sync is not configured.');
		const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } });
		if (error) throw error;
	}

	/** Removes every cloud-enabled container from this device. Local-only ones stay. */
	async signOut() {
		const sb = this.#sb.getClient();
		this.#signingOut = true;
		try {
			await this.#serial(() => this.#teardown(true));
			this.sessionExpired = false;
			await sb?.auth.signOut({ scope: 'local' });
		} finally {
			this.#signingOut = false;
		}
	}
}
