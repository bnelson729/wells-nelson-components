import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { errorMessage } from '../lib/cloud.svelte.js';
import { createSupabaseApi, friendlyError, replicationClient, schemaNotExposed } from '../lib/supabase.js';

/** The bits of a Supabase client RxDB's replication calls, recording what it was asked. */
function fakeClient() {
	const subscriptions: { type: string; filter: Record<string, unknown> }[] = [];
	const channel = {
		on(type: string, filter: Record<string, unknown>) {
			subscriptions.push({ type, filter });
			return channel;
		},
		subscribe: vi.fn(() => channel)
	};
	const client = {
		from: vi.fn((table: string) => ({ table })),
		channel: vi.fn(() => channel),
		removeChannel: vi.fn()
	};
	return { client: client as unknown as SupabaseClient, raw: client, subscriptions };
}

describe('replicationClient', () => {
	it('returns the client unchanged for the public schema', () => {
		const { client } = fakeClient();
		expect(replicationClient(client, 'public')).toBe(client);
	});

	it('points realtime subscriptions at the custom schema', () => {
		const { client, subscriptions } = fakeClient();
		const wrapped = replicationClient(client, 'demo_lists');
		wrapped
			.channel('supabase-lists')
			.on('postgres_changes' as never, { event: '*', schema: 'public', table: 'lists' } as never, () => {})
			.subscribe();
		expect(subscriptions).toEqual([
			{ type: 'postgres_changes', filter: { event: '*', schema: 'demo_lists', table: 'lists' } }
		]);
	});

	it('passes table queries and channel removal through', () => {
		const { client, raw } = fakeClient();
		const wrapped = replicationClient(client, 'demo_lists');
		expect(wrapped.from('lists')).toEqual({ table: 'lists' });
		const ch = wrapped.channel('x');
		void wrapped.removeChannel(ch);
		expect(raw.removeChannel).toHaveBeenCalledWith(ch);
	});
});

describe('createSupabaseApi', () => {
	const members = { table: 'list_members', containerField: 'list_id', membersRpc: 'get_list_members', roles: false, noun: 'list' };

	it('defaults to the public schema', () => {
		expect(createSupabaseApi({ supabaseUrl: '', supabaseAnonKey: '', cloudConfigured: false }, members).schema).toBe('public');
	});

	it('uses the configured schema for the client', async () => {
		const api = createSupabaseApi(
			{ supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'key', cloudConfigured: true },
			members,
			{ schema: 'demo_lists' }
		);
		expect(api.schema).toBe('demo_lists');
		expect(api.getClient()).toBeNull();
		const client = (await api.loadClient()) as unknown as { rest: { schemaName?: string } };
		expect(client.rest.schemaName).toBe('demo_lists');
	});
});

describe('unexposed schema errors', () => {
	const hint = 'Expose the demo_lists schema in Supabase (Project Settings → Data API).';

	it('turns the API error into the setting to change', () => {
		expect(schemaNotExposed({ code: 'PGRST106', message: 'Invalid schema: demo_lists' }, 'demo_lists')).toBe(hint);
		expect(schemaNotExposed({ message: 'The schema must be one of the following: public, graphql_public' }, 'demo_lists')).toBe(hint);
		expect(schemaNotExposed({ code: '42501', message: 'permission denied' }, 'demo_lists')).toBeNull();
		expect(friendlyError({ code: 'PGRST106', message: 'Invalid schema: demo_lists' }, 'list', 'demo_lists').message).toBe(hint);
	});

	it('explains replication errors too', () => {
		const replicationError = { message: 'RC_PULL', parameters: { direction: 'pull', errors: [{ code: 'PGRST106', message: 'Invalid schema: demo_lists' }] } };
		expect(errorMessage(replicationError, 'demo_lists')).toBe(hint);
		expect(errorMessage({ message: 'RC_PULL', parameters: { errors: [{ code: '08006', message: 'Failed to fetch' }] } }, 'demo_lists')).toBe('Failed to fetch');
	});
});
