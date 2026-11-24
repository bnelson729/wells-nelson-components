# Changelog: @wells-nelson/data-storage

## Unreleased (minor)

- `createSyncedStore` throws when an app declares more than `MAX_COLLECTIONS` (6) collections. The
  open-source RxDB keeps at most 13 collections open across every database, and the local and cloud data
  sets each open every collection: a 7th made start-up wait about 2 seconds while signed in, and an 8th
  failed with RxDB error COL23 (shown as "This app can't start"). Keep new data in an existing collection.
- Schema versions: `flatSchema(properties, version)` and `field.added(spec, default)` add fields to a table
  that already has rows on people's devices. The database migrates saved rows on start (filling in the
  defaults), and a backup made before the field existed imports with the default. `fieldDefaults` and
  `migrationStrategies` are exported for custom schemas.
- A new cloud container's rows wait for the container row across restarts too: the wait was kept in memory
  only, so a container created just before the app closed could have its first rows pushed ahead of it and
  refused by row level security ("new row violates row-level security policy") until the next retry. The
  wait ends once the container row is sent or pulled back from Supabase.
- `userError(message)`: an Error marked `userFacing`, which the UI shows as it is. `friendlyError`'s
  messages, "You're offline…" and the backup import errors are `userError`s; other errors show as a general
  sentence with the technical text behind "Details". A malformed backup now says "This backup is damaged, so
  nothing was imported." (it named the table and field).

- `ownership: 'user'` (store and `generateMigration`): one container per signed-in user, whose id is the user's
  id; no members table, no sharing.
- `app.restored` (with `restoreTimeoutMs`) and `defaultContainerToOpen(prefs, …)`: start-up state and the
  cold-start redirect, so sites don't keep their own copies.
- Start-up waits at most `sessionWaitMs` (default 300 ms) for Supabase to confirm a stored session, which can
  need the network to refresh an expired token. After that, the cloud data already on the device opens for the
  stored user (`supabase.storedUser()`) and syncs once the session is confirmed. If Supabase then turns the
  stored session down (e.g. its refresh token was revoked), `cloud.sessionExpired` turns true, as for any expiry.
- `ops.bulkWrite` (awaited, throws on failure) and `docsWhere` with `{ $in: [...] }`. `removeDocs` no longer
  rejects: a failed local write goes to `app.writeError`, like `insertDoc` / `patch`.
- `schemaMismatches` / `migrationColumns` (`/sql`): check that a site's migrations match its RxDB schemas.
- Generated SQL: `is_<noun>_live` is plpgsql, so the SQL applies to an empty database; `anon` loses table
  access even in Supabase's `public` schema. **Sites:** nothing to carry over for sites in their own schema.
- A container created in, or moved to, the cloud holds its other rows back until its own row is pushed, so
  row level security doesn't refuse them on the first sync.
- `persistStorage: false` for websites; `DocMap` accepts interfaces.

## 1.1.1 and earlier

See the git tags `@wells-nelson/data-storage@<version>`.
