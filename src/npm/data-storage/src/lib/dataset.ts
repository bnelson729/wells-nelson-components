import { BasicIndex, createCollection } from '@tanstack/db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';
import type { RxCollection } from 'rxdb/plugins/core';
import type { Database } from './database.js';
import type { CollectionName, DocMap, Location, StoreSchema } from './types.js';

function makeCollection<T extends object>(id: string, rxCollection: RxCollection<T>) {
	return createCollection(
		rxdbCollectionOptions<T>({
			id,
			rxCollection: rxCollection as RxCollection<T, unknown, unknown, unknown>,
			startSync: true,
			gcTime: 0
		})
	);
}

export type TSCollection<T extends object> = ReturnType<typeof makeCollection<T>>;

/**
 * One RxDB database plus a TanStack DB collection on top of each RxDB collection.
 * Components query the TanStack collections; bulk operations go straight to RxDB.
 */
export type DataSet<D extends DocMap<D>> = {
	location: Location;
	db: Database<D>;
} & { [N in CollectionName<D>]: TSCollection<D[N]> };

export function createDataSet<D extends DocMap<D>>(
	location: Location,
	db: Database<D>,
	schema: Pick<StoreSchema<D>, 'collections' | 'container' | 'containerField' | 'indexContainerField'>
): DataSet<D> {
	const ds: Record<string, unknown> = { location, db };
	for (const name of schema.collections) {
		const coll = makeCollection(`${db.name}-${name}`, db.collections[name] as RxCollection<any>);
		// Container pages filter by container; index it when collections get big.
		if (schema.indexContainerField && name !== schema.container) {
			coll.createIndex((row: any) => row[schema.containerField], { indexType: BasicIndex });
		}
		ds[name] = coll;
	}
	return ds as DataSet<D>;
}

export async function disposeDataSet<D extends DocMap<D>>(ds: DataSet<D>, collections: readonly CollectionName<D>[]) {
	await Promise.all(collections.map((n) => (ds[n] as unknown as { cleanup(): Promise<void> }).cleanup()));
}
