# wells-nelson-components

Shared components for Wells Nelson projects: Svelte 5 UI, an offline-first storage and sync
layer, and build tooling for SvelteKit PWAs.

The packages live under [src/npm](src/npm) as npm workspaces. Each one builds, tests and ships
on its own:

| Package | What's in it |
| --- | --- |
| [`@wells-nelson/displays`](src/npm/displays) | `Button`, `IconButton`, `Icon` (+ `registerIcons`), `Modal`, `ConfirmDialog`, `Badge`, `AppHeader`, `SortableTable`, `Leaderboards`, `Splash`, `FatalError`, `theme.css` and palettes |
| [`@wells-nelson/interactions`](src/npm/interactions) | `TextField`, `Checkbox`, `Toggle`, `Combobox`, `AddRow`, `Segmented`, `CollapsibleSection`, `ActiveList`, `SearchBar`, `UndoStack` + `UndoButton`, `longpress`, drag and drop, `DevWipeButton` + `wipeAllData`; account and sharing UI under `/account` |
| [`@wells-nelson/data-storage`](src/npm/data-storage) | `createSyncedStore` (RxDB + TanStack DB data sets, Supabase sync, tombstones, device prefs, container operations), `Persisted`, `flatSchema`, `envConfig`; SQL migration generator under `/sql` |
| [`@wells-nelson/build-tools`](src/npm/build-tools) | `wn-postbuild`, `wn-icons`, `wn-manifest` CLIs, Vite helpers, the app-shell service worker, and Pages workflow / manifest templates |

Dependencies between them: `interactions` depends on `displays`. Nothing else depends on another
package. The account components in `interactions/account` describe what they need from the sync
layer as plain interfaces (`CloudStatus`, `AccountActions`, `MembersApi`); `data-storage`'s
`CloudSync` and members API satisfy them, which [tests/compat](tests/compat) checks.

## Sandbox

```sh
npm install
npm run sandbox      # http://localhost:5180
```

[src/sandbox](src/sandbox) is a private dev app with a page per package, built straight from
package sources (edits hot-reload) and driven by mock data:

- **Displays**: theme tokens and palettes, every icon, buttons, badges, modals, a sortable table
  and leaderboards. The sandbox header is `AppHeader`; its options are switchable here.
- **Interactions**: inputs, sections with long-press drag and drop between and across them,
  undo, search, `ActiveList`, `longpress`, and the dev wipe.
- **Account and sharing**: `AccountPanel`, `ShareModal`, `ContainerEditModal` and
  `LocalItemsPrompt` against a mock sync layer with a switch for every state (signed out,
  offline, expired session, pending changes, roles, failing calls) and a log of the calls made.
- **Data storage**: a real `createSyncedStore` in IndexedDB: add mock projects, duplicate one
  (watch ids get rewritten), delete (tombstones), the device storage it writes, and the SQL
  migration for its schema. Local-only unless `src/sandbox/.env.local` sets
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (apply the shown migration first).
- **Build tools**: icons rendered from your letters and colors, the manifest, `basePath`, and
  `postbuild` run against a throwaway mock build (try the leak check). These call small endpoints
  on the dev server, since the code runs in Node.

## Working on the packages

```sh
npm run build        # all packages, in dependency order
npm run check        # svelte-check / tsc for each package and the sandbox, then the cross-package type check
npm test             # vitest in each package
npm run pack:all     # tarballs in packs/
```

One package: `npm run build -w src/npm/displays` (build `displays` before working on
`interactions`, which compiles against its `dist`).

## CI and releases

[.github/workflows/packages.yml](.github/workflows/packages.yml) runs one job per package
(build, type-check, test, publint, pack) and uploads each tarball as an artifact. A second job
checks that the packages' types fit together, that the sandbox compiles, and that the release
scripts pass their tests.

On `main`, each package whose shipped files changed since its last release is published to npm
with its own version, tagged `@wells-nelson/<package>@<version>`. Setup, auth and manual
releases: [PUBLISHING.md](PUBLISHING.md).

## Using them in an app

```sh
npm install @wells-nelson/displays @wells-nelson/interactions   # interactions needs displays (peer)
npm install @wells-nelson/data-storage rxdb rxjs @tanstack/db @tanstack/rxdb-db-collection @supabase/supabase-js
npm install -D @wells-nelson/build-tools
```

Keep a single RxDB copy so the TanStack adapter shares the app's:

```json
"overrides": { "rxdb": "$rxdb" }
```

Svelte packages ship uncompiled `.svelte` files (built with `@sveltejs/package`), so the app's
Vite + Svelte plugin compiles them. Library code uses relative imports only.
