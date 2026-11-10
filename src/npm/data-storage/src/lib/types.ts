import type { RxJsonSchema } from 'rxdb/plugins/core';

/**
 * Every synced document is flat (strings, numbers, booleans) because the RxDB Supabase
 * replication maps each field 1:1 onto a Postgres column. `updated_at` (client clock, ms) drives
 * last-write-wins conflict resolution.
 */
export interface DocBase {
	id: string;
	updated_at: number;
}

/** Collection name → document type, e.g. `{ projects: ProjectDoc; tasks: TaskDoc }`. */
export type DocMap = { [name: string]: DocBase };

export type CollectionName<D extends DocMap> = keyof D & string;

/** Where a container lives: only on this device, or replicated to Supabase. */
export type Location = 'local' | 'cloud';

export type Role = 'viewer' | 'editor' | 'owner';

/** Lowercase nouns for the container, e.g. `{ singular: 'project', plural: 'projects' }`. */
export interface Nouns {
	singular: string;
	plural: string;
}

/**
 * The shape of an app's data. A **container** (a project, a list…) owns every other row through
 * `containerField` and is the unit that gets shared, synced and moved between data sets.
 */
export interface StoreSchema<D extends DocMap, C extends CollectionName<D> = CollectionName<D>> {
	/** Every collection, parents before children (the container first). */
	collections: readonly CollectionName<D>[];
	schemas: { [N in CollectionName<D>]: RxJsonSchema<D[N]> };
	/** The container collection, e.g. 'projects'. */
	container: C;
	/** The field on every other collection pointing at its container, e.g. 'project_id'. */
	containerField: string;
	/** Index `containerField` in TanStack DB (worth it when a collection holds thousands of rows). */
	indexContainerField?: boolean;
}

/** The container a document belongs to (containers are their own container). */
export function containerIdOf<D extends DocMap>(
	schema: Pick<StoreSchema<D>, 'container' | 'containerField'>,
	collection: CollectionName<D>,
	doc: object
): string {
	const row = doc as Record<string, unknown>;
	return (collection === schema.container ? row.id : row[schema.containerField]) as string;
}
