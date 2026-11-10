/**
 * Generates the Supabase migration for an app's tables: `_deleted` / `_modified` replication
 * columns with their trigger and checkpoint index, `current_email()`, a membership table with
 * an `is_<noun>_member` helper and RLS on every table, the creator-becomes-member trigger, the
 * "touch rows on new share" trigger, the members RPC (active / pending) and the realtime
 * publication. With `roles`, members are viewer / editor / owner and the last owner is protected.
 *
 * Pure string building: no database or Svelte dependency, so it runs from a plain Node script.
 */

export type ColumnType = 'text' | 'number' | 'boolean';

export interface ColumnSpec {
	type: ColumnType;
	/** SQL default expression. Defaults: '' / 0 / false; none for id references. */
	default?: string | null;
}

export interface MigrationTable {
	name: string;
	/** Every column except `id`, `_deleted` and `_modified`, in order. */
	columns: Record<string, ColumnType | ColumnSpec>;
}

export interface MigrationConfig {
	/** First line of the header comment, e.g. "My App: schema for RxDB <-> Supabase replication." */
	title?: string;
	/** The container table, e.g. 'projects'. Must be one of `tables`. */
	container: string;
	/** Column on child tables pointing at the container, e.g. 'project_id'. */
	containerField: string;
	/** Singular noun, e.g. 'project' (names `project_members`, `is_project_member`, `get_project_members`…). */
	noun: string;
	/** All replicated tables, parents first. */
	tables: MigrationTable[];
	roles?: boolean;
	membersTable?: string;
	membersRpc?: string;
	/**
	 * Postgres schema for every table, type and function (default 'public'). Any other schema is
	 * created with the grants Supabase needs; also expose it in the project's Data API settings and
	 * pass the same name as `supabaseSchema` to the store.
	 */
	schema?: string;
}

/** Move everything the migration creates from `public` into `schema` (`auth.*` is untouched). */
function inSchema(sql: string, schema: string) {
	const setup = `-- ---------------------------------------------------------------- schema

create schema if not exists ${schema};

-- The API roles need the same access Supabase grants on public; row level security on every
-- table still decides what each user can read and write.
grant usage on schema ${schema} to anon, authenticated, service_role;
alter default privileges in schema ${schema} grant all on tables to anon, authenticated, service_role;
alter default privileges in schema ${schema} grant all on functions to anon, authenticated, service_role;
alter default privileges in schema ${schema} grant all on sequences to anon, authenticated, service_role;

`;
	return sql
		.replaceAll('public.', `${schema}.`)
		.replaceAll('set search_path = public', `set search_path = ${schema}`)
		.replace('-- ---------------------------------------------------------------- helpers', `${setup}-- ---------------------------------------------------------------- helpers`);
}

const SQL_TYPES: Record<ColumnType, string> = { text: 'text', number: 'double precision', boolean: 'boolean' };
const DEFAULTS: Record<ColumnType, string> = { text: "''", number: '0', boolean: 'false' };

function columnSql(name: string, spec: ColumnType | ColumnSpec) {
	const { type, default: def } = typeof spec === 'string' ? { type: spec, default: undefined } : spec;
	const value = def === undefined ? DEFAULTS[type] : def;
	return `  ${name} ${SQL_TYPES[type]} not null${value === null ? '' : ` default ${value}`}`;
}

/**
 * Turn RxDB flat schemas into migration tables. `refs` fields (and the container field) become
 * `text not null` with no default; `defaults` overrides per column, e.g. `{ tasks: { open: 'true' } }`.
 */
export function tablesFromSchemas(
	collections: readonly string[],
	schemas: Record<string, { properties: Record<string, { type?: unknown }> }>,
	options: { containerField: string; refs?: Record<string, readonly string[] | undefined>; defaults?: Record<string, Record<string, string>> }
): MigrationTable[] {
	return collections.map((name) => {
		const columns: Record<string, ColumnSpec> = {};
		const refs = new Set([options.containerField, ...(options.refs?.[name] ?? [])]);
		for (const [col, prop] of Object.entries(schemas[name].properties)) {
			if (col === 'id') continue;
			const type: ColumnType = prop.type === 'number' ? 'number' : prop.type === 'boolean' ? 'boolean' : 'text';
			const override = options.defaults?.[name]?.[col];
			columns[col] = { type, default: override ?? (refs.has(col) ? null : undefined) };
		}
		return { name, columns };
	});
}

