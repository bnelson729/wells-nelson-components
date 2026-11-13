# @wells-nelson/data-storage

Offline-first storage for apps whose data lives in **containers** (a project, a list) that hold
every other row and are what gets shared. Local data is always on the device; signed-in users
also get a per-user cloud database replicated to Supabase.

Peer dependencies: `svelte`, `rxdb`, `rxjs`, `@tanstack/db`, `@tanstack/rxdb-db-collection`,
`@supabase/supabase-js`. Keep `"overrides": { "rxdb": "$rxdb" }` in the app.

## Set up

```ts
// src/lib/store.ts
import { createSyncedStore, envConfig, field, flatSchema } from '@wells-nelson/data-storage';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

// Docs maps collection names to document types, as a `type` or an `interface`.
// Pass the container collection as the second type argument so its rows are typed precisely.
export const store = createSyncedStore<Docs, 'projects'>({
	appKey: 'demo', // demo_local, demo_cloud_<user>, demo:hidden, demo:sync:<user>, demo:defaultProject…
	nouns: { singular: 'project', plural: 'projects' },
	env: envConfig(import.meta.env),
	storage: getRxStorageDexie,
	roles: true,
	collections: ['projects', 'tasks', 'task_links', 'notes'], // parents first
	schemas, // flatSchema<ProjectDoc>({ id: field.id, name: field.string, … }) per collection
	container: 'projects',
	containerField: 'project_id',
	indexContainerField: true,
	// Ids of other rows in the container, rewritten when a copy gets new ids.
	refs: { task_links: ['from_id', 'to_id'] },
	// Composite ids and ids inside text fields (runs after `refs` were mapped).
	remap: (collection, row, map) => {
		if (collection === 'task_links') return { ...row, id: `${row.from_id}:${row.to_id}` };
		if (collection === 'notes') return { ...row, mentions: row.mentions.split(',').map(map).join(',') };
		return row;
	},
	// Optional: report failed writes, sync errors and crashes (needs report_client_error, below).
	reportErrors: { version } // from '$app/env'
});
```

```ts
// root layout
onMount(() => void store.init({ beforeReady: importDevSeed }));
```

`store` holds:

- `app`: `local` / `cloud` data sets (`DataSet`: the RxDB database plus a TanStack DB
  collection per RxDB collection), `ready`, `restored` (start-up has also restored any session, or
  `restoreTimeoutMs`, default 5 s, passed), `fatal`, `writeError` (a local write that failed; show it
  until dismissed, e.g. with `SyncBanners` from interactions) and `persisted` (whether the browser keeps
  the data for good).
- `cloud`: `CloudSync`: session (Google, email link), replication, `pendingIds`, `hasPending`,
  `lastSync`, `online`, `active`, `error`, `rejectedWrite`, `roleOf`, `revokedIds`,
  `forceResync`, `signOut`. Each collection replicates on its own; a container created in or moved to
  the cloud (`createContainer`, `makeCloud`) holds its other rows back until its own row has reached
  Supabase (`expectNewContainer`, at most 20 s), so row level security doesn't refuse them.
