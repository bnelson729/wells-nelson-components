import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppState } from '../lib/app.svelte.js';
import { CloudSync } from '../lib/cloud.svelte.js';
import type { SupabaseApi } from '../lib/supabase.js';
import { collections, schemas, type Docs } from './fixture.js';

/** Each collection's replication options, captured instead of talking to Supabase. */
const replications = vi.hoisted(() => new Map<string, { options: any; sent: any }>());

vi.mock('rxdb/plugins/replication-supabase', async () => {
	const { Subject } = await import('rxjs');
	return {
		replicateSupabase: (options: any) => {
			const sent = new Subject();
			replications.set(options.tableName, { options, sent });
			return {
				error$: new Subject(),
				active$: new Subject(),
				received$: new Subject(),
				sent$: sent,
				cancel: async () => {},
				reSync: () => {}
			};
		}
	};
});

function signedInCloud() {
	const client = {
		auth: {
			getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'me@example.com' } } } }),
			onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
		}
	};
	const api = {
		configured: true,
		schema: 'demo',
		mayHaveSession: () => true,
		loadClient: async () => client,
		getClient: () => client
	} as unknown as SupabaseApi;
	return new CloudSync<Docs>({
		appKey: `c${Math.random().toString(36).slice(2, 8)}`,
		schema: { collections, schemas, container: 'projects', containerField: 'project_id' },
		app: new AppState<Docs>(),
		supabase: api,
		roles: true,
		storage: getRxStorageMemory
	});
}

const push = (name: string, doc: object) => replications.get(name)!.options.push.modifier(doc);
const settled = async <T>(p: Promise<T>) =>
	Promise.race([p.then(() => 'done'), new Promise((r) => setTimeout(() => r('waiting'), 20))]);

describe('pushing a new cloud container', () => {
	afterEach(() => {
		vi.useRealTimers();
		replications.clear();
	});

	it("holds its other rows until the container's own row has been sent", async () => {
		const cloud = signedInCloud();
		await cloud.init();
		cloud.expectNewContainer('p1');

		const task = { id: 't1', project_id: 'p1', title: 'Plan', external_ref: '', done: false, updated_at: 1 };
		const pending = push('tasks', task);
		expect(await settled(pending)).toBe('waiting');
		// The container row itself never waits, and other containers' rows go straight through.
		expect(await push('projects', { id: 'p1', name: 'A', created_at: 1, updated_at: 1 })).toMatchObject({ id: 'p1' });
		expect(await push('tasks', { ...task, id: 't2', project_id: 'p2' })).toMatchObject({ id: 't2' });

		replications.get('projects')!.sent.next({ id: 'p1' });
		expect(await pending).toEqual(task);
		// Once sent, later rows don't wait.
		expect(await settled(push('notes', { id: 'n1', project_id: 'p1', seq: 1, mentions: '', updated_at: 1 }))).toBe(
			'done'
		);
	});

	it('stops waiting after a while, so a refused container row never blocks the rest', async () => {
		const cloud = signedInCloud();
		await cloud.init();
		cloud.expectNewContainer('p1');
		vi.useFakeTimers();
		const pending = push('tasks', { id: 't1', project_id: 'p1' });
		await vi.advanceTimersByTimeAsync(20_000);
		expect(await pending).toMatchObject({ id: 't1' });
	});
});
