import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateMigration, schemaMismatches, type MigrationConfig } from '../lib/sql.js';

/** The library's nightly security lint (ops/sql), for a schema. */
const lint = (schema: string) =>
	readFileSync(resolve(process.cwd(), '../../../ops/sql/security-lint.sql'), 'utf8').replaceAll(
		":'schema'",
		`'${schema}'`
	);

const as = async (db: PGlite, uid: string, sql: string) => {
	await db.exec(`set role authenticated; select set_config('test.uid', '${uid}', false);`);
	try {
		return (await db.query(sql)).rows;
	} finally {
		await db.exec('reset role;');
	}
};
const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';

/**
 * The generated SQL runs on an empty database (Postgres 17 in WebAssembly), with the few parts of
 * Supabase it refers to stubbed: roles, `auth.users` / `auth.uid()`, the realtime publication.
 */
async function supabaseLike() {
	const db = new PGlite();
	await db.exec(`
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, last_sign_in_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;
create publication supabase_realtime;
-- Supabase's own defaults for the public schema (other schemas get theirs from the migration).
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`);
	return db;
}

const base: MigrationConfig = {
	container: 'projects',
	containerField: 'project_id',
	noun: 'project',
	tables: [
		{ name: 'projects', columns: { name: 'text', updated_at: 'number' } },
		{
			name: 'tasks',
			columns: { project_id: { type: 'text', default: null }, title: 'text', done: 'boolean', updated_at: 'number' }
		}
	]
};

describe('generated migration on a fresh database', () => {
	for (const [label, config] of [
		['without roles', base],
		['with roles', { ...base, roles: true }],
		['in its own schema', { ...base, roles: true, schema: 'demo_app' }],
		['with only a container table', { ...base, tables: base.tables.slice(0, 1) }],
		['owned by one user', { ...base, ownership: 'user', schema: 'demo_app' }]
	] as const) {
		it(`applies ${label}, and passes the security lint`, async () => {
			const db = await supabaseLike();
			await expect(db.exec(generateMigration(config))).resolves.toBeDefined();
			expect((await db.query(lint((config as MigrationConfig).schema ?? 'public'))).rows).toEqual([]);
			await db.close();
		}, 30_000);
	}

	it('keeps a user-owned container and its rows to that user', async () => {
		const db = await supabaseLike();
		await db.exec(generateMigration({ ...base, ownership: 'user' }));
		await db.exec(
			`insert into auth.users values ('${A}', 'a@example.com', now(), now()), ('${B}', 'b@example.com', now(), now())`
		);
		await as(db, A, `insert into public.projects (id, name) values ('${A}', 'Mine')`);
		await as(db, A, `insert into public.tasks (id, project_id, title) values ('t1', '${A}', 'Draft')`);
		expect(await as(db, A, 'select id from public.tasks')).toEqual([{ id: 't1' }]);
		expect(await as(db, B, 'select id from public.projects')).toEqual([]);
		await expect(as(db, B, `insert into public.projects (id, name) values ('${A}x', 'Not mine')`)).rejects.toThrow();
		await expect(
			as(db, B, `insert into public.tasks (id, project_id, title) values ('t2', '${A}', 'Sneak')`)
		).rejects.toThrow();
		await db.close();
	}, 30_000);

	it('lets a confirmed user create a container and its rows, and keeps others out', async () => {
		const db = await supabaseLike();
		await db.exec(generateMigration({ ...base, roles: true }));
		await db.exec(`insert into auth.users values
			('11111111-1111-1111-1111-111111111111', 'a@example.com', now(), now()),
			('22222222-2222-2222-2222-222222222222', 'b@example.com', now(), now())`);
		await as(db, A, `insert into public.projects (id, name) values ('p1', 'Plan')`);
		await as(db, A, `insert into public.tasks (id, project_id, title) values ('t1', 'p1', 'Draft')`);
		expect(await as(db, A, 'select id from public.tasks')).toEqual([{ id: 't1' }]);
		expect(await as(db, B, 'select id from public.tasks')).toEqual([]);
		await db.close();
	}, 30_000);
});

describe('schemaMismatches', () => {
	const schemas = {
		projects: { properties: { id: { type: 'string' }, name: { type: 'string' }, updated_at: { type: 'number' } } }
	};
	const sql = generateMigration({
		...base,
		tables: [{ name: 'projects', columns: { name: 'text', updated_at: 'number' } }]
	});

	it('is empty when the migrations give each table the RxDB fields', () => {
		expect(schemaMismatches(['projects'], schemas, [sql])).toEqual([]);
	});

	it('follows later migrations and names every difference', () => {
		const later = [
			'alter table public.projects add column if not exists color text;',
			'alter table public.projects drop column name;'
		].join('\n');
		const withDone = { projects: { properties: { ...schemas.projects.properties, done: { type: 'boolean' } } } };
		expect(schemaMismatches(['projects', 'tasks'], { ...withDone, tasks: { properties: {} } }, [sql, later])).toEqual([
			'projects.name: no column in the migrations',
			'projects.done: no column in the migrations',
			'projects.color: column in SQL, no field in RxDB',
			'tasks: no public.tasks table in the migrations'
		]);
	});
});
