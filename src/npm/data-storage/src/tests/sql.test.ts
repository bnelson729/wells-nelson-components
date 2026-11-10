import { describe, expect, it } from 'vitest';
import { generateMigration, tablesFromSchemas, type MigrationConfig } from '../lib/sql.js';
import { collections, schemas } from './fixture.js';

/** Roles variant: projects with viewer / editor / owner members. */
const projectsConfig: MigrationConfig = {
	title: 'Demo projects: schema for RxDB <-> Supabase replication.',
	container: 'projects',
	containerField: 'project_id',
	noun: 'project',
	roles: true,
	tables: [
		{ name: 'projects', columns: { name: 'text', created_at: 'number', updated_at: 'number' } },
		{
			name: 'tasks',
			columns: {
				project_id: { type: 'text', default: null },
				title: 'text',
				external_ref: 'text',
				open: { type: 'boolean', default: 'true' },
				priority: { type: 'number', default: '3' },
				updated_at: 'number'
			}
		},
		{
			name: 'task_links',
			columns: {
				project_id: { type: 'text', default: null },
				from_id: { type: 'text', default: null },
				to_id: { type: 'text', default: null },
				updated_at: 'number'
			}
		}
	]
};

/** Flat-sharing variant: every member can do everything; custom RPC name. */
const listsConfig: MigrationConfig = {
	title: 'Demo lists: schema for RxDB <-> Supabase replication.',
	container: 'lists',
	containerField: 'list_id',
	noun: 'list',
	membersRpc: 'get_list_collaborators',
	tables: [
		{ name: 'lists', columns: { name: 'text', created_at: 'number', updated_at: 'number' } },
		{
			name: 'entries',
			columns: { list_id: { type: 'text', default: null }, name: 'text', checked: { type: 'boolean', default: 'true' }, updated_at: 'number' }
		}
	]
};

describe('generateMigration', () => {
	it('builds the roles variant', () => {
		const sql = generateMigration(projectsConfig);
		expect(sql.startsWith('-- Demo projects: schema for RxDB <-> Supabase replication.\n')).toBe(true);
		expect(sql).toContain("create type public.project_role as enum ('viewer', 'editor', 'owner');");
		expect(sql).toContain('create table public.project_members (');
		expect(sql).toContain("p_min_role public.project_role default 'viewer'");
		expect(sql).toContain("raise exception 'cannot remove the last owner of a project';");
		expect(sql).toContain('  open boolean not null default true,');
		expect(sql).toContain('  project_id text not null,');
		expect(sql).toContain("  external_ref text not null default '',");
		expect(sql).toContain(`'create policy "editors insert" on public.%1$s`);
		expect(sql).toContain('create or replace function public.get_project_members(p_project_id text)');
		expect(sql).toContain('returns table (id uuid, email text, role public.project_role, active boolean)');
		expect(sql).toContain('    update public.task_links set _modified = clock_timestamp() where project_id = new.project_id;');
		expect(sql).toContain('  add table public.projects, public.tasks, public.task_links;');
		// Sections are separated by blank lines.
		expect(sql).toContain('$$;\n\n-- ---------------------------------------------------------------- membership');
	});

	it('builds the flat-sharing variant', () => {
		const sql = generateMigration(listsConfig);
		expect(sql).not.toContain('role');
		expect(sql).toContain('create or replace function public.is_list_member(p_list_id text)');
		expect(sql).toContain('create policy "members unshare their lists" on public.list_members');
		expect(sql).toContain(`'create policy "members insert" on public.%1$s`);
		expect(sql).toContain('create or replace function public.get_list_collaborators(p_list_id text)');
		expect(sql).toContain('  order by m.created_at;');
	});

	it('builds into a custom schema, leaving auth and the PUBLIC role alone', () => {
		const sql = generateMigration({ ...listsConfig, schema: 'demo_lists' });
		expect(sql).toContain('create schema if not exists demo_lists;');
		expect(sql).toContain('grant usage on schema demo_lists to anon, authenticated, service_role;');
		expect(sql).toContain('alter default privileges in schema demo_lists grant all on tables to anon, authenticated, service_role;');
		// Default privileges are set before the first table exists.
		expect(sql.indexOf('alter default privileges')).toBeLessThan(sql.indexOf('create table'));
		expect(sql).toContain('create table demo_lists.lists (');
		expect(sql).toContain('create or replace function demo_lists.current_email()');
		expect(sql).toContain('set search_path = demo_lists\n');
		expect(sql).toContain('set search_path = demo_lists, auth\n');
		expect(sql).toContain('exists (select 1 from auth.users u where lower(u.email) = m.email)');
		expect(sql).toContain('revoke all on function demo_lists.get_list_collaborators(text) from public, anon;');
		expect(sql).toContain('  add table demo_lists.lists, demo_lists.entries;');
		expect(sql).not.toMatch(/public\./);
	});

	it('is unchanged for an explicit public schema', () => {
		expect(generateMigration({ ...projectsConfig, schema: 'public' })).toBe(generateMigration(projectsConfig));
	});

	it('rejects unsafe schema names', () => {
		expect(() => generateMigration({ ...listsConfig, schema: 'x; drop table y' })).toThrow(/schema name/);
	});

	it('requires the container among the tables', () => {
		expect(() => generateMigration({ ...listsConfig, container: 'nope' })).toThrow(/container table/);
	});
});

describe('tablesFromSchemas', () => {
	it('maps RxDB types to columns, refs without defaults', () => {
		const tables = tablesFromSchemas(collections, schemas as never, {
			containerField: 'project_id',
			refs: { task_links: ['from_id', 'to_id'] },
			defaults: { tasks: { done: 'false' } }
		});
		const tasks = tables.find((t) => t.name === 'tasks')!;
		expect(tasks.columns).toEqual({
			project_id: { type: 'text', default: null },
			title: { type: 'text', default: undefined },
			external_ref: { type: 'text', default: undefined },
			done: { type: 'boolean', default: 'false' },
			updated_at: { type: 'number', default: undefined }
		});
		const sql = generateMigration({ container: 'projects', containerField: 'project_id', noun: 'project', tables });
		expect(sql).toContain('  from_id text not null,');
		expect(sql).toContain('  seq double precision not null default 0,');
	});
});
