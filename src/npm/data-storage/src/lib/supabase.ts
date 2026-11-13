import type { SupabaseClient } from '@supabase/supabase-js';
import type { EnvConfig } from './env.js';
import type { Role } from './types.js';

export interface MembersConfig {
	/** Membership table, e.g. 'project_members'. */
	table: string;
	/** Column holding the container id, e.g. 'project_id'. */
	containerField: string;
	/** RPC returning a container's members with their active/pending state, e.g. 'get_project_members'. */
	membersRpc: string;
	/** The RPC's container id parameter (default `p_<containerField>`). */
	rpcParam?: string;
	/** Members carry a viewer / editor / owner role. */
	roles: boolean;
	/** Singular container noun for error messages, e.g. 'project'. */
	noun: string;
}

export interface Member {
	id: string;
	email: string;
	/**
	 * True once the invited person has signed in since being invited; false while the invite is
	 * pending. Null when the caller may not see it (only owners do, with roles).
	 */
	active: boolean | null;
	/** Only when roles are on. */
	role?: Role | null;
}

export interface SupabaseOptions {
	/**
	 * Postgres schema holding the app's tables and functions (default 'public'). A custom schema
	 * must be listed under the Supabase project's exposed schemas (Data API settings).
	 */
	schema?: string;
	/**
	 * localStorage key of the signed-in session. Give every app on an origin its own key, so
	 * signing in or out of one doesn't affect another. Default: supabase-js's `sb-<project>-auth-token`,
	 * which a session found there is moved from once.
	 */
	storageKey?: string;
}

export interface SupabaseApi {
	readonly configured: boolean;
	/** The Postgres schema the client reads and writes. */
	readonly schema: string;
	/** localStorage key of the session. */
	readonly storageKey: string;
	/**
	 * Load supabase-js and create the shared client (PKCE), once. Null in local-only mode. The
	 * library is only downloaded when something needs it: a stored session, a sign-in redirect,
	 * or a sign-in.
	 */
	loadClient(): Promise<SupabaseClient | null>;
	/** The client once `loadClient` has created it, otherwise null. */
	getClient(): SupabaseClient | null;
	/**
	 * Whether a session may exist without loading supabase-js: one is stored, or the page is a
	 * sign-in redirect (PKCE `code` or an error in the URL).
	 */
	mayHaveSession(): boolean;
	fetchMembers(containerId: string): Promise<Member[]>;
	inviteMember(containerId: string, email: string, role?: Role): Promise<void>;
	setMemberRole(memberId: string, role: Role): Promise<void>;
	removeMember(memberId: string): Promise<void>;
	/** Remove the signed-in user's own membership. */
	leave(containerId: string, email: string): Promise<void>;
	/** Every container the user belongs to, with their role (null without roles). */
	fetchMyMemberships(email: string): Promise<Map<string, Role | null>>;
}

/**
 * PostgREST refuses a schema that isn't exposed in the project's Data API settings (PGRST106,
 * "Invalid schema: …"). Returns the fix to show instead, or null for other errors.
 */
export function schemaNotExposed(
	error: { message?: string; code?: string } | undefined,
	schema: string
): string | null {
	if (!error) return null;
	if (error.code !== 'PGRST106' && !/invalid schema|schema must be one of/i.test(error.message ?? '')) return null;
	return `Expose the ${schema} schema in Supabase (Project Settings → Data API).`;
}

/** Turn Postgres errors from triggers / RLS into messages a person can act on. */
export function friendlyError(error: { message: string; code?: string }, noun: string, schema = 'public'): Error {
	const unexposed = schemaNotExposed(error, schema);
	if (unexposed) return new Error(unexposed);
	if (error.message.includes('last owner')) {
		return new Error(`A ${noun} must always have at least one owner. Make someone else an owner first.`);
	}
	if (error.code === '42501') return new Error(`You don't have permission to do that on this ${noun}.`);
	if (error.code === '23505') return new Error(`That email already has access to this ${noun}.`);
	return new Error(error.message);
}

/** supabase-js's own session key for a project URL. */
export function defaultStorageKey(supabaseUrl: string) {
	try {
		return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
	} catch {
		return 'sb-auth-token';
	}
}

/**
 * Move a session stored under supabase-js's default key to `storageKey` (once, when the new key
 * is empty). The old key is removed: two apps holding the same refresh token would revoke each
 * other's session, so only the first app to start keeps it and the other signs in again.
 */
export function adoptSession(legacyKey: string, storageKey: string) {
	if (legacyKey === storageKey) return;
	try {
		if (localStorage.getItem(storageKey) !== null) return;
		const value = localStorage.getItem(legacyKey);
		if (value === null) return;
		localStorage.setItem(storageKey, value);
		localStorage.removeItem(legacyKey);
		const verifier = localStorage.getItem(`${legacyKey}-code-verifier`);
		if (verifier !== null) {
			localStorage.setItem(`${storageKey}-code-verifier`, verifier);
			localStorage.removeItem(`${legacyKey}-code-verifier`);
		}
	} catch {
		/* storage unavailable: nothing to move */
	}
}