- `ops`: container operations (`createContainer`, `renameContainer`, `makeCloud`, `makeLocal`,
  `deleteContainer`, `leaveContainer`, `keepRevokedCopy`, `removeRevoked`, `entries`,
  `exportContainers`, `importContainers`) and the row helpers they're built from: `insertDoc` and
  `patch` (instant, never throw), `removeDocs` (never rejects), `bulkWrite` (many rows of one container,
  awaited; throws when a row couldn't be written), `docsWhere` (equality or `{ $in: [...] }`), `touch`.
  Failed writes that don't throw are reported and shown through `app.writeError`. Prefer these to the
  raw RxDB collections (`rx`): they keep `updated_at`, tombstones and pending-sync tracking right.
- `supabase`: PKCE client (`loadClient()`; supabase-js is only downloaded when a session may exist or
  the user signs in) and members API (`fetchMembers`, `inviteMember`, `setMemberRole`,
  `removeMember`, `leave`, `fetchMyMemberships`) with friendly error messages.
- `tombstones`: hides deleted rows at once and keeps hiding them if a sync briefly restores
  them; pruned after a week.
- `prefs`: `DevicePrefs` (default container, "already prompted", collapsed sections). The cold-start
  redirect to the default container is `defaultContainerToOpen(prefs, { ready, restored, exists })`,
  called from an effect on the page that lists the containers. Pass a
  subclass as `prefs` for app-specific ones and override `replaceContainer` to keep them in step.
- `requestPersistence()`: asks the browser to keep the data (called on start unless
  `persistStorage: false`, e.g. for a website whose data lives in the cloud, since some browsers
  ask the user; call it again from a button). Sets `app.persisted`.
- `resetDevice()`: teardown for a dev wipe.

Without roles everyone is an owner.

**Session key.** The session is stored under `<appKey>-auth` (`authStorageKey` to change it), so
apps sharing an origin, e.g. two GitHub Pages project sites, don't share or end each other's
sessions. A session stored under supabase-js's default key is moved to the new key once; the old key
is removed, so a second app on the origin asks to sign in again.

**Lazy loading.** `@supabase/supabase-js` and RxDB's Supabase replication are loaded with dynamic
`import()`: signed-out users never download them. They load on start when a session is stored or
the page is a sign-in redirect, and otherwise on sign-in.

**Backups.** `ops.exportContainers([{ id, location }])` returns every row of those containers as a
JSON-ready object (`format: 'wells-nelson-containers'`, the `appKey`, a version).
`ops.importContainers(data)` checks a parsed file (format, app, every row against the schema)
before writing anything, then adds each container as a new local-only container with fresh ids.
`DeviceDataCard` in `@wells-nelson/interactions/account` is the UI.

**Errors.** `persist()` (TanStack writes) and other quiet failures go through `reportError(kind,
err)`; failed writes also set `app.writeError`. With `reportErrors`, the store sends each report
(once per kind and message, at most 20 per page load) to the schema's `report_client_error`
function with a plain `fetch`, so signed-out devices report too, and also catches uncaught errors
and rejections. `setErrorReporter` swaps in another destination (e.g. Sentry). Table and RPC names default to `<noun>_members` and
`get_<noun>_members`; override with e.g. `members: { membersRpc: 'get_list_collaborators' }`.

## A schema other than `public`

To keep an app's tables in their own Postgres schema (handy when several apps share one Supabase
project), set `supabaseSchema` on the store and the same `schema` on the migration:

```ts
createSyncedStore({ ..., supabaseSchema: 'my_app' });
generateMigration({ ..., schema: 'my_app' });
```

The migration creates the schema with the grants Supabase's API roles need (tables only for
`authenticated`; `anon` only gets `report_client_error`). In the Supabase
dashboard, add the schema under **Project Settings → Data API → Exposed schemas**; until then,
the API can't see it. The store's client reads and writes that schema. It also fixes RxDB's
realtime subscription, which otherwise always listens on `public`.

## SQL migration

```ts
import { generateMigration, tablesFromSchemas } from '@wells-nelson/data-storage/sql';

const sql = generateMigration({
	container: 'projects',
	containerField: 'project_id',
	noun: 'project',
	roles: true,
	tables: tablesFromSchemas(collections, schemas, { containerField: 'project_id', refs, defaults: { tasks: { done: 'false' } } })
});
```

`ownership: 'user'` (pass the same to `createSyncedStore`) is for one container per signed-in user, e.g. a
profile: the container's id is the user's id (`createContainer` uses it), every other row's container field
is too, and only that user can read or write them. No members table, no sharing, no membership checks;
`makeCloud` isn't available.

With the default `ownership: 'members'`, what it sets up besides the tables:

- `current_email()` returns the signed-in user's email only once it's confirmed (read from
  `auth.users`), so an unverified sign-up can't claim invites made to that email.
- RLS on every table; nothing for `anon` except `report_client_error`. Functions are revoked from
  `public` and `anon` and granted to `authenticated`.
- Nothing new (rows, members) goes into a deleted container (`is_<noun>_live`); containers can only
  be created by users with an email. With roles, the last-owner trigger locks the container row, so
  two owners demoting each other at once can't both succeed; viewers see only the owners and
  themselves.
- The members RPC's `active` means "signed in since being invited" (only owners see it, with roles),
  so it never reveals whether an email has an account.
- `client_errors` and `report_client_error(...)`: write-only error reports, capped at 300 an hour and
  kept 30 days (in both modes).
- `anon` loses table access even where the schema's defaults grant it (Supabase's `public` schema).

Check a site's migrations against its RxDB schemas in a unit test: `schemaMismatches(collections, schemas,
sqlFiles, schema)` lists every difference (a missing table, a field without a column or the reverse,
different types), reading `create table`, `add column` and `drop column` in order; `[]` means they match.
The generated SQL is applied to a real Postgres (PGlite) and checked with the library's
[security lint](../../../ops/sql/security-lint.sql) in this package's tests.

The sandbox's Data storage page runs this store in the browser and shows the migration.
