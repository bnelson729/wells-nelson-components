import { tick } from 'svelte';
import { AppState } from './app.svelte.js';
import { CloudSync } from './cloud.svelte.js';
import { createContainerOps, type RemapHook } from './containers.js';
import { openDatabase, setStorageFactory, type StorageFactory } from './database.js';
import { createDataSet, type DataSet } from './dataset.js';
import type { EnvConfig } from './env.js';
import { DevicePrefs, defaultPrefsKeys } from './prefs.svelte.js';
import { createSupabaseApi, type MembersConfig } from './supabase.js';
import { Tombstones } from './tombstones.svelte.js';
import type { CollectionName, DocMap, Nouns, StoreSchema } from './types.js';

/**
 * `C` is the container collection; pass it (`createSyncedStore<Docs, 'projects'>`) so container
 * rows are typed as that document rather than a union of every document.
 */
export interface SyncedStoreConfig<D extends DocMap, C extends CollectionName<D> = CollectionName<D>>
	extends StoreSchema<D, C> {
	/** Prefix for database names and localStorage keys, e.g. 'demo' → `demo_local`, `demo:hidden`. */
	appKey: string;
	nouns: Nouns;
	/** From `envConfig(import.meta.env)`. */
	env: EnvConfig;
	/** RxDB storage, e.g. `getRxStorageDexie` (browser) or `getRxStorageMemory` (tests). */
	storage: StorageFactory;
	/** viewer / editor / owner roles (needs the roles variant of the SQL migration). */
	roles?: boolean;
	/**
	 * Postgres schema for the app's tables and functions (default 'public'). A custom schema must be
	 * exposed in the Supabase project's Data API settings; generate its SQL with the same `schema`.
	 */
	supabaseSchema?: string;
	/** Override membership table / RPC names (defaults: `<noun>_members`, `get_<noun>_members`). */
	members?: Partial<Omit<MembersConfig, 'roles' | 'containerField'>>;
	/** Fields per collection holding ids of other rows in the container (rewritten when copying). */
	refs?: { [N in CollectionName<D>]?: (keyof D[N] & string)[] };
	/** Rewrite composite ids / ids inside text fields when copying (see `RemapHook`). */
	remap?: RemapHook<D>;
	/** A `DevicePrefs` subclass with app-specific prefs. */
	prefs?: DevicePrefs;
}

/**
 * Wire the whole storage layer for an app from one config: app state (local + cloud data
 * sets), cloud sync, tombstones, device prefs, the Supabase members API and container
 * operations. Create it once in a module and import it where needed.
 */
export function createSyncedStore<D extends DocMap, C extends CollectionName<D> = CollectionName<D>>(
	config: SyncedStoreConfig<D, C>
) {
	const roles = config.roles ?? false;
	const supabase = createSupabaseApi(
		config.env,
		{
			table: `${config.nouns.singular}_members`,
			membersRpc: `get_${config.nouns.singular}_members`,
			noun: config.nouns.singular,
			...config.members,
			containerField: config.containerField,
			roles
		},
		{ schema: config.supabaseSchema }
	);
	const app = new AppState<D>();
	const tombstones = new Tombstones(config.appKey);
	const prefs = config.prefs ?? new DevicePrefs(defaultPrefsKeys(config.appKey, config.nouns));
	const cloud = new CloudSync<D>({
		appKey: config.appKey,
		schema: config,
		app,
		supabase,
		roles,
		storage: config.storage
	});
	const ops = createContainerOps<D, C>({
		schema: config,
		app,
		cloud,
		tombstones,
		prefs,
		supabase,
		roles,
		refs: config.refs,
		remap: config.remap
	});

	let started: Promise<void> | undefined;

	/**
	 * Open the local database, then restore any Supabase session (which opens the cloud
	 * database). Safe to call more than once. A failure ends up in `app.fatal`.
	 */
	function init(options: { beforeReady?: (local: DataSet<D>) => Promise<void> } = {}): Promise<void> {
		started ??= (async () => {
			setStorageFactory(config.storage);
			const db = await openDatabase<D>(`${config.appKey}_local`, config, { storage: config.storage });
			const local = createDataSet('local', db, config);
			await options.beforeReady?.(local).catch((err) => console.error('Startup hook failed', err));
			app.local = local;
			app.ready = true;
			await cloud.init();
		})().catch((err) => {
			console.error(err);
			app.fatal = err instanceof Error ? err.message : String(err);
		});
		return started;
	}

	/**
	 * Unmount the app, sign out locally and remove the local database. Pass to
	 * `wipeAllData({ beforeWipe })` from `@wells-nelson/interactions` for a dev "start over".
	 */
	async function resetDevice() {
		// Unmount first so no live query is still reading the databases being removed.
		app.ready = false;
		await tick();
		try {
			await cloud.signOut();
		} catch (err) {
			console.warn('Sign-out during reset failed', err);
		}
		const local = app.local;
		app.local = null;
		await local?.db.remove();
	}

	return { config, roles, app, cloud, tombstones, prefs, supabase, ops, init, resetDevice };
}

export type SyncedStore<D extends DocMap, C extends CollectionName<D> = CollectionName<D>> = ReturnType<
	typeof createSyncedStore<D, C>
>;
