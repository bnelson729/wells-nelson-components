import { createSyncedStore, envConfig, field, flatSchema } from '@wells-nelson/data-storage';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

/**
 * A small project tracker on the real storage layer (IndexedDB via Dexie). Local-only unless
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set in src/sandbox/.env.local and the
 * migration shown on the page has been applied to that Supabase project.
 */
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
	/** An id from another system; copies keep it. */
	external_ref: string;
	done: boolean;
	updated_at: number;
}
/** "from blocks to"; composite id `${from_id}:${to_id}`. */
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
	text: string;
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
		text: field.string,
		mentions: field.string,
		updated_at: field.number
	})
};

export const refs = { task_links: ['from_id', 'to_id'] as ('from_id' | 'to_id')[] };

export const store = createSyncedStore<Docs, 'projects'>({
	appKey: 'sandbox',
	nouns: { singular: 'project', plural: 'projects' },
	env: envConfig(import.meta.env),
	storage: getRxStorageDexie,
	roles: true,
	collections,
	schemas,
	container: 'projects',
	containerField: 'project_id',
	indexContainerField: true,
	refs,
	remap: (collection, row, map) => {
		if (collection === 'task_links') {
			const r = row as TaskLinkDoc;
			return { ...r, id: `${r.from_id}:${r.to_id}` } as typeof row;
		}
		if (collection === 'notes') {
			const r = row as NoteDoc;
			return { ...r, mentions: r.mentions.split(',').filter(Boolean).map(map).join(',') } as typeof row;
		}
		return row;
	}
});
