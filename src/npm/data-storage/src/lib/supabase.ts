import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
	/** True when the email belongs to a registered user; false means the invite is pending. */
	active: boolean;
	/** Only when roles are on. */
	role?: Role | null;
}

export interface SupabaseApi {
	readonly configured: boolean;
	/** The shared client (PKCE, created on first use), or null in local-only mode. */
	getClient(): SupabaseClient | null;
	fetchMembers(containerId: string): Promise<Member[]>;
	inviteMember(containerId: string, email: string, role?: Role): Promise<void>;
	setMemberRole(memberId: string, role: Role): Promise<void>;
	removeMember(memberId: string): Promise<void>;
	/** Remove the signed-in user's own membership. */
	leave(containerId: string, email: string): Promise<void>;
	/** Every container the user belongs to, with their role (null without roles). */
	fetchMyMemberships(email: string): Promise<Map<string, Role | null>>;
}

/** Turn Postgres errors from triggers / RLS into messages a person can act on. */
export function friendlyError(error: { message: string; code?: string }, noun: string): Error {
	if (error.message.includes('last owner')) {
		return new Error(`A ${noun} must always have at least one owner. Make someone else an owner first.`);
	}
	if (error.code === '42501') return new Error(`You don't have permission to do that on this ${noun}.`);
	if (error.code === '23505') return new Error(`That email already has access to this ${noun}.`);
	return new Error(error.message);
}

/** Supabase client plus the members API, with table and RPC names from `members`. */
export function createSupabaseApi(env: EnvConfig, members: MembersConfig): SupabaseApi {
	let client: SupabaseClient | null = null;
	const { table, containerField, membersRpc, roles, noun } = members;
	const rpcParam = members.rpcParam ?? `p_${containerField}`;

	function getClient() {
		if (!env.cloudConfigured) return null;
		client ??= createClient(env.supabaseUrl, env.supabaseAnonKey, {
			auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
		});
		return client;
	}

	function requireClient() {
		const sb = getClient();
		if (!sb) throw new Error('Cloud sync is not configured.');
		return sb;
	}

	const fail = (error: { message: string; code?: string } | null) => {
		if (error) throw friendlyError(error, noun);
	};

	return {
		configured: env.cloudConfigured,
		getClient,

		async fetchMembers(containerId) {
			const { data, error } = await requireClient().rpc(membersRpc, { [rpcParam]: containerId });
			fail(error);
			return (data ?? []) as Member[];
		},

		async inviteMember(containerId, email, role) {
			const row: Record<string, string> = { [containerField]: containerId, email: email.trim().toLowerCase() };
			if (roles) row.role = role ?? 'viewer';
			const { error } = await requireClient().from(table).insert(row);
			fail(error);
		},

		async setMemberRole(memberId, role) {
			if (!roles) throw new Error('Roles are not enabled.');
			const { error } = await requireClient().from(table).update({ role }).eq('id', memberId);
			fail(error);
		},

		async removeMember(memberId) {
			const { error } = await requireClient().from(table).delete().eq('id', memberId);
			fail(error);
		},

		async leave(containerId, email) {
			const { error } = await requireClient()
				.from(table)
				.delete()
				.eq(containerField, containerId)
				.eq('email', email.toLowerCase());
			fail(error);
		},

		async fetchMyMemberships(email) {
			const columns = roles ? `${containerField}, role` : containerField;
			const { data, error } = await requireClient().from(table).select(columns).eq('email', email.toLowerCase());
			fail(error);
			const rows = (data ?? []) as unknown as Record<string, string>[];
			return new Map(rows.map((r) => [r[containerField], roles ? (r.role as Role) : null]));
		}
	};
}
