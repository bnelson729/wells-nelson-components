-- What a site reported in the last 24 hours (psql -v schema=<schema>), most frequent first:
-- count, kind, newest version, message.
select count(*), kind, max(version), left(replace(message, '|', '/'), 200)
from :"schema".client_errors
where created_at > now() - interval '24 hours'
group by kind, message
order by count(*) desc
limit 25;
