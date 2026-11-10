import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { afterEach, describe, expect, it } from 'vitest';
import { lastWriteWins, openDatabase } from '../lib/database.js';
import { envConfig } from '../lib/env.js';
import { Persisted } from '../lib/persisted.svelte.js';
import { DevicePrefs, defaultPrefsKeys } from '../lib/prefs.svelte.js';
import { Tombstones } from '../lib/tombstones.svelte.js';
import { containerIdOf } from '../lib/types.js';
import { collections, eventually, makeStore, schemas, type Docs } from './fixture.js';

afterEach(() => localStorage.clear());

describe('envConfig', () => {
	it('is local-only unless both values are set', () => {
		expect(envConfig({}).cloudConfigured).toBe(false);
		expect(envConfig({ VITE_SUPABASE_URL: 'https://x' }).cloudConfigured).toBe(false);
		expect(envConfig({ VITE_SUPABASE_URL: 'https://x', VITE_SUPABASE_ANON_KEY: 'k' }).cloudConfigured).toBe(true);
	});
});

describe('Persisted', () => {
	it('mirrors to localStorage and re-keys', () => {
		const p = new Persisted('a', 1);
		p.value = 2;
		expect(JSON.parse(localStorage.getItem('a')!)).toBe(2);
		p.rekey('b', 5);
		expect(p.value).toBe(5);
		p.rekey('a', 0);
		expect(p.value).toBe(2);
	});

	it('falls back on unreadable values', () => {
		localStorage.setItem('bad', '{nope');
		expect(new Persisted('bad', 'fallback').value).toBe('fallback');
	});
});

describe('Tombstones', () => {
	it('hides per data set and prunes after a week', () => {
		const t = new Tombstones('x');
		t.hide('cloud', ['1']);
		expect(t.has('cloud', '1')).toBe(true);
		expect(t.has('local', '1')).toBe(false);
		t.unhide('cloud', ['1']);
		expect(t.has('cloud', '1')).toBe(false);

		localStorage.setItem('x:hidden', JSON.stringify({ 'local:old': Date.now() - 8 * 24 * 3600 * 1000, 'local:new': Date.now() }));
		const pruned = new Tombstones('x');
		expect(pruned.has('local', 'old')).toBe(false);
		expect(pruned.has('local', 'new')).toBe(true);
	});
});

describe('DevicePrefs', () => {
	it('derives keys from the prefix and nouns', () => {
		expect(defaultPrefsKeys('demo', { singular: 'project', plural: 'projects' })).toEqual({
			collapsed: 'demo:collapsed',
			prompted: 'demo:promptedLocalProjects',
			defaultContainer: 'demo:defaultProject'
		});
		expect(defaultPrefsKeys('todo', { singular: 'list', plural: 'lists' }).defaultContainer).toBe('todo:defaultList');
	});

	it('tracks the default container across id changes', () => {
		const prefs = new DevicePrefs(defaultPrefsKeys('p', { singular: 'list', plural: 'lists' }));
		prefs.setDefaultContainer('a');
		prefs.replaceContainer('a', 'b');
		expect(prefs.defaultContainerId).toBe('b');
		prefs.replaceContainer('b', null);
		expect(prefs.defaultContainerId).toBeNull();
		expect(prefs.isCollapsed('g', true)).toBe(true);
		prefs.setCollapsed('g', false);
		expect(prefs.isCollapsed('g', true)).toBe(false);
	});
});

describe('lastWriteWins', () => {
	const resolve = (a: number, b: number) =>
		lastWriteWins.resolve({ newDocumentState: { updated_at: a, v: 'new' }, realMasterState: { updated_at: b, v: 'server' } } as any, 'test');

	it('keeps the newer side and gives ties to the server', async () => {
		expect(((await resolve(2, 1)) as any).v).toBe('new');
		expect(((await resolve(1, 2)) as any).v).toBe('server');
		expect(((await resolve(1, 1)) as any).v).toBe('server');
	});

	it('ignores RxDB metadata when comparing', () => {
		expect(lastWriteWins.isEqual({ updated_at: 1, _rev: 'a' } as any, { updated_at: 1, _rev: 'b' } as any, 'test')).toBe(true);
		expect(lastWriteWins.isEqual({ updated_at: 1 } as any, { updated_at: 2 } as any, 'test')).toBe(false);
	});
});

describe('openDatabase', () => {
	it('creates one collection per schema', async () => {
		const db = await openDatabase<Docs>(`db${Date.now()}`, { collections, schemas }, { storage: getRxStorageMemory });
		expect(Object.keys(db.collections).sort()).toEqual([...collections].sort());
		await db.remove();
	});
});

describe('containerIdOf', () => {
	it('treats the container as its own container', () => {
		const s = { container: 'projects', containerField: 'project_id' };
		expect(containerIdOf(s, 'projects', { id: 't' })).toBe('t');
		expect(containerIdOf(s, 'tasks', { id: 'p', project_id: 't' })).toBe('t');
	});
});

describe('createSyncedStore', () => {
	it('opens the local data set and runs local-only without Supabase', async () => {
		const store = makeStore();
		let seeded = false;
		await store.init({ beforeReady: async () => void (seeded = true) });
		expect(store.app.fatal).toBeNull();
		expect(store.app.ready).toBe(true);
		expect(seeded).toBe(true);
		expect(store.cloud.configured).toBe(false);
		expect(store.app.cloud).toBeNull();
		await eventually(() => store.app.local);
		await store.app.local!.db.remove();
	});
});
