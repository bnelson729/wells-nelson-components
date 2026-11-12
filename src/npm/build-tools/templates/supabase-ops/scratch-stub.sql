-- Template (@wells-nelson/build-tools): copy to supabase/ops/scratch-stub.sql and replace __SCHEMA__ with the app's schema.
-- The parts of a Supabase database that the app's schema refers to, so its backup can be
-- restored into a plain Postgres (the Database workflow's restore test, or a local check).
-- Not for a Supabase project: those have all of this already.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create role supabase_admin nologin;

create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;

create publication supabase_realtime;
