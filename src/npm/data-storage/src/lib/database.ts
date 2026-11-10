import {
	createRxDatabase,
	type RxCollection,
	type RxConflictHandler,
	type RxDatabase,
	type RxStorage
} from 'rxdb/plugins/core';
import type { CollectionName, DocMap, StoreSchema } from './types.js';

export type Collections<D extends DocMap> = { [N in CollectionName<D>]: RxCollection<D[N]> };
export type Database<D extends DocMap> = RxDatabase<Collections<D>>;

const IGNORED_FIELDS = new Set(['_meta', '_rev', '_attachments']);

export function docsEqual(a: Record<string, unknown>, b: Record<string, unknown>) {
	const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
	for (const key of keys) {
		if (IGNORED_FIELDS.has(key)) continue;
		if (a[key] !== b[key]) return false;
	}
	return true;
}

/**
 * Last write wins: whichever side carries the newer `updated_at` (client clock) is kept.
 * Ties go to the server so every device converges on the same state.
 */
export const lastWriteWins: RxConflictHandler<{ updated_at: number }> = {
	isEqual: (a, b) => docsEqual(a as Record<string, unknown>, b as Record<string, unknown>),
	resolve: async ({ newDocumentState, realMasterState }) =>
		(newDocumentState.updated_at ?? 0) > (realMasterState.updated_at ?? 0) ? newDocumentState : realMasterState
};

export type StorageFactory = () => RxStorage<any, any>;

let storageFactory: StorageFactory = () => {
	throw new Error('No RxDB storage configured. Call setStorageFactory() or pass `storage`.');
};

/** Browser code uses Dexie (IndexedDB); scripts and tests can swap in memory storage. */
export function setStorageFactory(factory: StorageFactory) {
	storageFactory = factory;
}

export interface OpenDatabaseOptions {
	storage?: StorageFactory;
	/** Share the database between tabs (default true). */
	multiInstance?: boolean;
}

/** Create an RxDB database with one collection per schema, all using last-write-wins. */
export async function openDatabase<D extends DocMap>(
	name: string,
	schema: Pick<StoreSchema<D>, 'collections' | 'schemas'>,
	{ storage, multiInstance = true }: OpenDatabaseOptions = {}
): Promise<Database<D>> {
	const db = await createRxDatabase<Collections<D>>({
		name,
		storage: (storage ?? storageFactory)(),
		multiInstance,
		eventReduce: true,
		closeDuplicates: true
	});
	await db.addCollections(
		Object.fromEntries(
			schema.collections.map((n) => [n, { schema: schema.schemas[n], conflictHandler: lastWriteWins }])
		) as any
	);
	return db;
}