export function generateMigration(config: MigrationConfig): string {
	const { container, containerField: cf, noun, roles = false, schema = 'public' } = config;
	if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error(`Not a valid schema name: "${schema}".`);
	const members = config.membersTable ?? `${noun}_members`;
	const rpc = config.membersRpc ?? `get_${noun}_members`;
	const isMember = `is_${noun}_member`;
	const roleType = `${noun}_role`;
	const children = config.tables.filter((t) => t.name !== container);
	const all = config.tables.map((t) => t.name);
	if (!all.includes(container)) throw new Error(`The container table "${container}" must be in tables.`);
	const list = (names: string[]) => names.map((n) => `'${n}'`).join(',');
	const out: string[] = [];
	const add = (s: string) => out.push(out.length === 0 ? s.replace(/^\n/, '') : s);
	const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

	add(`
-- ${config.title ?? 'Schema for RxDB <-> Supabase replication.'}
--
-- Every replicated table mirrors an RxDB collection 1:1 (same snake_case column names) plus:
--   _deleted   soft-delete flag (rows are never hard-deleted by the app)
--   _modified  server timestamp used as the replication checkpoint (set by trigger)
-- Access is granted per ${noun} through ${members}, matched on the signed-in user's email so a
-- ${noun} can be shared with someone who hasn't signed up yet (a "pending" member).${roles ? '\n-- Roles: viewer < editor < owner.' : ''}

-- ---------------------------------------------------------------- helpers

create or replace function public.set_modified()
returns trigger
language plpgsql
as $$
begin
  new._modified := clock_timestamp();
  return new;
end;
$$;

create or replace function public.current_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- ---------------------------------------------------------------- membership
`);

	if (roles) add(`\ncreate type public.${roleType} as enum ('viewer', 'editor', 'owner');\n`);

	add(`
create table public.${members} (
  id uuid primary key default gen_random_uuid(),
  ${cf} text not null,
  email text not null check (email = lower(email)),${roles ? `\n  role public.${roleType} not null,` : ''}
  invited_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (${cf}, email)
);
create index ${members}_email_idx on public.${members} (email);

-- security definer so policies can call it without recursing into ${members}' own RLS.
create or replace function public.${isMember}(p_${cf} text${roles ? `, p_min_role public.${roleType} default 'viewer'` : ''})
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.${members} m
    where m.${cf} = p_${cf} and m.email = public.current_email()${roles ? ' and m.role >= p_min_role' : ''}
  );
$$;

alter table public.${members} enable row level security;
`);

	if (roles) {
		add(`
create policy "members read members" on public.${members}
  for select to authenticated using (public.${isMember}(${cf}));
create policy "owners invite" on public.${members}
  for insert to authenticated with check (public.${isMember}(${cf}, 'owner'));
create policy "owners change roles" on public.${members}
  for update to authenticated using (public.${isMember}(${cf}, 'owner'));
-- Owners remove anyone; everyone can remove themselves (leave the ${noun}).
create policy "owners remove, members leave" on public.${members}
  for delete to authenticated using (public.${isMember}(${cf}, 'owner') or email = public.current_email());

-- A ${noun} can never end up without an owner.
create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    if not exists (
      select 1 from public.${members}
      where ${cf} = old.${cf} and role = 'owner' and id <> old.id
    ) then
      -- A ${noun} that is itself deleted may drop its last owner.
      if exists (select 1 from public.${container} t where t.id = old.${cf} and not t._deleted) then
        raise exception 'cannot remove the last owner of a ${noun}';
      end if;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger ${members}_keep_owner before update or delete on public.${members}
  for each row execute function public.prevent_last_owner_removal();
`);
	} else {
		add(`
create policy "members read memberships of their ${container}" on public.${members}
  for select to authenticated using (public.${isMember}(${cf}));
create policy "members share their ${container}" on public.${members}
  for insert to authenticated with check (public.${isMember}(${cf}));
create policy "members unshare their ${container}" on public.${members}
  for delete to authenticated using (public.${isMember}(${cf}));
`);
	}

	add(`\n-- ---------------------------------------------------------------- replicated tables\n`);
	for (const table of config.tables) {
		const cols = ['  id text primary key', ...Object.entries(table.columns).map(([n, s]) => columnSql(n, s))];
		cols.push('  _deleted boolean not null default false', '  _modified timestamptz not null default now()');
		add(`\ncreate table public.${table.name} (\n${cols.join(',\n')}\n);\n`);
	}

	const writer = roles ? 'editor' : null;
	add(`
do $$
declare t text;
begin
  foreach t in array array[${list(all)}] loop
    execute format('create index %1$s_modified_idx on public.%1$s (_modified, id)', t);
    execute format(
      'create trigger %1$s_set_modified before insert or update on public.%1$s
         for each row execute function public.set_modified()', t);
    execute format('alter table public.%1$s enable row level security', t);
  end loop;
${
	children.length === 0
		? ''
		: `
  -- ${cap(noun)} data: ${roles ? 'viewers read, editors write' : 'members read and write'}.
  foreach t in array array[${list(children.map((c) => c.name))}] loop
    execute format('create index %1$s_${noun}_idx on public.%1$s (${cf})', t);
    execute format(
      'create policy "members read" on public.%1$s for select to authenticated
         using (public.${isMember}(${cf}))', t);
${
	writer
		? `    execute format(
      'create policy "editors insert" on public.%1$s for insert to authenticated
         with check (public.${isMember}(${cf}, %2$L))', t, '${writer}');
    execute format(
      'create policy "editors update" on public.%1$s for update to authenticated
         using (public.${isMember}(${cf}, %2$L)) with check (public.${isMember}(${cf}, %2$L))', t, '${writer}');`
		: `    execute format(
      'create policy "members insert" on public.%1$s for insert to authenticated
         with check (public.${isMember}(${cf}))', t);
    execute format(
      'create policy "members update" on public.%1$s for update to authenticated
         using (public.${isMember}(${cf})) with check (public.${isMember}(${cf}))', t);`
}
  end loop;
`
}end;
$$;

-- ${cap(container)}: any signed-in user creates one (and becomes ${roles ? 'its owner' : 'a member'}); ${roles ? 'only owners rename / delete' : 'members rename / delete'}.
create policy "members read" on public.${container}
  for select to authenticated using (public.${isMember}(id));
create policy "signed-in users create ${container}" on public.${container}
  for insert to authenticated with check (auth.uid() is not null);
create policy "${roles ? 'owners' : 'members'} update" on public.${container}
  for update to authenticated using (public.${isMember}(id${roles ? ", 'owner'" : ''})) with check (public.${isMember}(id${roles ? ", 'owner'" : ''}));

-- The creator of a ${noun} becomes its first ${roles ? 'owner' : 'member'}.
create or replace function public.add_creator_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_email() <> '' then
    insert into public.${members} (${cf}, email${roles ? ', role' : ''})
    values (new.id, public.current_email()${roles ? ", 'owner'" : ''})
    on conflict (${cf}, email) do nothing;
  end if;
  return new;
end;
$$;

create trigger ${container}_add_creator after insert on public.${container}
  for each row execute function public.add_creator_membership();

-- When a ${noun} is shared with someone, bump _modified on all of its rows so their replication
-- (which only pulls rows newer than its checkpoint) picks the whole ${noun} up.
create or replace function public.touch_${noun}_for_new_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from public.current_email() then
    update public.${container} set _modified = clock_timestamp() where id = new.${cf};
${children.map((c) => `    update public.${c.name} set _modified = clock_timestamp() where ${cf} = new.${cf};`).join('\n')}
  end if;
  return new;
end;
$$;

create trigger ${members}_touch after insert on public.${members}
  for each row execute function public.touch_${noun}_for_new_member();

-- Members of a ${noun}${roles ? ' with their role' : ''}, flagging which emails belong to a registered user
-- ("active") vs pending invites.
create or replace function public.${rpc}(p_${cf} text)
returns table (id uuid, email text, ${roles ? `role public.${roleType}, ` : ''}active boolean)
language sql
stable
security definer
set search_path = public, auth
as $$
  select m.id, m.email, ${roles ? 'm.role, ' : ''}exists (select 1 from auth.users u where lower(u.email) = m.email) as active
  from public.${members} m
  where m.${cf} = p_${cf} and public.${isMember}(p_${cf})
  order by ${roles ? 'm.role desc, ' : ''}m.created_at;
$$;

revoke all on function public.${rpc}(text) from public, anon;
grant execute on function public.${rpc}(text) to authenticated;

-- ---------------------------------------------------------------- realtime

alter publication supabase_realtime
  add table ${all.map((n) => `public.${n}`).join(', ')};
`);

	const sql = out.join('');
	return schema === 'public' ? sql : inSchema(sql, schema);
}
