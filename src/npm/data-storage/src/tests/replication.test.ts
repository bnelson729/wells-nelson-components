import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { afterEach, describe, it } from 'vitest';
import { AppState } from '../lib/app.svelte.js';
import { CloudSync } from '../lib/cloud.svelte.js';
import type { SupabaseApi } from '../lib/supabase.js';
import { collections, eventually, schemas, type Docs } from './fixture.js';

/**
 * Real RxDB replication (the Supabase plugin, with this library's wiring) against an in-memory
 * stand-in for Supabase's REST API: just the query-builder calls the plugin makes. It catches an
 * upgrade of RxDB or its plugin that changes what replication asks of the server, before an app
 * finds out in production.
 */
type Row = Record<string, unknown>;
type Result = { data: Row[] | null; error: { code?: string; message: string } | null };

class FakeServer {
	tables = new Map<string, Map<string, Row>>();
	#clock = 0;

	table(name: string) {
		let t = this.tables.get(name);
		if (!t) this.tables.set(name, (t = new Map()));
		return t;
	}

	/** A strictly increasing `_modified`, like the server's trigger. */
	stamp() {
		return new Date(Date.UTC(2026, 0, 1) + ++this.#clock).toISOString();
	}

	/** Change a row as another device would. */
	write(name: string, row: Row) {
		const t = this.table(name);
		t.set(row.id as string, { _deleted: false, ...t.get(row.id as string), ...row, _modified: this.stamp() });
	}
}

class Query implements PromiseLike<Result> {
	#filters: ((row: Row) => boolean)[] = [];
	#orders: [string, boolean][] = [];
	#limit = Infinity;
	#update: Row | null = null;

	constructor(
		private server: FakeServer,
		private name: string,
		mode: { update?: Row } = {}
	) {
		this.#update = mode.update ?? null;
	}

	select() {
		return this;
	}
	eq(col: string, value: unknown) {
		this.#filters.push((r) => r[col] === value);
		return this;
	}
	is(col: string, value: unknown) {
		this.#filters.push((r) => (r[col] ?? null) === value);
		return this;
	}
	/** Only the plugin's checkpoint filter: "m".gt.X,and("m".eq.X,"id".gt.Y). */
	or(expr: string) {
		const m = /^"(\w+)"\.gt\.(.+?),and\("\w+"\.eq\.(.+?),"(\w+)"\.gt\.(.+)\)$/.exec(expr);
		if (!m) throw new Error(`Fake server: unsupported or(${expr})`);
		const [, mod, after, same, pk, id] = m;
		this.#filters.push((r) => String(r[mod]) > after || (String(r[mod]) === same && String(r[pk]) > id));
		return this;
	}
	order(col: string, opts: { ascending: boolean }) {
		this.#orders.push([col, opts.ascending]);
		return this;
	}
	limit(n: number) {
		this.#limit = n;
		return this;
	}

	then<A = Result, B = never>(
		onFulfilled?: ((v: Result) => A | PromiseLike<A>) | null,
		onRejected?: ((e: unknown) => B | PromiseLike<B>) | null
	): PromiseLike<A | B> {
		const rows = [...this.server.table(this.name).values()].filter((r) => this.#filters.every((f) => f(r)));
		if (this.#update) {
			for (const r of rows) Object.assign(r, this.#update, { _modified: this.server.stamp() });
		}
		rows.sort((a, b) => {
			for (const [col, asc] of this.#orders) {
				const c = String(a[col]).localeCompare(String(b[col]));
				if (c) return asc ? c : -c;
			}
			return 0;
		});
		const data = rows.slice(0, this.#limit).map((r) => ({ ...r }));
		return Promise.resolve<Result>({ data, error: null }).then(onFulfilled, onRejected);
	}
}

function fakeClient(server: FakeServer) {
	const channel = {
		on: () => channel,
		subscribe: (cb?: (status: string) => void) => {
			setTimeout(() => cb?.('SUBSCRIBED'));
			return channel;
		}
	};
	return {
		auth: {
			getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'me@example.com' } } } }),
			onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
		},
		from: (name: string) => ({
			select: () => new Query(server, name),
			insert: async (doc: Row) => {
				const t = server.table(name);
				if (t.has(doc.id as string)) return { error: { code: '23505', message: 'duplicate key' } };
				t.set(doc.id as string, { _deleted: false, ...doc, _modified: server.stamp() });
				return { error: null };
			},
			update: (row: Row) => new Query(server, name, { update: row })
		}),
		channel: () => channel,
		removeChannel: () => {}
	};
}

const syncs: CloudSync<Docs>[] = [];
afterEach(async () => {
	for (const s of syncs.splice(0)) await s.signOut().catch(() => {});
});

async function device(server: FakeServer) {
	const client = fakeClient(server);
	const api = {
		configured: true,
		schema: 'demo',
		mayHaveSession: () => true,
		loadClient: async () => client,
		getClient: () => client,
		signOut: async () => {}
	} as unknown as SupabaseApi;
	const app = new AppState<Docs>();
	const cloud = new CloudSync<Docs>({
		appKey: `r${Math.random().toString(36).slice(2, 8)}`,
		schema: { collections, schemas, container: 'projects', containerField: 'project_id' },
		app,
		supabase: api,
		storage: getRxStorageMemory
	});
	syncs.push(cloud);
	await cloud.init();
	return { app, cloud };
}

describe('replication against a Supabase-like server', () => {
	it('pushes local rows, pulls rows written elsewhere, and syncs deletions', async () => {
		const server = new FakeServer();
		const { app, cloud } = await device(server);
		const projects = app.cloud!.db.collections.projects;

		await projects.insert({ id: 'p1', name: 'Plan', created_at: 1, updated_at: 1 });
		await eventually(() => server.table('projects').get('p1')?.name === 'Plan');

		server.write('projects', { id: 'p1', name: 'Plan B', created_at: 1, updated_at: 2 });
		server.write('tasks', { id: 't1', project_id: 'p1', title: 'Draft', external_ref: '', done: false, updated_at: 2 });
		await cloud.forceResync();
		await eventually(async () => (await projects.findOne('p1').exec())?.name === 'Plan B');
		await eventually(async () => (await app.cloud!.db.collections.tasks.findOne('t1').exec())?.title === 'Draft');

		const local = await projects.findOne('p1').exec();
		await local!.patch({ name: 'Plan C', updated_at: 3 });
		await eventually(() => server.table('projects').get('p1')?.name === 'Plan C');

		await (await projects.findOne('p1').exec())!.remove();
		await eventually(() => server.table('projects').get('p1')?._deleted === true);
	}, 20_000);
});
