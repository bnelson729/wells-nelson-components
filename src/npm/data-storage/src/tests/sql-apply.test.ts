import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { generateMigration, type MigrationConfig } from '../lib/sql.js';

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
		{ name: 'tasks', columns: { project_id: { type: 'text', default: null }, title: 'text', done: 'boolean', updated_at: 'number' } }
	]
};

describe('generated migration on a fresh database', () => {
	for (const [label, config] of [
		['without roles', base],
		['with roles', { ...base, roles: true }],
		['in its own schema', { ...base, roles: true, schema: 'demo_app' }],
		['with only a container table', { ...base, tables: base.tables.slice(0, 1) }]
	] as const) {
		it(`applies ${label}`, async () => {
			const db = await supabaseLike();
			await expect(db.exec(generateMigration(config))).resolves.toBeDefined();
			await db.close();
		}, 30_000);
	}

	it('lets a confirmed user create a container and its rows, and keeps others out', async () => {
		const db = await supabaseLike();
		await db.exec(generateMigration({ ...base, roles: true }));
		await db.exec(`insert into auth.users values
			('11111111-1111-1111-1111-111111111111', 'a@example.com', now(), now()),
			('22222222-2222-2222-2222-222222222222', 'b@example.com', now(), now())`);
		const as = async (uid: string, sql: string) => {
			await db.exec(`set role authenticated; select set_config('test.uid', '${uid}', false);`);
			try {
				return (await db.query(sql)).rows;
			} finally {
				await db.exec(`reset role;`);
			}
		};
		await as('11111111-1111-1111-1111-111111111111', `insert into public.projects (id, name) values ('p1', 'Plan')`);
		await as('11111111-1111-1111-1111-111111111111', `insert into public.tasks (id, project_id, title) values ('t1', 'p1', 'Draft')`);
		expect(await as('11111111-1111-1111-1111-111111111111', 'select id from public.tasks')).toEqual([{ id: 't1' }]);
		expect(await as('22222222-2222-2222-2222-222222222222', 'select id from public.tasks')).toEqual([]);
		await db.close();
	}, 30_000);
});
