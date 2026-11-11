import { afterEach, describe, expect, it, vi } from 'vitest';
import { persist } from '../lib/containers.js';
import { reportError, resetErrorReports, setErrorReporter, type ErrorReport } from '../lib/errors.js';
import { adoptSession, createSupabaseApi, defaultStorageKey } from '../lib/supabase.js';
import { eventually, makeStore } from './fixture.js';

const cleanup: (() => Promise<unknown>)[] = [];
afterEach(async () => {
	for (const fn of cleanup.splice(0)) await fn();
	localStorage.clear();
	setErrorReporter(null);
	resetErrorReports();
});

async function started() {
	const store = makeStore();
	await store.init();
	cleanup.push(() => store.app.local!.db.remove());
	return store;
}

describe('export and import', () => {
	it('round-trips a container into a new local copy with fresh ids', async () => {
		const store = await started();
		const ds = store.app.local!;
		const id = store.ops.createContainer(ds, { name: 'Launch' });
		await eventually(() => ds.db.collections.projects.findOne(id).exec());
		await store.ops.insertContainerDocs(ds, {
			tasks: [{ id: 't1', project_id: id, title: 'Design', external_ref: 'EXT-1', done: false, updated_at: 1 }]
		});

		const file = JSON.parse(JSON.stringify(await store.ops.exportContainers([{ id, location: 'local' }])));
		expect(file).toMatchObject({ format: 'wells-nelson-containers', version: 1, app: store.config.appKey });
		expect(file.containers).toHaveLength(1);
		expect(file.containers[0].tasks[0]).not.toHaveProperty('_rev');

		const [copy] = await store.ops.importContainers(file);
		expect(copy).not.toBe(id);
		const docs = await store.ops.readContainer(ds, copy);
		expect(docs.projects[0].name).toBe('Launch');
		expect(docs.tasks).toHaveLength(1);
		expect(docs.tasks[0].id).not.toBe('t1');
		expect(docs.tasks[0].external_ref).toBe('EXT-1');
	});

	it('refuses files from other apps and rows that do not match the schema, writing nothing', async () => {
		const store = await started();
		await expect(store.ops.importContainers({ hello: 1 })).rejects.toThrow('not a backup');
		const base = { format: 'wells-nelson-containers', version: 1, exportedAt: '', containers: [] };
		await expect(store.ops.importContainers({ ...base, app: 'other' })).rejects.toThrow('different app');
		const bad = {
			...base,
			app: store.config.appKey,
			containers: [{ projects: [{ id: 'p', name: 'X', created_at: 1, updated_at: 1 }], tasks: [{ id: 't', title: 5 }] }]
		};
		await expect(store.ops.importContainers(bad)).rejects.toThrow('invalid tasks row');
		expect(await store.app.local!.db.collections.projects.find().exec()).toHaveLength(0);
	});
});

describe('session storage key', () => {
	const env = { supabaseUrl: 'https://abcd.supabase.co', supabaseAnonKey: 'key', cloudConfigured: true };
	const members = { table: 'm', containerField: 'list_id', membersRpc: 'r', roles: false, noun: 'list' };

	it("moves a session from supabase-js's default key once, and removes the old one", () => {
		const legacy = defaultStorageKey(env.supabaseUrl);
		expect(legacy).toBe('sb-abcd-auth-token');
		localStorage.setItem(legacy, '{"token":1}');
		adoptSession(legacy, 'notes-auth');
		expect(localStorage.getItem('notes-auth')).toBe('{"token":1}');
		expect(localStorage.getItem(legacy)).toBeNull();
		// A second app finds nothing left to take.
		adoptSession(legacy, 'tasks-auth');
		expect(localStorage.getItem('tasks-auth')).toBeNull();
	});

	it('only loads the client when a session may exist', () => {
		const api = createSupabaseApi(env, members, { storageKey: 'notes-auth' });
		expect(api.storageKey).toBe('notes-auth');
		expect(api.mayHaveSession()).toBe(false);
		localStorage.setItem('notes-auth', '{}');
		expect(api.mayHaveSession()).toBe(true);
		expect(createSupabaseApi({ ...env, cloudConfigured: false }, members).mayHaveSession()).toBe(false);
	});
});

describe('error reporting', () => {
	it('reports each error once and tells the store about failed writes', async () => {
		const reports: ErrorReport[] = [];
		setErrorReporter((r) => reports.push(r));
		const store = await started();
		vi.spyOn(console, 'error').mockImplementation(() => {});

		reportError('sync', new Error('boom'));
		reportError('sync', new Error('boom'));
		expect(reports.map((r) => r.message)).toEqual(['boom']);

		persist({ when: () => Promise.reject(new Error('QuotaExceededError')) });
		await eventually(() => store.app.writeError);
		expect(store.app.writeError).toBe('QuotaExceededError');
		expect(reports.at(-1)).toMatchObject({ kind: 'write', message: 'QuotaExceededError' });
	});
});
