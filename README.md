# wells-nelson-components

Shared components for Wells Nelson projects: Svelte 5 UI, an offline-first storage and sync
layer, and build tooling for SvelteKit sites (apps and websites). How sites should look and behave, and
which component to use when, is in the [design guide](docs/design-guide.md).

The packages live under [src/npm](src/npm) as npm workspaces. Each one builds, tests and ships
on its own:

| Package | What's in it |
| --- | --- |
| [`@wells-nelson/displays`](src/npm/displays) | `Button`, `IconButton`, `Icon` (+ `registerIcons`), `Modal`, `ConfirmDialog`, `PageHeader`, `ListRow`, `Notice`, `Badge`, `AppHeader`, `SortableTable`, `Leaderboards`, `Splash`, `FatalError`, `theme.css` and palettes |
| [`@wells-nelson/interactions`](src/npm/interactions) | `TextField`, `SelectField`, `Field`, `Checkbox`, `Toggle`, `Combobox`, `NameModal`, `Overlay`, `Segmented`, `CollapsibleSection`, `ActiveList`, `SearchBar`, `UndoStack` + `UndoButton`, `SyncBanners`, `longpress`, drag and drop, start-up helpers (`checkForUpdatesOnStart`, `touchFeedback`, `preventZoom`), `errorText`, `DevWipeButton` + `wipeAllData`; account and sharing UI under `/account` |
| [`@wells-nelson/data-storage`](src/npm/data-storage) | `createSyncedStore` (RxDB + TanStack DB data sets, Supabase sync, tombstones, device prefs, container operations, export / import, persistent storage, error reporting), `Persisted`, `flatSchema`, `envConfig`, `defaultContainerToOpen`; SQL migration generator and `schemaMismatches` under `/sql` |
| [`@wells-nelson/build-tools`](src/npm/build-tools) | `wn-postbuild`, `wn-icons`, `wn-manifest`, `wn-check-design` CLIs, a site's shared configs (`/kit` SvelteKit options, `/vitest`, `/eslint`, `/prettier`), Vite helpers (base path, dependency pre-bundling, Content Security Policy), the app-shell service worker, and workflow templates |

Dependencies between them: `interactions` depends on `displays`. Nothing else depends on another
package. The account components in `interactions/account` describe what they need from the sync
layer as plain interfaces (`CloudStatus`, `AccountActions`, `MembersApi`); `data-storage`'s
`CloudSync` and members API satisfy them, which [tests/compat](tests/compat) checks.

## Starting and running a site

- [ONBOARDING.md](ONBOARDING.md) is the recipe for a new app or website on these packages: the decisions to make,
  the files to create, the database, CI and deploys, and the traps that have bitten before.
- [OPERATIONS.md](OPERATIONS.md) is the runbook every site shares: repository settings, migrations, the nightly
  Database workflow, backups and restores, client errors, deploys. Its SQL is in [ops/sql](ops/sql).

## Contributing

Setup, the sandbox, checks, how changes reach `main` and how packages are released:
[CONTRIBUTING.md](CONTRIBUTING.md) and [PUBLISHING.md](PUBLISHING.md).

## Trying unreleased changes in an app

`npm run try -- ../my-site ../my-other-site` builds and packs every package and installs the tarballs into
each site: the packages it already uses, each in the same section of its package.json. Once the change is
published, the app's CI (`site-ci.yml`, below) puts it back on npm: on the app's pull request, or a push to
`main`, it replaces each `file:…tgz` dependency with the latest published version, reinstalls, runs the app's
checks, commits package.json and package-lock.json to the branch and runs again on that commit.

## Reusable workflows

Sites built on these packages keep almost nothing in their own workflows: each one calls a reusable
workflow here, at the moving tag `@v2`, so a fix reaches every site at once once `v2` is moved to it (see
CONTRIBUTING.md > Changes to the reusable workflows). The callers are the build-tools
[templates](src/npm/build-tools/README.md#templates); a site only fills in its repository name or schema.

| Workflow | What it does | The site's caller |
| --- | --- | --- |
| [site-ci.yml](.github/workflows/site-ci.yml) | One job, **ci / Check, test and build** (the required check): swaps local `@wells-nelson` tarballs for the published versions, then type-check, lint, format check, tests, build; after a swap, commits it to the branch with a `Published-packages:` trailer (a commit with the trailer is never swapped again) and pushes with the `token` secret so the checks run on it (a missing or refused token falls back to `GITHUB_TOKEN`, with a warning on the run summary). Inputs: `node-version`, `scope`, `dist-tag`; output `committed`. | `ci.yml` (`pull_request`) and `deploy.yml` (pushes to `main`); grants `contents` write and passes the `PAT` secret as `token` |
| [site-deploy.yml](.github/workflows/site-deploy.yml) | `main`, after site-ci.yml: reserves the next `v*` tag, builds with the site's `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `BASE_PATH` (and optional `PRIVACY_URL` / `TERMS_URL`) variables, deploys to Pages, records a GitHub release. Inputs: `base-path`, `increment`. | `deploy.yml` (grants `contents`, `pages` and `id-token` write; skipped when CI committed a swap) |
| [site-database.yml](.github/workflows/site-database.yml) | Nightly: encrypted backup with a test restore, keep-alive, security lint, client error digest, running this repository's [ops/sql](ops/sql) (through the actions below, at the same tag) in the site's `database` environment. Input: `schema`. | `database.yml` (`schedule`; `secrets: inherit`, which the environment's password needs) |
| [use-published-packages.yml](.github/workflows/use-published-packages.yml) | The swap on its own, for apps not using site-ci.yml (the same actions). Inputs: `verify`, `scope` (default `@wells-nelson/`), `dist-tag`, `node-version`, `working-directory`, `commit-message`; output `replaced`; optional `token` secret. Forks are skipped. | |

Their longer steps are composite actions in [.github/actions](.github/actions), which the workflows call
at the same tag (`bnelson729/wells-nelson-components/.github/actions/<name>@v2`). GitHub fetches an action
with its whole repository, so no step checks this repository out, and the actions reach `ops/sql` beside them:

| Action | What it does | Used by |
| --- | --- | --- |
| [check-pat](.github/actions/check-pat/action.yml) | Whether the PAT can push to the repository (`pat`), else `builtin` with a warning on the run summary | site-ci, use-published-packages |
| [local-tarballs](.github/actions/local-tarballs/action.yml) | Finds local tarball dependencies, checks out the branch to commit to, and the loop guard | site-ci |
| [use-published-packages](.github/actions/use-published-packages/action.yml) | Points tarball dependencies at their published versions (`swap.cjs`) | site-ci, use-published-packages |
| [commit-published-packages](.github/actions/commit-published-packages/action.yml) | Commits and pushes the swap with the `Published-packages:` trailer | site-ci, use-published-packages |
| [postgres-client](.github/actions/postgres-client/action.yml) | psql, pg_dump and pg_restore of one Postgres version | site-database |
| [schema-backup](.github/actions/schema-backup/action.yml) | Dump, restore test against a scratch database, encryption | site-database |
| [schema-checks](.github/actions/schema-checks/action.yml) | Security lint and the client error digest | site-database |

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
