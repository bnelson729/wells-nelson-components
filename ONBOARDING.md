# Onboarding: a new site on this framework

A recipe for creating a new site (an app or a website) on the `@wells-nelson/*` packages, written so an AI agent
can follow it end to end. It assumes the site lives in its own repository next to this one
(`../wells-nelson-components`), is deployed to GitHub Pages and, if it signs people in, uses Supabase.

Read the package READMEs for the APIs: [displays](src/npm/displays/README.md),
[interactions](src/npm/interactions/README.md), [data-storage](src/npm/data-storage/README.md),
[build-tools](src/npm/build-tools/README.md). Running a site (repository settings, migrations, backups, deploys)
is in [OPERATIONS.md](OPERATIONS.md).

**The rule for what goes where:** code moves into these packages when a second site needs the same thing
unchanged, not before. The library never names a site or its domain; sites never reach past the package exports.

## 1. Decide before writing code

| Question | App (offline-first, installable) | Website (pages, maybe a profile) |
| --- | --- | --- |
| PWA | Service worker (`registerAppShellCache`, its own `cachePrefix`) and `static/manifest.webmanifest` | Neither; no `src/service-worker/`, no manifest link |
| Touch behavior | `<html class="touch-app">` (no accidental text selection, touch feedback), `touchFeedback()` and `preventZoom()` in the root layout | Neither: normal selection and zoom |
| Updates | `siteKit({ pollUpdates: true })`, `checkForUpdatesOnStart()`, `AppVersion` on the Profile | Neither |
| Storage persistence | default (`requestPersistence()` on start) | `persistStorage: false` (some browsers ask the user) |
| Splash | Wait for `app.ready` before rendering pages | Render pages at once; only pages that need data wait |
| Navigation | `AppHeader` (labeled `IconButton`s) on wide screens, `TabBar` when `phoneLayout.current` | Same |

Then the data:

- **The container.** Everything that's shared and synced hangs off one *container* collection (a project, a
  list…), and every other collection has a `<container>_id` field.
- **Ownership.** `members` (default): containers are shared by email, optionally with `roles: true` (viewer /
  editor / owner). `user`: one container per signed-in user, whose id is the user's id, no sharing (e.g. a
  profile). Set the same `ownership` in the store and the SQL.
- **The Postgres schema.** One schema per site (`snake_case` of the site name), so sites can share a Supabase
  project and its sign-in.
- **The `appKey`.** A short prefix for IndexedDB names and localStorage keys. Sites on `<user>.github.io` share
  one origin, so it must be unique; the Supabase session key defaults to `<appKey>-auth`.

## 2. Create the repository

Work on a branch (`git switch -c feat/initial-site`); `main` deploys. Then add these files.

**`package.json`**: `"type": "module"`, `"imports": { "#lib/*": "./src/lib/*" }`,
`"prettier": "@wells-nelson/build-tools/prettier"`, and the scripts:

```json
"dev": "vite dev",
"build": "vite build && wn-postbuild",
"preview": "vite preview",
"prepare": "svelte-kit sync || echo ''",
"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
"lint": "svelte-kit sync && eslint .",
"format": "prettier --write .",
"format:check": "prettier --check .",
"test": "vitest run",
"icons": "wn-icons --letters AB --background \"#1f5fa8\""
```

Dependencies: `@sveltejs/kit`, `@sveltejs/adapter-static`, `@sveltejs/vite-plugin-svelte`, `svelte`,
`svelte-check`, `typescript`, `vite`, `vitest`, `eslint`, `typescript-eslint`, `eslint-plugin-svelte`, `prettier`,
`prettier-plugin-svelte` and `@wells-nelson/build-tools` (dev); `@supabase/supabase-js`, `@tanstack/db`,
`@tanstack/rxdb-db-collection`, `@tanstack/svelte-db`, `rxdb`, `rxjs` and the three `@wells-nelson/*` runtime
packages. Add `"overrides": { "rxdb": "$rxdb" }` so there's one RxDB. Pin pre-release versions exactly (the
`@tanstack` packages are `1.0.0-rc…`: no `^`), so every site runs the version that was tested.

**The configs**, each a few lines on the shared ones in `@wells-nelson/build-tools`:

```js
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { siteKit } from '@wells-nelson/build-tools/kit';
import { optimizeDeps } from '@wells-nelson/build-tools/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
	server: { port: 5176 }, // a port no other site uses
	plugins: [sveltekit(siteKit({ mode, base: '/my-site' }))], // the repository name; pollUpdates: true for apps
	optimizeDeps: optimizeDeps()
}));

// vitest.config.js
import { siteVitest } from '@wells-nelson/build-tools/vitest';
export default siteVitest();

// eslint.config.js
import { siteEslint } from '@wells-nelson/build-tools/eslint';
export default siteEslint();
```

