# Changelog: @wells-nelson/data-storage

## Unreleased (minor)

- `ownership: 'user'` (store and `generateMigration`): one container per signed-in user, whose id is the user's
  id; no members table, no sharing.
- `app.restored` (with `restoreTimeoutMs`) and `defaultContainerToOpen(prefs, …)`: start-up state and the
  cold-start redirect, so sites don't keep their own copies.
- Start-up waits at most `sessionWaitMs` (default 300 ms) for Supabase to confirm a stored session, which can
  need the network to refresh an expired token. After that, the cloud data already on the device opens for the
  stored user (`supabase.storedUser()`) and syncs once the session is confirmed.
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
