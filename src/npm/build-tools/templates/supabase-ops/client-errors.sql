-- Template (@wells-nelson/build-tools): copy to supabase/ops/client-errors.sql and replace __SCHEMA__ with the app's schema.
-- What the app reported in the last 24 hours, most frequent first:
-- count, kind, newest version, message.
select count(*), kind, max(version), left(replace(message, '|', '/'), 200)
from __SCHEMA__.client_errors
where created_at > now() - interval '24 hours'
group by kind, message
order by count(*) desc
limit 25;