**Also:** `.gitattributes` (`* text=auto eol=lf`, `*.png binary`), `.prettierignore` (`build/`, `.svelte-kit/`,
`node_modules/`, `package-lock.json`, `*.md`, `static/`), `tsconfig.json` (`"extends": "$app/tsconfig"`, strict),
`.gitignore` (`node_modules`, `/build`, `/.svelte-kit`, `.env*` except `!.env.example`), `.env.example`
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `BASE_PATH`), `src/app.d.ts` (declares the two `VITE_` variables),
`src/app.html` (viewport with `viewport-fit=cover`, theme color, favicon; `class="touch-app"` on `<html>` for an
app), and `src/routes/+layout.ts` with `ssr = false` and `prerender = false`. Run `npm run icons`.

## 3. The storage layer

```
src/lib/types.ts     document interfaces (flat: string / number / boolean; snake_case; id, updated_at)
src/lib/schema.ts    COLLECTION_NAMES (container first) and flatSchema(...) per collection
src/lib/store.ts     createSyncedStore({...}) and its exports
src/lib/repo.ts      the site's writes, on the store's row helpers
```

```ts
export const store = createSyncedStore<DocTypes, 'projects'>({
	appKey: 'pm',
	nouns: { singular: 'project', plural: 'projects' },
	env: envConfig(import.meta.env),
	storage: getRxStorageDexie,
	supabaseSchema: 'project_manager',
	collections: COLLECTION_NAMES,
	schemas,
	container: 'projects',
	containerField: 'project_id',
	roles: true,
	reportErrors: { version } // from '$app/env'
});
export const { app, cloud, ops } = store;
```

The root layout imports `@wells-nelson/displays/theme.css`, then `../app.css` (palette overrides: the `--accent*`
tokens, light and dark), then the module that calls `registerIcons`, and calls `void store.init()` in `onMount`.
Pages that decide from "all containers" wait for `app.restored`; the page that lists containers opens the default
one with `defaultContainerToOpen(prefs, { ready, restored: app.restored, exists })`.

Read data with `useLiveQuery((q) => q.from({ p: app.cloud.projects }))`; write with the row helpers in `ops`
(`insertDoc`, `patch`, `removeDocs`, `bulkWrite`, `docsWhere`, `createContainer`…), never with RxDB directly.

### Writes and errors

The same in every site, and written at the top of each site's `repo.ts`:

- **Local writes and deletes never throw**, even the async ones (`insertDoc`, `patch`, `removeDocs`): a failed
  write sets `app.writeError`, which `SyncBanners` shows. `await` them only to order steps.
- **Functions documented with "Throws"** (`bulkWrite`, and anything that needs the network: sharing, leaving,
  moving a container between local and cloud) are awaited inside `try`/`catch`, and the error is shown where the
  action was taken, with `errorText(err)`. Keep the user's input (a form, a draft) so they can try again.
- **Writes the server refuses** set `cloud.rejectedWrite`, which `SyncBanners` shows.
- ESLint's `no-floating-promises` catches a forgotten `await`; `void` marks a deliberate fire-and-forget.

## 4. The database

Generate the first migration once, with a one-off command (an applied migration never changes, so there's no
script to keep), and commit the SQL:

```sh
node --input-type=module -e "
import { generateMigration } from '@wells-nelson/data-storage/sql';
process.stdout.write(generateMigration({
  container: 'projects', containerField: 'project_id', noun: 'project', roles: true, schema: 'project_manager',
  tables: [
    { name: 'projects', columns: { name: 'text', created_at: 'number', updated_at: 'number' } },
    { name: 'tasks', columns: { project_id: { type: 'text', default: null }, title: 'text', updated_at: 'number' } }
  ]
}));" > supabase/migrations/0001_init.sql
```

- List **every** column except `id`, including `updated_at`; nothing is added for you. For one container per
  user, pass `ownership: 'user'` (and the same to the store).
- Append any site-specific rules to the file; prefer `as restrictive` policies, which narrow the generated ones.
- Add `src/lib/schema.test.ts`: read every file in `supabase/migrations/` in order and expect
  `schemaMismatches(store.config.collections, store.config.schemas, files, store.config.supabaseSchema)` (from
  `@wells-nelson/data-storage/sql`) to equal `[]`. A column added on one side only then fails the tests.
