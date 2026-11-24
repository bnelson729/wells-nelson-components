import type { RxJsonSchema } from 'rxdb/plugins/core';

export type FieldSpec = {
	type: 'string' | 'number' | 'boolean';
	maxLength?: number;
	/** The value rows saved before this field existed get (see `field.added`). */
	default?: string | number | boolean;
};

/** Field shorthands for `flatSchema`. */
export const field = {
	/** The primary key (RxDB needs a maxLength on it). */
	id: { type: 'string', maxLength: 100 },
	string: { type: 'string' },
	number: { type: 'number' },
	boolean: { type: 'boolean' },
	/**
	 * A field added after rows were already saved: `field.added(field.boolean, false)`. Rows on
	 * devices, and rows in backups made before it, get `value`. Bump the schema's `version` in the
	 * same change (and add the column, with the same default, in a Supabase migration).
	 */
	added<S extends FieldSpec>(spec: S, value: string | number | boolean): S & { default: typeof value } {
		return { ...spec, default: value };
	}
} as const;

/**
 * RxDB JSON schema for a flat table: every field required, string `id` primary key.
 *
 * ```ts
 * const projects = flatSchema<ProjectDoc>({ id: field.id, name: field.string, created_at: field.number, updated_at: field.number });
 * ```
 *
 * `version` starts at 0. Adding fields to a table that already has rows on people's devices means
 * bumping it by one and declaring each new field with `field.added(spec, value)`: the database then
 * migrates saved rows on start, filling in the defaults (see `migrationStrategies`).
 */
export function flatSchema<T>(properties: Record<keyof T & string, FieldSpec>, version = 0): RxJsonSchema<T> {
	return {
		version,
		primaryKey: 'id',
		type: 'object',
		properties,
		required: Object.keys(properties)
	} as unknown as RxJsonSchema<T>;
}

/** The defaults of a schema's `field.added` fields. */
export function fieldDefaults(schema: { properties: Record<string, unknown> }): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, prop] of Object.entries(schema.properties)) {
		const value = (prop as FieldSpec).default;
		if (value !== undefined) out[key] = value;
	}
	return out;
}

/**
 * RxDB migration strategies for a `flatSchema`: every version step fills in the fields a row is
 * missing with their `field.added` defaults (and keeps everything else).
 */
export function migrationStrategies(schema: {
	version?: number;
	properties: Record<string, unknown>;
}): Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> {
	const defaults = fieldDefaults(schema);
	const fill = (doc: Record<string, unknown>) => {
		const out = { ...doc };
		for (const [key, value] of Object.entries(defaults)) if (out[key] === undefined) out[key] = value;
		return out;
	};
	return Object.fromEntries(Array.from({ length: schema.version ?? 0 }, (_, i) => [i + 1, fill]));
}