/** Supabase client plus the members API, with table and RPC names from `members`. */
export function createSupabaseApi(env: EnvConfig, members: MembersConfig, options: SupabaseOptions = {}): SupabaseApi {
	let client: SupabaseClient | null = null;
	let loading: Promise<SupabaseClient | null> | null = null;
	const schema = options.schema ?? 'public';
	const legacyKey = defaultStorageKey(env.supabaseUrl);
	const storageKey = options.storageKey ?? legacyKey;
	const { table, containerField, membersRpc, roles, noun } = members;
	const rpcParam = members.rpcParam ?? `p_${containerField}`;

	function loadClient() {
		if (!env.cloudConfigured) return Promise.resolve(null);
		loading ??= (async () => {
			const { createClient } = await import('@supabase/supabase-js');
			adoptSession(legacyKey, storageKey);
			client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
				db: { schema },
				auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey }
			}) as unknown as SupabaseClient;
			return client;
		})();
		// A failed download (offline on first use) can be retried later.
		loading.catch(() => (loading = null));
		return loading;
	}

	function mayHaveSession() {
		if (!env.cloudConfigured) return false;
		try {
			if (localStorage.getItem(storageKey) !== null || localStorage.getItem(legacyKey) !== null) return true;
		} catch {
			/* no storage: only a redirect can carry a session */
		}
		if (typeof location === 'undefined') return false;
		const params = new URLSearchParams(location.search);
		return (
			params.has('code') || params.has('error_description') || /access_token|error_description/.test(location.hash)
		);
	}

	async function requireClient() {
		const sb = await loadClient();
		if (!sb) throw new Error('Cloud sync is not configured.');
		return sb;
	}

	const fail = (error: { message: string; code?: string } | null) => {
		if (error) throw friendlyError(error, noun, schema);
	};

	return {
		configured: env.cloudConfigured,
		schema,
		storageKey,
		loadClient,
		getClient: () => client,
		mayHaveSession,

		async fetchMembers(containerId) {
			const { data, error } = await (await requireClient()).rpc(membersRpc, { [rpcParam]: containerId });
			fail(error);
			return (data ?? []) as Member[];
		},

		async inviteMember(containerId, email, role) {
			const row: Record<string, string> = { [containerField]: containerId, email: email.trim().toLowerCase() };
			if (roles) row.role = role ?? 'viewer';
			const { error } = await (await requireClient()).from(table).insert(row);
			fail(error);
		},

		async setMemberRole(memberId, role) {
			if (!roles) throw new Error('Roles are not enabled.');
			const { error } = await (await requireClient()).from(table).update({ role }).eq('id', memberId);
			fail(error);
		},

		async removeMember(memberId) {
			const { error } = await (await requireClient()).from(table).delete().eq('id', memberId);
			fail(error);
		},

		async leave(containerId, email) {
			const { error } = await (
				await requireClient()
			)
				.from(table)
				.delete()
				.eq(containerField, containerId)
				.eq('email', email.toLowerCase());
			fail(error);
		},

		async fetchMyMemberships(email) {
			const columns = roles ? `${containerField}, role` : containerField;
			const { data, error } = await (
				await requireClient()
			)
				.from(table)
				.select(columns)
				.eq('email', email.toLowerCase());
			fail(error);
			const rows = (data ?? []) as unknown as Record<string, string>[];
			return new Map(rows.map((r) => [r[containerField], roles ? (r.role as Role) : null]));
		}
	};
}

/**
 * The client RxDB's Supabase replication should use. Its pulls and pushes go through
 * `client.from()`, which follows the client's schema, but its realtime subscription always
 * asks for schema 'public'. For any other schema this wraps the three methods the replication
 * calls and points that subscription at the right schema.
 */
export function replicationClient(client: SupabaseClient, schema: string): SupabaseClient {
	if (schema === 'public') return client;
	type Channel = ReturnType<SupabaseClient['channel']>;
	const adapter = {
		from: (table: string) => client.from(table),
		removeChannel: (channel: Channel) => client.removeChannel(channel),
		channel: (name: string, opts?: Parameters<SupabaseClient['channel']>[1]) => {
			const channel = client.channel(name, opts);
			const on = channel.on.bind(channel) as (type: string, filter: Record<string, unknown>, cb: unknown) => Channel;
			(channel as unknown as { on: typeof on }).on = (type, filter, cb) =>
				on(type, type === 'postgres_changes' ? { ...filter, schema } : filter, cb);
			return channel;
		}
	};
	return adapter as unknown as SupabaseClient;
}
