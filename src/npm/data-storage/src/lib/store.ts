import { tick } from 'svelte';
import { AppState } from './app.svelte.js';
import { CloudSync } from './cloud.svelte.js';
import { createContainerOps, type RemapHook } from './containers.js';
import { openDatabase, setStorageFactory, type StorageFactory } from './database.js';
import { createDataSet, type DataSet } from './dataset.js';
import type { EnvConfig } from './env.js';
import { onWriteError, remoteReporter, reportError, setErrorReporter } from './errors.js';
import { DevicePrefs, defaultPrefsKeys } from './prefs.svelte.js';
import { createSupabaseApi, type MembersConfig } from './supabase.js';
import { Tombstones } from './tombstones.svelte.js';
import type { CollectionName, DocMap, Nouns, StoreSchema } from './types.js';

/**
 * `C` is the container collection; pass it (`createSyncedStore<Docs, 'projects'>`) so container
 * rows are typed as that document rather than a union of every document.
 */
export interface SyncedStoreConfig<D extends DocMap<D>, C extends CollectionName<D> = CollectionName<D>>
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
	/**
	 * localStorage key of the Supabase session (default `<appKey>-auth`), so apps sharing an
	 * origin don't share, or sign each other out of, a session.
	 */
	authStorageKey?: string;
	/**
	 * Send failed writes, sync errors, failed pref saves and uncaught errors to the
	 * `report_client_error` function of the app's Supabase schema (from the generated migration).
	 * Pass the deployed version (`version` from `$app/env`). Off when cloud sync isn't configured.
	 */
	reportErrors?: { version?: string };
	/**
	 * Ask the browser on start to keep this site's data for good (default true): right for apps that
	 * keep data on the device. A website whose data lives in the cloud can turn it off, since some
	 * browsers ask the user. `requestPersistence()` still works on demand.
	 */
	persistStorage?: boolean;
}

/**
 * Wire the whole storage layer for an app from one config: app state (local + cloud data
 * sets), cloud sync, tombstones, device prefs, the Supabase members API and container
 * operations. Create it once in a module and import it where needed.
 */
export function createSyncedStore<D extends DocMap<D>, C extends CollectionName<D> = CollectionName<D>>(
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
		{ schema: config.supabaseSchema, storageKey: config.authStorageKey ?? `${config.appKey}-auth` }
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
		remap: config.remap,
		appKey: config.appKey
	});

	onWriteError((message) => (app.writeError = message));

	/**
	 * Ask the browser to keep this site's data (it may decide on its own, or ask the user). The
	 * result is `app.persisted`. Called on start; call it again from a button to retry.
	 */
	async function requestPersistence(): Promise<boolean | null> {
		const storage = typeof navigator === 'undefined' ? undefined : navigator.storage;
		if (!storage?.persisted || !storage.persist) return (app.persisted = null);
		try {
			app.persisted = (await storage.persisted()) || (await storage.persist());
		} catch {
			app.persisted = null;
		}
		return app.persisted;
	}

	function startErrorReporting() {
		if (!config.reportErrors || !config.env.cloudConfigured || typeof window === 'undefined') return;
		setErrorReporter(
			remoteReporter({
				supabaseUrl: config.env.supabaseUrl,
				supabaseAnonKey: config.env.supabaseAnonKey,
				schema: supabase.schema,
				app: config.appKey,
				version: config.reportErrors.version
			})
		);
		window.addEventListener('error', (e) => reportError('unhandled', e.error ?? e.message));
		window.addEventListener('unhandledrejection', (e) => reportError('unhandled', e.reason));
	}

	let started: Promise<void> | undefined;

	/**
	 * Open the local database, then restore any Supabase session (which opens the cloud
	 * database). Safe to call more than once. A failure ends up in `app.fatal`.
	 */
	function init(options: { beforeReady?: (local: DataSet<D>) => Promise<void> } = {}): Promise<void> {
		started ??= (async () => {
			startErrorReporting();
			setStorageFactory(config.storage);
			const db = await openDatabase<D>(`${config.appKey}_local`, config, { storage: config.storage });
			const local = createDataSet('local', db, config);
			await options.beforeReady?.(local).catch((err) => console.error('Startup hook failed', err));
			app.local = local;
			app.ready = true;
			if (config.persistStorage ?? true) void requestPersistence();
			await cloud.init();
		})().catch((err) => {
			console.error(err);
			reportError('fatal', err);
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

	return { config, roles, app, cloud, tombstones, prefs, supabase, ops, init, resetDevice, requestPersistence };
}

export type SyncedStore<D extends DocMap<D>, C extends CollectionName<D> = CollectionName<D>> = ReturnType<
	typeof createSyncedStore<D, C>
>;
