-- One line per table of a site's schema (psql -v schema=<schema>): "<table> <rows>". The Database
-- workflow compares these before and after a test restore. client_errors is left out: it's a
-- log that changes while the backup runs.
select format('select %L || '' '' || count(*) from %I.%I', c.relname, n.nspname, c.relname)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = :'schema' and c.relkind in ('r', 'p') and c.relname <> 'client_errors'
order by c.relname
\gexec
