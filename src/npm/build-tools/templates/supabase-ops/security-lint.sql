-- Template (@wells-nelson/build-tools): copy to supabase/ops/security-lint.sql and replace __SCHEMA__ with the app's schema.
-- Prints one line per problem in the __SCHEMA__ schema; no output means it passed. Runs in the
-- Supabase SQL editor or with psql -f.
-- Run by the Database workflow every night, and worth running after applying a migration.

-- Every table has row level security.
select format('Table %I.%I has no row level security', n.nspname, c.relname)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = '__SCHEMA__' and c.relkind in ('r', 'p') and not c.relrowsecurity

union all

-- Signed-out callers (anon) can't touch any table.
select format('anon has %s on table %I.%I', p.privilege, n.nspname, c.relname)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as p(privilege)
where n.nspname = '__SCHEMA__' and c.relkind in ('r', 'p', 'v') and has_table_privilege('anon', c.oid, p.privilege)

union all

-- ... nor call any function but report_client_error (trigger functions can't be called).
select format('anon can execute %s', p.oid::regprocedure)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = '__SCHEMA__'
  and p.prorettype <> 'trigger'::regtype
  and p.proname <> 'report_client_error'
  and has_function_privilege('anon', p.oid, 'EXECUTE')

union all

-- Security definer functions pin their search_path.
select format('Security definer function %s has no search_path', p.oid::regprocedure)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = '__SCHEMA__'
  and p.prosecdef
  and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) as c(setting) where c.setting like 'search_path=%');
