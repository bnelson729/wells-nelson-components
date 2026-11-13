import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../lib/database.js';
import { createDataSet } from '../lib/dataset.js';
import { eventually, makeStore, type Docs } from './fixture.js';

type Store = ReturnType<typeof makeStore>;
const cleanup: (() => Promise<unknown>)[] = [];
afterEach(async () => {
	for (const fn of cleanup.splice(0)) await fn();
	localStorage.clear();
});

async function started() {
	const store = makeStore();
	await store.init();
	cleanup.push(() => store.app.local!.db.remove());
	return store;
}

/** A second data set posing as "cloud" so copies can be exercised without Supabase. */
async function fakeCloud(store: Store) {
	const db = await openDatabase<Docs>(`${store.config.appKey}_fakecloud`, store.config, {
		storage: getRxStorageMemory
	});
	cleanup.push(() => db.remove());
	return createDataSet<Docs>('cloud', db, store.config);
}

async function seedProject(store: Store) {
	const ds = store.app.local!;
	const projectId = store.ops.createContainer(ds, { name: 'Launch' });
	await eventually(() => ds.db.collections.projects.findOne(projectId).exec());
	const t = Date.now();
	await store.ops.insertContainerDocs(ds, {
		tasks: [
			{ id: 't1', project_id: projectId, title: 'Design', external_ref: 'EXT-1', done: false, updated_at: t },
			{ id: 't2', project_id: projectId, title: 'Build', external_ref: 'EXT-2', done: false, updated_at: t }
		],
		task_links: [{ id: 't1:t2', project_id: projectId, from_id: 't1', to_id: 't2', updated_at: t }],
		notes: [{ id: 'n1', project_id: projectId, seq: 0, mentions: 't1,t2', updated_at: t }]
	});
	return projectId;
}

describe('container operations', () => {
	it('creates a container with created_at and reads it back whole', async () => {
		const store = await started();
		const projectId = await seedProject(store);
		const docs = await store.ops.readContainer(store.app.local!, projectId);
		expect(docs.projects[0].name).toBe('Launch');
		expect(docs.projects[0].created_at).toBeGreaterThan(0);
		expect(docs.tasks.map((p) => p.id).sort()).toEqual(['t1', 't2']);
		expect(docs.task_links).toHaveLength(1);
	});

	it('copies with new ids, remapping refs, composite ids and ids in text, but not external ids', async () => {
		const store = await started();
		const projectId = await seedProject(store);
		const to = await fakeCloud(store);
		const before = Date.now();
		const newId = await store.ops.copyContainer(store.app.local!, to, projectId, true);
		expect(newId).not.toBe(projectId);

		const copy = await store.ops.readContainer(to, newId);
		const ids = new Map(copy.tasks.map((t) => [t.external_ref, t.id]));
		expect(copy.tasks).toHaveLength(2);
		expect([...ids.values()]).not.toContain('t1');
		expect(copy.tasks.every((t) => t.project_id === newId && t.updated_at >= before)).toBe(true);
		// external_ref is an id from another system: kept as is.
		expect([...ids.keys()].sort()).toEqual(['EXT-1', 'EXT-2']);

		const link = copy.task_links[0];
		expect(link.from_id).toBe(ids.get('EXT-1'));
		expect(link.to_id).toBe(ids.get('EXT-2'));
		expect(link.id).toBe(`${link.from_id}:${link.to_id}`);
		expect(copy.notes[0].mentions).toBe(`${ids.get('EXT-1')},${ids.get('EXT-2')}`);
	});

	it('keeps ids when copying without newIds', async () => {
		const store = await started();
		const projectId = await seedProject(store);
		const to = await fakeCloud(store);
		expect(await store.ops.copyContainer(store.app.local!, to, projectId, false)).toBe(projectId);
		const copy = await store.ops.readContainer(to, projectId);
		expect(copy.task_links[0].id).toBe('t1:t2');
		expect(copy.notes[0].mentions).toBe('t1,t2');
	});

	it('deletes a local container and hides it at once', async () => {
		const store = await started();
		const projectId = await seedProject(store);
		store.prefs.setDefaultContainer(projectId);
		await store.ops.deleteContainer(store.app.local!, projectId);
		const docs = await store.ops.readContainer(store.app.local!, projectId);
		expect(Object.values(docs).every((rows) => rows.length === 0)).toBe(true);
		expect(store.tombstones.has('local', projectId)).toBe(true);
		expect(store.prefs.defaultContainerId).toBeNull();
	});

	it('lists containers once, skipping hidden ones', () => {
		const store = makeStore();
		const project = (id: string) => ({ id, name: id, created_at: 0, updated_at: 0 });
		store.tombstones.hide('local', ['gone']);
		const entries = store.ops.entries([project('a'), project('moving'), project('gone')], [project('moving')]);
		expect(entries.map((e) => `${e.container.id}:${e.location}`).sort()).toEqual(['a:local', 'moving:cloud']);
		// Roles on and nothing cached: a cloud container we didn't create reads as viewer.
		expect(entries.find((e) => e.location === 'cloud')!.role).toBe('viewer');
	});

	it('refuses cloud-only operations while signed out', async () => {
		const store = await started();
		await expect(store.ops.makeCloud('nope')).rejects.toThrow(/cloud data set is not available/);
	});
});
