# wells-nelson-components

Shared components for Wells Nelson projects: Svelte 5 UI, an offline-first storage and sync
layer, and build tooling for SvelteKit PWAs.

The packages live under [src/npm](src/npm) as npm workspaces. Each one builds, tests and ships
on its own:

| Package | What's in it |
| --- | --- |
| [`@wells-nelson/displays`](src/npm/displays) | `Button`, `IconButton`, `Icon` (+ `registerIcons`), `Modal`, `ConfirmDialog`, `Badge`, `AppHeader`, `SortableTable`, `Leaderboards`, `Splash`, `FatalError`, `theme.css` and palettes |
| [`@wells-nelson/interactions`](src/npm/interactions) | `TextField`, `Checkbox`, `Toggle`, `Combobox`, `AddRow`, `Segmented`, `CollapsibleSection`, `ActiveList`, `SearchBar`, `UndoStack` + `UndoButton`, `longpress`, drag and drop, `DevWipeButton` + `wipeAllData`; account and sharing UI under `/account` |
| [`@wells-nelson/data-storage`](src/npm/data-storage) | `createSyncedStore` (RxDB + TanStack DB data sets, Supabase sync, tombstones, device prefs, container operations, export / import, persistent storage, error reporting), `Persisted`, `flatSchema`, `envConfig`; SQL migration generator under `/sql` |
| [`@wells-nelson/build-tools`](src/npm/build-tools) | `wn-postbuild`, `wn-icons`, `wn-manifest` CLIs, Vite helpers (base path, dependency pre-bundling, Content Security Policy), the app-shell service worker, and templates (deploy, CI, nightly database workflow and its SQL, manifest) |

Dependencies between them: `interactions` depends on `displays`. Nothing else depends on another
package. The account components in `interactions/account` describe what they need from the sync
layer as plain interfaces (`CloudStatus`, `AccountActions`, `MembersApi`); `data-storage`'s
`CloudSync` and members API satisfy them, which [tests/compat](tests/compat) checks.

## Starting a new site

[ONBOARDING.md](ONBOARDING.md) is the recipe for a new app or website on these packages: the decisions to make,
the files to create, the database, CI and deploys, and the traps that have bitten before.

## Contributing

Setup, the sandbox, checks, how changes reach `main` and how packages are released:
[CONTRIBUTING.md](CONTRIBUTING.md) and [PUBLISHING.md](PUBLISHING.md).

## Trying unreleased changes in an app

Pack the packages (`npm run pack:all`) and install the tarballs in the app
(`npm install ../wells-nelson-components/packs/wells-nelson-displays-0.0.0.tgz`). Once the change is
published, the app's **Use published packages** workflow (below) puts it back on npm: on the app's pull
request it replaces each `file:…tgz` dependency with the latest published version, reinstalls, runs the
app's checks, commits package.json and package-lock.json to the branch and runs the app's CI again.

## Reusable workflows

Sites built on these packages keep almost nothing in their own workflows: each one calls a reusable
workflow here, at `@main`, so a fix reaches every site at once. The callers are the build-tools
[templates](src/npm/build-tools/README.md#templates); a site only fills in its repository name or schema.

| Workflow | What it does | The site's caller |
| --- | --- | --- |
| [site-ci.yml](.github/workflows/site-ci.yml) | Pull requests: fails on local tarball dependencies, then type-check, tests, build. The required check is **ci / Check, test and build**. | `ci.yml` (`pull_request`, `workflow_dispatch`) |
| [site-deploy.yml](.github/workflows/site-deploy.yml) | `main`: reserves the next `v*` tag, builds with the site's `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `BASE_PATH` variables, deploys to Pages, records a GitHub release. Inputs: `base-path`, `increment`. | `deploy.yml` (grants `contents`, `pages` and `id-token` write) |
| [site-database.yml](.github/workflows/site-database.yml) | Nightly: encrypted backup with a test restore, keep-alive, security lint, client error digest, using the site's `supabase/ops/` and its `database` environment. Input: `schema`. | `database.yml` (`schedule`) |
| [site-published-packages.yml](.github/workflows/site-published-packages.yml) | Pull requests that change package files: swaps local tarballs for published versions (`use-published-packages.yml`), then starts the site's CI on the new commit. | `published-packages.yml` (grants `contents` and `actions` write) |
| [use-published-packages.yml](.github/workflows/use-published-packages.yml) | The swap on its own. Inputs: `verify`, `scope` (default `@wells-nelson/`), `dist-tag`, `node-version`, `working-directory`, `commit-message`; output `replaced`; optional `token` secret. Forks are skipped. | |

Reusable workflows read the calling site's variables and run their jobs in its environments, so the
settings stay in each site's repository. Changing one of these workflows changes every site's next run:
check it against the callers' permissions (a job can't ask for more than its caller grants).

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