- Changes go in `0002_<what>.sql` and later (see [OPERATIONS.md](OPERATIONS.md#migrations)).

The site keeps no operations SQL: the nightly Database workflow runs this repository's [ops/sql](ops/sql) for
the site's schema, including the security lint. The generator's output is applied to a real Postgres and linted
in this repository's tests (`sql-apply.test.ts`); to check a site's own additions the same way, use
[PGlite](https://pglite.dev) with the stub that test uses.

## 5. Pages and shell

- `AppShell.svelte`: `{#if !phoneLayout.current}<Header />{/if}`, `<main>` with `padding-top: calc(var(--header-h) +
  env(safe-area-inset-top, 0px))` holding `<SyncBanners {app} {cloud} />` and the page, then
  `{#if phoneLayout.current}<BottomNav />{/if}`. `TabBar` sets `--header-h: 0px` and `--footer-offset` while shown.
- `Header.svelte` wraps `AppHeader`: `labels="always"`, nav `IconButton`s with `showLabel`, the profile avatar
  without a label. `BottomNav.svelte` wraps `TabBar` with the same destinations.
- Profile: `AccountPanel` for apps (sync status, sign-out, `DeviceDataCard` for backups). A site with no containers
  of its own composes `SignInCard` (`emailLink={false}` for Google only) with its own cards.
- `+error.svelte` for unknown addresses: GitHub Pages serves `404.html` (the SPA shell) for every path.
- Logic that decides things (what a screen starts with, what an action changes) goes in plain TypeScript or a
  small rune class next to the domain code, with unit tests; the page wires it to markup.

## 6. CI, deploys and operations

Copy from `node_modules/@wells-nelson/build-tools/templates/`:

- `deploy-pages.yml` → `.github/workflows/deploy.yml` (replace `__REPO__`)
- `ci.yml`, `published-packages.yml` → `.github/workflows/`
- `database.yml` → `.github/workflows/` (replace `__SCHEMA__`)

Each is a few lines that call a reusable workflow in this repository at `@v1` (`site-ci.yml`, `site-deploy.yml`,
`site-published-packages.yml`, `site-database.yml`). Don't copy steps into the site: change the reusable
workflow here, and every site gets it once `v1` moves (see CONTRIBUTING.md).

Write `README.md` (what it is, how it's organized), `CONTRIBUTING.md` (branches and pull requests, local
development, tests, configuration, the site's Supabase setup; link [OPERATIONS.md](OPERATIONS.md) for the
database, deploys and releases), `docs/spec.md` (what it does) and `docs/style.md` (how it looks and behaves).

Manual steps to list for the owner are in [OPERATIONS.md](OPERATIONS.md#repository-settings), plus, in Supabase:
run the migration, expose the schema (**Data API → Exposed schemas**), and add the site's URLs to the auth
**Redirect URLs** (and the Google OAuth client's JavaScript origins).

## 7. Trying unreleased package changes

Change the package here, then `npm run try -- ../my-site`: it builds and packs every package and installs the
tarballs the site uses. Run it again after each change. CI rejects tarball dependencies on purpose; after the
release, the **Use published packages** workflow swaps them. Don't use `npm link` or a folder path: they load a
second copy of Svelte.

## 8. Verify like a user

- `npm run check && npm run lint && npm run format:check && npm test && npm run build` in the site.
- Serve `build/` under the base path the way Pages does (unknown paths answer with `404.html`): `vite preview`
  doesn't serve the CSP meta tag the way a production build does.
- Drive it in a headless browser at a desktop and a phone width: the content, the navigation, no console errors, the
  CSP meta tag, no Supabase requests while signed out, and no service worker for a website.

## Things that have bitten before

- **Windows:** run Vitest from a terminal whose path starts with an upper-case drive letter (`C:\…`); a lower-case
  `c:\…` loads Vitest twice and every test fails reading `config`. PowerShell 5 can't write UTF-8 without a BOM:
  write generated SQL from Node or bash. `.gitattributes` keeps line endings LF.
- **SQL:** `language sql` functions are checked when created, so they can't mention a table created later in the
  same file (use `plpgsql`). Supabase's SQL editor doesn't understand psql variables (`:'name'`); the shared ops
  SQL uses them and runs under psql.
- **String replacement:** `String.prototype.replace` treats `$$` in the replacement as `$`. SQL is full of `$$`:
  use `split(...).join(...)` or a replacement function. Shell heredocs can also halve backslashes in generated
  code: check regular expressions after writing them, or use `String.raw`.
- **Svelte 5:** `MediaQuery` calls `matchMedia` when created; create it lazily (as `phoneLayout` does) so tests and
  servers without it don't fail. Size bindings use `ResizeObserver`, which jsdom lacks. Delegated events (`onkeydown`
  and friends) only reach handlers if a test dispatches them with `bubbles: true`. `$state` only works in
  `.svelte` and `.svelte.ts` files, not in a plain `.test.ts`.
- **Public repository:** this library is public. Nothing in it names or describes the private sites built on it.
