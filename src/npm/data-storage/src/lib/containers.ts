import type { RxCollection } from 'rxdb/plugins/core';
import type { AppState } from './app.svelte.js';
import type { CloudSync } from './cloud.svelte.js';
import type { DataSet } from './dataset.js';
import { writeFailed } from './errors.js';
import type { DevicePrefs } from './prefs.svelte.js';
import type { Member, SupabaseApi } from './supabase.js';
import type { Tombstones } from './tombstones.svelte.js';
import type { CollectionName, DocMap, Location, Role, StoreSchema } from './types.js';

/** Every row of one container, by collection. */
export type ContainerDocs<D extends DocMap> = { [N in CollectionName<D>]: D[N][] };

/**
 * App-specific id references a copy has to rewrite, beyond `id`, the container field and the
 * `refs` fields: composite ids and ids inside text fields. `map` turns an old id into the copy's
 * id (the identity when ids are kept).
 */
export type RemapHook<D extends DocMap> = <N extends CollectionName<D>>(
	collection: N,
	row: D[N],
	map: (id: string) => string
) => D[N];

export interface ContainerOpsOptions<D extends DocMap, C extends CollectionName<D> = CollectionName<D>> {
	schema: StoreSchema<D, C>;
	app: AppState<D>;
	cloud: CloudSync<D>;
	tombstones: Tombstones;
	prefs: DevicePrefs;
	supabase: SupabaseApi;
	roles?: boolean;
	/** Fields per collection holding ids of other rows in the same container, e.g. `{ items: ['category_id'] }`. */
	refs?: { [N in CollectionName<D>]?: (keyof D[N] & string)[] };
	remap?: RemapHook<D>;
	/** The store's appKey, written into exports and checked on import. */
	appKey?: string;
}

/** A container as listed by the app (one entry even while it moves between data sets). */
export interface ContainerEntry<T> {
	container: T;
	location: Location;
	role: Role;
}

/**
 * Persisting a TanStack DB transaction in the background. A failure is reported and shown
 * (`app.writeError` through the store), not just logged.
 */
export function persist(tx: { when(state: 'settled'): Promise<unknown> }) {
	tx.when('settled').catch(writeFailed);
}

/** The file format of `exportContainers`. */
export interface ContainerExport {
	format: 'wells-nelson-containers';
	version: 1;
	/** The store's appKey: a file only imports into the app that wrote it. */
	app: string;
	exportedAt: string;
	/** One entry per container: every row of it, by collection. */
	containers: Record<string, Record<string, unknown>[]>[];
}

export const now = () => Date.now();
export const uid = () => crypto.randomUUID();

export type ContainerOps<D extends DocMap, C extends CollectionName<D> = CollectionName<D>> = ReturnType<
	typeof createContainerOps<D, C>
>;

/**
 * Operations on whole containers and the low-level row helpers they're built from. Every write
 * to a cloud data set marks the container pending so the profile can show unsynced changes.
 */
