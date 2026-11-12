-- Template (@wells-nelson/build-tools): copy to supabase/ops/row-counts.sql and replace __SCHEMA__ with the app's schema.
-- One line per table of the __SCHEMA__ schema: "<table> <rows>". The Database
-- workflow compares these before and after a test restore. client_errors is left out: it's a
-- log that changes while the backup runs. psql only (\gexec); the Supabase SQL editor can't run it.
select format('select %L || '' '' || count(*) from %I.%I', c.relname, n.nspname, c.relname)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = '__SCHEMA__' and c.relkind in ('r', 'p') and c.relname <> 'client_errors'
order by c.relname
\gexec
