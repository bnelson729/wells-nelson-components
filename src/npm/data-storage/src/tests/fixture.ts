import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { envConfig } from '../lib/env.js';
import { field, flatSchema } from '../lib/schema.js';
import { createSyncedStore } from '../lib/store.js';

/** A small project tracker, enough to exercise every generic path. */
export interface ProjectDoc {
	id: string;
	name: string;
	created_at: number;
	updated_at: number;
}
export interface TaskDoc {
	id: string;
	project_id: string;
	title: string;
	/** An id from another system; never rewritten. */
	external_ref: string;
	done: boolean;
	updated_at: number;
}
/** "from blocks to". Composite id `${from_id}:${to_id}`. */
export interface TaskLinkDoc {
	id: string;
	project_id: string;
	from_id: string;
	to_id: string;
	updated_at: number;
}
export interface NoteDoc {
	id: string;
	project_id: string;
	seq: number;
	/** Comma-separated task ids. */
	mentions: string;
	updated_at: number;
}
export type Docs = { projects: ProjectDoc; tasks: TaskDoc; task_links: TaskLinkDoc; notes: NoteDoc };

export const collections = ['projects', 'tasks', 'task_links', 'notes'] as const;

export const schemas = {
	projects: flatSchema<ProjectDoc>({
		id: field.id,
		name: field.string,
		created_at: field.number,
		updated_at: field.number
	}),
	tasks: flatSchema<TaskDoc>({
		id: field.id,
		project_id: field.string,
		title: field.string,
		external_ref: field.string,
		done: field.boolean,
		updated_at: field.number
	}),
	task_links: flatSchema<TaskLinkDoc>({
		id: field.id,
		project_id: field.string,
		from_id: field.string,
		to_id: field.string,
		updated_at: field.number
	}),
	notes: flatSchema<NoteDoc>({
		id: field.id,
		project_id: field.string,
		seq: field.number,
		mentions: field.string,
		updated_at: field.number
	})
};

let n = 0;

export function makeStore() {
	return createSyncedStore<Docs, 'projects'>({
		appKey: `t${++n}x${Math.random().toString(36).slice(2, 8)}`,
		nouns: { singular: 'project', plural: 'projects' },
		env: envConfig({}),
		storage: getRxStorageMemory,
		roles: true,
		collections,
		schemas,
		container: 'projects',
		containerField: 'project_id',
		indexContainerField: true,
		refs: { task_links: ['from_id'] },
		remap: (collection, row, map) => {
			if (collection === 'task_links') {
				const r = row as TaskLinkDoc;
				return { ...r, to_id: map(r.to_id), id: `${r.from_id}:${map(r.to_id)}` } as typeof row;
			}
			if (collection === 'notes') {
				const r = row as NoteDoc;
				return { ...r, mentions: r.mentions.split(',').filter(Boolean).map(map).join(',') } as typeof row;
			}
			return row;
		}
	});
}

/** Poll until `fn` returns a truthy value (TanStack DB persists to RxDB asynchronously). */
export async function eventually<T>(fn: () => Promise<T> | T, timeout = 2000): Promise<T> {
	const end = Date.now() + timeout;
	for (;;) {
		const value = await fn();
		if (value) return value;
		if (Date.now() > end) throw new Error('Timed out waiting for condition');
		await new Promise((r) => setTimeout(r, 10));
	}
}