export function createContainerOps<D extends DocMap, C extends CollectionName<D> = CollectionName<D>>(
	options: ContainerOpsOptions<D, C>
) {
	const { schema, app, cloud, tombstones, prefs, supabase, remap } = options;
	const refs = (options.refs ?? {}) as Record<string, string[] | undefined>;
	const roles = options.roles ?? false;
	const { container, containerField, collections } = schema;

	function rx<N extends CollectionName<D>>(ds: DataSet<D>, name: N) {
		return ds.db.collections[name] as unknown as RxCollection<D[N]>;
	}

	/** Record that a container changed (only cloud data sets track pending changes). */
	function touch(ds: DataSet<D>, containerId: string) {
		if (ds.location === 'cloud') cloud.markPending(containerId);
	}

	/** Delete documents. `updated_at` is bumped first so the deletion wins last-write-wins conflicts. */
	async function removeDocs<N extends CollectionName<D>>(ds: DataSet<D>, name: N, ids: string[]) {
		if (ids.length === 0) return;
		// Gone from the UI right away, and stays gone if a sync briefly brings an old copy back.
		tombstones.hide(ds.location, ids);
		const coll = rx(ds, name);
		const found = await coll.findByIds(ids).exec();
		if (found.size === 0) return;
		const t = now();
		await coll.bulkUpsert([...found.values()].map((d) => ({ ...d.toMutableJSON(), updated_at: t }) as any));
		await coll.bulkRemove([...found.keys()]);
	}

	async function docsWhere<N extends CollectionName<D>>(
		ds: DataSet<D>,
		name: N,
		selector: Partial<Record<keyof D[N] & string, string | number | boolean>>
	): Promise<D[N][]> {
		const docs = await rx(ds, name)
			.find({ selector: selector as any })
			.exec();
		return docs.map((d) => d.toMutableJSON() as D[N]);
	}

	/** Insert one row through TanStack DB (optimistic) and mark its container changed. */
	function insertDoc<N extends CollectionName<D>>(ds: DataSet<D>, name: N, doc: D[N], containerId: string) {
		const coll = ds[name] as unknown as { insert(doc: D[N]): { when(s: 'settled'): Promise<unknown> } };
		persist(coll.insert(doc));
		touch(ds, containerId);
	}

	/** Update fields of one row through TanStack DB, bumping `updated_at`. */
	function patch<N extends CollectionName<D>>(
		ds: DataSet<D>,
		name: N,
		id: string,
		containerId: string,
		fields: Partial<D[N]>
	) {
		const coll = ds[name] as unknown as {
			update(id: string, cb: (d: D[N]) => void): { when(s: 'settled'): Promise<unknown> };
		};
		persist(
			coll.update(id, (d) => {
				Object.assign(d, fields);
				d.updated_at = now();
			})
		);
		touch(ds, containerId);
	}

	// ---------------------------------------------------------------- containers

	/** Create a container (`id`, `updated_at` and, when the schema has it, `created_at` are filled in). */
	function createContainer(ds: DataSet<D>, fields: Omit<D[C], 'id' | 'updated_at' | 'created_at'>): string {
		const id = uid();
		const t = now();
		const hasCreatedAt = 'created_at' in ((schema.schemas[container] as { properties: object }).properties ?? {});
		const doc = { ...fields, id, updated_at: t, ...(hasCreatedAt ? { created_at: t } : {}) } as unknown as D[C];
		insertDoc(ds, container, doc, id);
		if (ds.location === 'cloud') cloud.setRole(id, 'owner');
		return id;
	}

	function renameContainer(ds: DataSet<D>, containerId: string, name: string) {
		patch(ds, container, containerId, containerId, { name } as unknown as Partial<D[C]>);
	}

	async function readContainer(ds: DataSet<D>, containerId: string): Promise<ContainerDocs<D>> {
		const out = {} as ContainerDocs<D>;
		for (const name of collections) {
			(out as Record<string, unknown[]>)[name] =
				name === container
					? await docsWhere(ds, name, { id: containerId } as never)
					: await docsWhere(ds, name, { [containerField]: containerId } as never);
		}
		return out;
	}

	async function removeContainerDocs(ds: DataSet<D>, containerId: string) {
		const docs = await readContainer(ds, containerId);
		// Children first, the container row last.
		for (const name of [...collections].reverse()) {
			await removeDocs(
				ds,
				name,
				docs[name].map((d) => d.id)
			);
		}
	}

	/** Insert a whole container (all collections) into a data set, parents first. Used for copies and seeds. */
	async function insertContainerDocs(to: DataSet<D>, docs: Partial<ContainerDocs<D>>) {
		for (const name of collections) {
			const rows = docs[name] ?? [];
			if (rows.length === 0) continue;
			const result = await rx(to, name).bulkUpsert(rows as never[]);
			if (result.error.length) throw new Error(`Saving ${name} failed`);
		}
	}

	/**
	 * Copy rows to a new container id, regenerating every id when `newIds` (so the copy is
	 * independent), and giving all rows a fresh `updated_at` so they beat any older (e.g.
	 * soft-deleted) server copy under last-write-wins. Pure; exported for testing.
	 */
	function remapContainer(docs: ContainerDocs<D>, containerId: string, newIds: boolean) {
		const ids = new Map<string, string>();
		const map = (id: string) => {
			if (!newIds || !id) return id;
			let next = ids.get(id);
			if (!next) ids.set(id, (next = uid()));
			return next;
		};
		const t = now();
		const cid = map(containerId);
		const rows = {} as ContainerDocs<D>;
		for (const name of collections) {
			const refFields = refs[name] ?? [];
			(rows as Record<string, unknown[]>)[name] = docs[name].map((d) => {
				const row: Record<string, unknown> = { ...(d as object), id: name === container ? cid : map(d.id), updated_at: t };
				if (name !== container) row[containerField] = cid;
				for (const f of refFields) row[f] = map(row[f] as string);
				return remap ? remap(name, row as unknown as D[typeof name], map) : row;
			});
		}
		return { rows, containerId: cid };
	}

	async function copyContainer(from: DataSet<D>, to: DataSet<D>, containerId: string, newIds: boolean) {
		const { rows, containerId: cid } = remapContainer(await readContainer(from, containerId), containerId, newIds);
		if (to.location === 'cloud') {
			cloud.markPending(cid);
			cloud.setRole(cid, 'owner');
		}
		// Rows deliberately written again (e.g. a container moved back here) must not stay hidden.
		for (const name of collections) tombstones.unhide(to.location, rows[name].map((r) => r.id));
		await insertContainerDocs(to, rows);
		return cid;
	}

	/**
	 * Every row of the given containers as one JSON-ready object (a backup the user keeps). Each
	 * container is read from the data set it lives in.
	 */
	async function exportContainers(items: { id: string; location: Location }[]): Promise<ContainerExport> {
		const containers: ContainerExport['containers'] = [];
		for (const { id, location } of items) {
			const docs = await readContainer(app.dataSet(location), id);
			if (docs[container].length === 0) continue;
			containers.push(docs as unknown as Record<string, Record<string, unknown>[]>);
		}
		return {
			format: 'wells-nelson-containers',
			version: 1,
			app: options.appKey ?? '',
			exportedAt: new Date().toISOString(),
			containers
		};
	}

	/** Keep only the schema's fields, and only with the schema's types; anything else is not a backup. */
	function cleanRow(name: CollectionName<D>, row: unknown): Record<string, unknown> {
		const props = (schema.schemas[name] as { properties: Record<string, { type?: unknown }> }).properties;
		if (!row || typeof row !== 'object') throw new Error('This file is not a backup of this app.');
		const out: Record<string, unknown> = {};
		for (const [key, prop] of Object.entries(props)) {
			const value = (row as Record<string, unknown>)[key];
			const type = prop.type === 'number' ? 'number' : prop.type === 'boolean' ? 'boolean' : 'string';
			if (typeof value !== type || (type === 'number' && !Number.isFinite(value))) {
				throw new Error(`This backup has an invalid ${name} row (${key}).`);
			}
			out[key] = value;
		}
		return out;
	}

	/**
	 * Add every container of an `exportContainers` file to this device as new local-only
	 * containers (fresh ids, so importing twice makes two copies and nothing is overwritten).
	 * Returns the new container ids.
	 */
	async function importContainers(data: unknown): Promise<string[]> {
		const file = data as Partial<ContainerExport> | null;
		if (!file || file.format !== 'wells-nelson-containers' || !Array.isArray(file.containers)) {
			throw new Error('This file is not a backup of this app.');
		}
		if (file.version !== 1) throw new Error('This backup was made by a newer version of the app. Update the app first.');
		if (options.appKey && file.app !== options.appKey) throw new Error('This backup is from a different app.');
		// Check everything before writing anything.
		const parsed = file.containers.map((entry) => {
			const docs = {} as ContainerDocs<D>;
			for (const name of collections) {
				const rows = (entry as Record<string, unknown>)[name] ?? [];
				if (!Array.isArray(rows)) throw new Error('This file is not a backup of this app.');
				(docs as Record<string, unknown[]>)[name] = rows.map((r) => cleanRow(name, r));
			}
			const head = docs[container][0];
			if (docs[container].length !== 1 || !head) throw new Error('This file is not a backup of this app.');
			return { docs, id: head.id };
		});
		const local = app.dataSet('local');
		const ids: string[] = [];
		for (const { docs, id } of parsed) {
			const { rows, containerId } = remapContainer(docs, id, true);
			await insertContainerDocs(local, rows);
			prefs.markPrompted([containerId]);
			ids.push(containerId);
		}
		return ids;
	}

	/** Remove a cloud container from this device only; nothing is deleted on Supabase. */
	async function purgeCloudContainer(containerId: string) {
		const ds = app.dataSet('cloud');
		cloud.block(containerId);
		await removeContainerDocs(ds, containerId);
	}

	function requireOnline() {
		if (!cloud.online) throw new Error('This needs an internet connection. Try again once you are back online.');
	}

	async function otherMembers(containerId: string): Promise<Member[]> {
		requireOnline();
		const members = await supabase.fetchMembers(containerId);
		return members.filter((m) => m.email !== cloud.email);
	}

	const isOwner = (m: Member) => !roles || m.role === 'owner';

	/** local-only -> cloud-enabled. Same ids; uploads (or queues the upload when offline). */
	async function makeCloud(containerId: string) {
		const local = app.dataSet('local');
		await copyContainer(local, app.dataSet('cloud'), containerId, false);
		await removeContainerDocs(local, containerId);
	}

	/**
	 * cloud-enabled -> local-only. Unshared containers are deleted from Supabase and kept here
	 * with the same ids. Shared ones stay on Supabase for the others; we keep a copy under new
	 * ids and leave. Returns the id of the local container.
	 */
	async function makeLocal(containerId: string): Promise<string> {
		const cloudDs = app.dataSet('cloud');
		const local = app.dataSet('local');
		const others = await otherMembers(containerId);
		if (others.length === 0) {
			await copyContainer(cloudDs, local, containerId, false);
			await removeContainerDocs(cloudDs, containerId);
			prefs.markPrompted([containerId]);
			return containerId;
		}
		// Copy before leaving: if leaving fails the worst case is an extra local copy, not lost data.
		const newId = await copyContainer(cloudDs, local, containerId, true);
		await supabase.leave(containerId, cloud.email);
		await purgeCloudContainer(containerId);
		prefs.markPrompted([newId]);
		prefs.replaceContainer(containerId, newId);
		return newId;
	}

	/**
	 * Delete a container. For a cloud container we only leave it while other owners remain
	 * (without roles: while it's shared with anyone); otherwise it's deleted for everyone.
	 */
	async function deleteContainer(ds: DataSet<D>, containerId: string) {
		// Hide it immediately so it never flashes back while the delete runs.
		tombstones.hide(ds.location, [containerId]);
		try {
			if (ds.location === 'local') {
				await removeContainerDocs(ds, containerId);
			} else {
				const others = await otherMembers(containerId);
				if (others.some(isOwner)) {
					await supabase.leave(containerId, cloud.email);
					await purgeCloudContainer(containerId);
				} else {
					await removeContainerDocs(ds, containerId);
				}
			}
		} catch (err) {
			tombstones.unhide(ds.location, [containerId]);
			throw err;
		}
		prefs.replaceContainer(containerId, null);
	}

	/** Leave a shared container (non-owners, or owners while other owners remain). */
	async function leaveContainer(containerId: string) {
		requireOnline();
		tombstones.hide('cloud', [containerId]);
		try {
			await supabase.leave(containerId, cloud.email);
		} catch (err) {
			tombstones.unhide('cloud', [containerId]);
			throw err;
		}
		await purgeCloudContainer(containerId);
		prefs.replaceContainer(containerId, null);
	}

	/** For a container we were removed from: keep a local-only copy (new ids), drop the cloud copy. */
	async function keepRevokedCopy(containerId: string): Promise<string> {
		const newId = await copyContainer(app.dataSet('cloud'), app.dataSet('local'), containerId, true);
		await purgeCloudContainer(containerId);
		prefs.markPrompted([newId]);
		prefs.replaceContainer(containerId, newId);
		return newId;
	}

	async function removeRevoked(containerId: string) {
		await purgeCloudContainer(containerId);
		prefs.replaceContainer(containerId, null);
	}

	/**
	 * Merge the local and cloud containers for display: hidden (deleted) ones dropped, and one
	 * entry per id while a container moves between data sets (the cloud copy wins).
	 */
	function entries(localRows: D[C][], cloudRows: D[C][]): ContainerEntry<D[C]>[] {
		const byId = new Map<string, ContainerEntry<D[C]>>();
		for (const row of localRows) {
			if (!tombstones.has('local', row.id)) byId.set(row.id, { container: row, location: 'local', role: 'owner' });
		}
		for (const row of cloudRows) {
			if (!tombstones.has('cloud', row.id)) {
				byId.set(row.id, { container: row, location: 'cloud', role: cloud.roleOf(row.id) });
			}
		}
		return [...byId.values()];
	}

	return {
		rx,
		touch,
		removeDocs,
		docsWhere,
		insertDoc,
		patch,
		createContainer,
		renameContainer,
		readContainer,
		removeContainerDocs,
		insertContainerDocs,
		remapContainer,
		copyContainer,
		exportContainers,
		importContainers,
		makeCloud,
		makeLocal,
		deleteContainer,
		leaveContainer,
		keepRevokedCopy,
		removeRevoked,
		entries
	};
}
