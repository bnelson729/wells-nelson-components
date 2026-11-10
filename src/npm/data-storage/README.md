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
	}
});
```

```ts
// root layout
onMount(() => void store.init({ beforeReady: importDevSeed }));
```

`store` holds:

- `app`: `local` / `cloud` data sets (`DataSet`: the RxDB database plus a TanStack DB
  collection per RxDB collection), `ready`, `fatal`.
- `cloud`: `CloudSync`: session (Google, email link), replication, `pendingIds`, `hasPending`,
  `lastSync`, `online`, `active`, `error`, `rejectedWrite`, `roleOf`, `revokedIds`,
  `forceResync`, `signOut`.
- `ops`: container operations (`createContainer`, `renameContainer`, `makeCloud`, `makeLocal`,
  `deleteContainer`, `leaveContainer`, `keepRevokedCopy`, `removeRevoked`, `entries`) and the row
  helpers they're built from (`insertDoc`, `patch`, `removeDocs`, `docsWhere`, `touch`…).
- `supabase`: lazy PKCE client and members API (`fetchMembers`, `inviteMember`, `setMemberRole`,
  `removeMember`, `leave`, `fetchMyMemberships`) with friendly error messages.
- `tombstones`: hides deleted rows at once and keeps hiding them if a sync briefly restores
  them; pruned after a week.
- `prefs`: `DevicePrefs` (default container, "already prompted", collapsed sections). Pass a
  subclass as `prefs` for app-specific ones and override `replaceContainer` to keep them in step.
- `resetDevice()`: teardown for a dev wipe.

Without roles everyone is an owner. Table and RPC names default to `<noun>_members` and
`get_<noun>_members`; override with e.g. `members: { membersRpc: 'get_list_collaborators' }`.

## A schema other than `public`

To keep an app's tables in their own Postgres schema (handy when several apps share one Supabase
project), set `supabaseSchema` on the store and the same `schema` on the migration:

```ts
createSyncedStore({ ..., supabaseSchema: 'my_app' });
generateMigration({ ..., schema: 'my_app' });
```

The migration creates the schema with the grants Supabase's API roles need. In the Supabase
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

The sandbox's Data storage page runs this store in the browser and shows the migration.
