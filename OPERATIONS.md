# Operations runbook for sites on this framework

The parts of running a site that are the same for every site: the shared workflows, repository
settings, the database (migrations, the nightly checks, backups and restores, client errors) and
deploys. Each site's CONTRIBUTING.md links here and adds what's its own: its schema name, ports, and
product-specific Supabase settings. Below, `<schema>` is the site's Postgres schema and `<repo>` its
repository name.

## The shared workflows

A site's `.github/workflows/` only sets triggers and permissions; the steps live in this repository's
reusable workflows, called at `@v1` (see the README's "Reusable workflows"):

| Site workflow | Runs | What it does |
| --- | --- | --- |
| `ci.yml` | every pull request | No local tarball dependencies; type-check, lint, format check, unit tests, build. The required check is **ci / Check, test and build**. |
| `deploy.yml` | every push to `main` | Reserves the next `v*` tag, checks and builds, deploys to GitHub Pages, records a GitHub release. |
| `database.yml` | nightly, or by hand | Backup with a restore test, keep-alive, security lint, client error digest (below). |
| `published-packages.yml` | pull requests that change package files | Swaps local package tarballs for the published versions, commits, and runs CI again. |

## Repository settings

- **Branch protection on `main`** (Settings → Branches): require a pull request before merging, and the
  **ci / Check, test and build** status check. Allow squash merging.
- **Pages** (Settings → Pages): Source **GitHub Actions**.
- **Actions variables:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `BASE_PATH` only for a custom domain.
- **Environment `database`** (Settings → Environments), limited to `main`: the variable `SUPABASE_DB_URL` and the
  secret `SUPABASE_DB_PASSWORD` ([below](#the-database-environment)).

The Supabase anon/publishable key is designed to be public: row-level security decides who can read and
write what.

## Migrations

`supabase/migrations/` holds the site's schema as numbered files, applied in order. The first one comes
from `generateMigration` in `@wells-nelson/data-storage/sql` (see ONBOARDING.md), with any of the site's
own rules added at the end. A file that has been applied is never edited; changes go in the next file
(`0002_<what>.sql`):

- Write it so it can run twice (`create … if not exists`, `drop policy if exists` before `create policy`,
  `create or replace function`) and wrap it in `begin; … commit;`.
- Keep the deployed site working: add columns with defaults, and only drop what no deployed version uses.
- A new column goes in the migration (`alter table <schema>.<table> add column if not exists …`) and in the
  RxDB schema in the same pull request; the site's `schema.test.ts` fails until both have it.
- When a library release changes the generated SQL, carry the difference over into a new migration (the
  package's CHANGELOG says what changed).
- Apply it in the Supabase **SQL Editor**, then run the Database workflow by hand (**Actions → Database → Run
  workflow**): its security lint checks the result.

## The nightly Database workflow

Two jobs, for the site's schema, using SQL from this repository's [`ops/sql/`](ops/sql):

- **backup:** `pg_dump` of the schema, restored into a scratch Postgres to prove it restores (the row counts
  must land between the counts taken before and after the dump), then encrypted with the database password
  and kept as the `<schema>-backup` artifact for 30 days.
- **checks:** a request to the project so a free-plan project isn't paused after a quiet week; the
  [security lint](ops/sql/security-lint.sql) (a table without row-level security, anything signed-out callers
  can reach other than `report_client_error`, a security-definer function without a fixed `search_path`);
  and the [client errors](ops/sql/client-errors.sql) of the last 24 hours. Lint problems and client errors
  fail the run, so GitHub emails you; the run's summary lists them.

### The database environment

In **Settings → Environments → New environment**, create `database`, then:

1. **Deployment branches and tags:** choose **Selected branches and tags** and add `main`, so runs from other
   branches can't read its secrets.
2. **Environment variables:** `SUPABASE_DB_URL`, the connection string **without** the password (below).
3. **Environment secrets:** `SUPABASE_DB_PASSWORD`, the database password: the one set when the project was
   created, not your Supabase account password (**Project Settings → Database → Reset database password** if
   you don't have it; the sites use the anon key, so a reset changes nothing else). It also encrypts the
   backups: when you change it, keep the old one for 30 days.
4. Run the workflow once from **Actions → Database → Run workflow**.

To find `SUPABASE_DB_URL`: in the Supabase dashboard click **Connect**, choose **Connection String**, type
**URI** and the **Session pooler** (the direct connection is IPv6-only, which GitHub's runners can't reach,
and `pg_dump` needs a session, not the transaction pooler), and delete `:[YOUR-PASSWORD]` from it:
`postgresql://postgres.<project-ref>@aws-0-<region>.pooler.supabase.com:5432/postgres`. Variables aren't
secret, so never leave a password in it.

To run a check yourself, from a checkout of this repository:
`PGPASSWORD=… psql "$SUPABASE_DB_URL" -v schema=<schema> -f ops/sql/security-lint.sql` (no output means it passed).

## Restoring a backup

```sh
gh run download <run-id> --repo <owner>/<repo> --name <schema>-backup   # or download it from the run's page
gpg --decrypt <schema>-<date>.dump.gpg > <schema>.dump                  # asks for the database password of that day
pg_restore --list <schema>.dump | head                                   # check what's in it
```

- **Into the same project** (undo a bad change): `pg_restore --dbname="$SUPABASE_DB_URL" --clean --if-exists
  --no-owner <schema>.dump`. This replaces the whole schema; changes made since are lost, and devices push
  their newer local changes again once they sync.
- **Into a new project:** set it up as the site's CONTRIBUTING.md describes but skip the migrations, then
  `pg_restore --dbname="<new connection string>" --no-owner <schema>.dump`, and run the `alter publication
  supabase_realtime add table …` statement from the end of `0001_init.sql`. Point the repository variables at
  the new project and deploy.

Users and sessions live in Supabase Auth, outside the backup: after a move to a new project everyone signs in
again. Shared containers come back, because membership is by email.

## Client errors

Sites report failed local writes, sync errors and crashes to `<schema>.client_errors` (through
`report_client_error`, capped at 300 reports an hour and kept 30 days). Only the service role can read them:

```sql
select created_at, version, kind, message, path from <schema>.client_errors order by created_at desc limit 50;
```

## Deploying

1. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
2. Merge to `main`. The Deploy workflow checks, tests, builds and publishes the site to
   `https://<user>.github.io/<repo>/`.

Every deploy is a release. The workflow first picks the next version from the latest `v*` tag (patch; run it
by hand to bump minor or major) and pushes the tag, so a version is never reused even when a later step fails.
The build gets it as `APP_VERSION`; once the deploy succeeds a GitHub release with generated notes records it
(re-running skips an existing release). Deploys run one at a time. To choose the starting version, push a tag
before the first deploy (`git tag v1.0.0 && git push origin v1.0.0`).

### Moving to a custom domain

1. Set the repository variable **`BASE_PATH`** to `/`.
2. In **Settings → Pages**, enter the domain and add the DNS records GitHub shows. No `CNAME` file is needed for
   Actions-based deployments.
3. Add the new origin to the Google OAuth client's JavaScript origins, and update the Supabase **Site URL** and
   **Redirect URLs**.
4. Re-run the Deploy workflow.

A domain of its own also gives the site its own browser storage and service worker, separate from other sites
served from `<user>.github.io`.
