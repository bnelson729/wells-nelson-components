import type { RxJsonSchema } from 'rxdb/plugins/core';

/** Field shorthands for `flatSchema`. */
export const field = {
	/** The primary key (RxDB needs a maxLength on it). */
	id: { type: 'string', maxLength: 100 },
	string: { type: 'string' },
	number: { type: 'number' },
	boolean: { type: 'boolean' }
} as const;

export type FieldSpec = { type: 'string' | 'number' | 'boolean'; maxLength?: number };

/**
 * RxDB JSON schema for a flat table: every field required, string `id` primary key, version 0.
 *
 * ```ts
 * const projects = flatSchema<ProjectDoc>({ id: field.id, name: field.string, created_at: field.number, updated_at: field.number });
 * ```
 */
export function flatSchema<T>(properties: Record<keyof T & string, FieldSpec>): RxJsonSchema<T> {
	return {
		version: 0,
		primaryKey: 'id',
		type: 'object',
		properties,
		required: Object.keys(properties)
	} as unknown as RxJsonSchema<T>;
}
