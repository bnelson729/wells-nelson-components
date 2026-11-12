# Onboarding: a new site on this framework

A recipe for creating a new site (an app or a website) on the `@wells-nelson/*` packages, written so an AI agent
can follow it end to end. It assumes the site lives in its own repository next to this one
(`../wells-nelson-components`), is deployed to GitHub Pages and, if it signs people in, uses Supabase.

Read the package READMEs for the APIs: [displays](src/npm/displays/README.md),
[interactions](src/npm/interactions/README.md), [data-storage](src/npm/data-storage/README.md),
[build-tools](src/npm/build-tools/README.md).

## 1. Decide before writing code

| Question | App (offline-first, installable) | Website (pages, maybe a profile) |
| --- | --- | --- |
| PWA | Service worker (`registerAppShellCache`, its own `cachePrefix`) and `static/manifest.webmanifest` | Neither; no `src/service-worker/`, no manifest link |
| Touch behavior | `<html class="touch-app">` (no accidental text selection), `preventZoom()` in the root layout | Neither: normal selection and zoom |
| Storage persistence | default (`requestPersistence()` on start) | `persistStorage: false` (some browsers ask the user) |
| Splash | Wait for `app.ready` before rendering pages | Render pages at once; only pages that need data wait |
| Navigation | `AppHeader` (labeled `IconButton`s) on wide screens, `TabBar` when `phoneLayout.current` | Same |

Then the data:

- **The container.** Everything that's shared and synced hangs off one *container* collection (a project, a
  list…), and every other collection has a `<container>_id` field. A per-person record (a profile) is a container
  with no children whose id is the user's id.
- **The Postgres schema.** One schema per site (`snake_case` of the site name), so sites can share a Supabase
  project and its sign-in.
- **The `appKey`.** A short prefix for IndexedDB names and localStorage keys. Sites on `<user>.github.io` share
  one origin, so it must be unique; the Supabase session key defaults to `<appKey>-auth`.
- **Roles.** `roles: true` gives viewer / editor / owner sharing; without, every member is an owner.

## 2. Create the repository

Work on a branch (`git switch -c feat/initial-site`); `main` deploys. Then add these files.

**`package.json`**: `"type": "module"`, `"imports": { "#lib/*": "./src/lib/*" }`, and the scripts:

```json
"dev": "vite dev",
"build": "vite build && wn-postbuild",
"preview": "vite preview",
"prepare": "svelte-kit sync || echo ''",
"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
"test": "vitest run",
"icons": "wn-icons --letters AB --background \"#1f5fa8\"",
"migration": "node scripts/migration.mjs"
```

Dependencies: `@sveltejs/kit`, `@sveltejs/adapter-static`, `@sveltejs/vite-plugin-svelte`, `svelte`,
`svelte-check`, `typescript`, `vite`, `vitest` and `@wells-nelson/build-tools` (dev); `@supabase/supabase-js`,
`@tanstack/db`, `@tanstack/rxdb-db-collection`, `@tanstack/svelte-db`, `rxdb`, `rxjs` and the three
`@wells-nelson/*` runtime packages. Add `"overrides": { "rxdb": "$rxdb" }` so there's one RxDB.

**`vite.config.js`**:

```js
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { basePath, contentSecurityPolicy, optimizeDeps } from '@wells-nelson/build-tools/vite';
import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';

const version = process.env.APP_VERSION || `${JSON.parse(readFileSync('package.json', 'utf8')).version}-local`;

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	return {
		server: { port: 5176 }, // a port no other site uses
		plugins: [
			sveltekit({
				adapter: adapter({ fallback: '404.html' }),
				paths: { base: basePath({ mode, env, fallback: '/my-site' }) }, // the repository name
				csp: contentSecurityPolicy({ supabaseUrl: env.VITE_SUPABASE_URL }),
				compilerOptions: { runes: true },
				version: { name: version }
			})
		],
		optimizeDeps: optimizeDeps()
	};
});
```

**`vitest.config.js`**: tests run without the SvelteKit plugin (it needs a dev server Vitest doesn't provide):

```js
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [svelte()],
	resolve: { alias: { '$app/env': fileURLToPath(new URL('./src/test/app-env.ts', import.meta.url)) } },
	test: { environment: 'node', include: ['src/**/*.test.ts'], server: { deps: { inline: [/@wells-nelson\//] } } }
});
```

with `src/test/app-env.ts` exporting `version = 'test'`, `dev = false`, `building = false`.

**Also:** `tsconfig.json` (`"extends": "$app/tsconfig"`, strict), `.gitignore` (`node_modules`, `/build`,
`/.svelte-kit`, `.env*` except `!.env.example`), `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`BASE_PATH`), `src/app.d.ts` (declares the two `VITE_` variables), `src/app.html` (viewport with
`viewport-fit=cover`, theme color, favicon), and `src/routes/+layout.ts` with `ssr = false` and `prerender = false`.
Run `npm run icons` for the favicon and icons.

## 3. The storage layer

```
src/lib/types.ts     document interfaces (flat: string / number / boolean; snake_case; id, updated_at)
src/lib/schema.ts    COLLECTION_NAMES (container first) and flatSchema(...) per collection
src/lib/store.ts     createSyncedStore({...}) and its exports
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

The root layout imports `@wells-nelson/displays/theme.css`, then `../app.css` (palette overrides; a palette is the
`--accent*` tokens, light and dark), then the module that calls `registerIcons`, and calls `store.init()` in
`onMount`. Read data with `useLiveQuery((q) => q.from({ p: app.cloud.projects }))`; write with the store's row helpers
(`ops.insertDoc`, `ops.patch`, `ops.removeDocs`, `ops.createContainer`…), never with RxDB directly.

## 4. The database

Generate the first migration from a script in the repository, so it can be regenerated and tested:

```js
// scripts/migration.mjs: `npm run migration > supabase/migrations/0001_init.sql`
import { generateMigration } from '@wells-nelson/data-storage/sql';
/** @type {import('@wells-nelson/data-storage/sql').MigrationTable[]} */
export const tables = [
	{ name: 'projects', columns: { name: 'text', created_at: 'number', updated_at: 'number' } },
	{ name: 'tasks', columns: { project_id: { type: 'text', default: null }, title: 'text', updated_at: 'number' } }
];
export const migration = () =>
	generateMigration({ container: 'projects', containerField: 'project_id', noun: 'project', roles: true, schema: 'project_manager', tables })
	+ ownRules; // the site's own SQL, e.g. a restrictive policy
```

- List **every** column except `id`, including `updated_at`; nothing is added for you.
- Add a unit test that compares `tables` with `tablesFromSchemas(COLLECTION_NAMES, schemas, { containerField })`, and
  one that the committed `0001_init.sql` equals `migration()`.
- Extra rules go after the generated SQL. Prefer `as restrictive` policies, which narrow the generated ones (e.g. "a
  profile's id is its owner's user id": `using (id = (select auth.uid())::text) with check (…)`).
- Once applied anywhere, never regenerate `0001`: changes go in `0002_<what>.sql`, re-runnable and in a transaction.
- Copy `supabase-ops/*.sql` from the build-tools templates into `supabase/ops/` and replace `__SCHEMA__`. Run
  `security-lint.sql` after every migration: no rows means it passed.

Before handing it over, apply it to a real Postgres: [PGlite](https://pglite.dev) (`@electric-sql/pglite`) runs
Postgres 17 in Node. Stub what Supabase provides (roles `anon` / `authenticated` / `service_role`, `auth.users`,
`auth.uid()` reading a setting, `create publication supabase_realtime`, and grants on `public` if you use it), apply
the migration, run the lint, and act as two users (`set role authenticated` plus the setting) to check each sees only
their own rows. The data-storage tests (`sql-apply.test.ts`) show the stub.

## 5. Pages and shell

- `AppShell.svelte`: `{#if !phoneLayout.current}<Header />{/if}`, `<main>` with `padding-top: calc(var(--header-h) +
  env(safe-area-inset-top, 0px))`, the `cloud.rejectedWrite` and `app.writeError` banners, then
  `{#if phoneLayout.current}<BottomNav />{/if}`. `TabBar` sets `--header-h: 0px` and `--footer-offset` while shown.
- `Header.svelte` wraps `AppHeader`: `labels="always"`, nav `IconButton`s with `showLabel`, the profile avatar
  without a label.
- Profile: `AccountPanel` for apps (sync status, sign-out, `DeviceDataCard` for backups). A site with no containers
  of its own composes `SignInCard` (`emailLink={false}` for Google only) with its own cards.
- `+error.svelte` for unknown addresses: GitHub Pages serves `404.html` (the SPA shell) for every path.

## 6. CI, deploys and operations

Copy from `node_modules/@wells-nelson/build-tools/templates/`:

- `deploy-pages.yml` → `.github/workflows/deploy.yml` (replace `__REPO__`)
- `ci.yml`, `published-packages.yml` → `.github/workflows/`
- `database.yml` → `.github/workflows/` (replace `__SCHEMA__`)

Each is a few lines that call a reusable workflow in this repository (`site-ci.yml`, `site-deploy.yml`,
`site-published-packages.yml`, `site-database.yml`; see the README's "Reusable workflows"). Don't copy steps
into the site: change the reusable workflow here instead, and every site gets it. The site keeps its own
settings (repository variables, the `database` environment) and its `supabase/ops/` SQL.

Write `README.md` (what it is, how it's organized), `CONTRIBUTING.md` (branches and pull requests, local
development, configuration, Supabase setup, migrations, the nightly workflow and its `database` environment,
deploying, custom domain), `docs/spec.md` (what it does) and `docs/style.md` (how it looks and behaves).

Manual steps to list for the owner: repository variables `SUPABASE_URL` / `SUPABASE_ANON_KEY` (and `BASE_PATH` for
a custom domain); Pages source **GitHub Actions**; branch protection requiring **ci / Check, test and build**; the
`database` environment (variable `SUPABASE_DB_URL` without the password, secret `SUPABASE_DB_PASSWORD`); in Supabase,
run the migration, expose the schema (**Data API → Exposed schemas**), and add the site's URLs to the auth
**Redirect URLs** (and the Google OAuth client's JavaScript origins).

## 7. Trying unreleased package changes

Change the package here, `npm run pack:all`, then in the site
`npm install ../wells-nelson-components/packs/wells-nelson-<package>-0.0.0.tgz`. A changed tarball needs installing
again. CI rejects tarball dependencies on purpose; after the release, the **Use published packages** workflow swaps
them. Don't use `npm link` or a folder path: they load a second copy of Svelte.

## 8. Verify like a user

- `npm run check && npm test && npm run build` in the site.
- Serve `build/` under the base path the way Pages does (unknown paths answer with `404.html`): `vite preview`
  doesn't serve the CSP meta tag the way a production build does.
- Drive it in a headless browser at a desktop and a phone width: the content, the navigation, no console errors, the
  CSP meta tag, no Supabase requests while signed out, and no service worker for a website.

## Things that have bitten before

- **Windows:** run Vitest from a terminal whose path starts with an upper-case drive letter (`C:\…`); a lower-case
  `c:\…` loads Vitest twice and every test fails reading `config`. Files may have CRLF line endings: edit them with
  tools that keep them. PowerShell 5 can't write UTF-8 without a BOM: write generated SQL from Node or bash.
- **SQL:** `language sql` functions are checked when created, so they can't mention a table created later in the
  same file (use `plpgsql`). Supabase's SQL editor doesn't understand psql variables (`:'name'`).
- **String replacement:** `String.prototype.replace` treats `$$` in the replacement as `$`. SQL is full of `$$`:
  use `split(...).join(...)` or a replacement function.
- **Svelte 5:** `MediaQuery` calls `matchMedia` when created; create it lazily (as `phoneLayout` does) so tests and
  servers without it don't fail. Size bindings use `ResizeObserver`, which jsdom lacks. Delegated events (`onkeydown`
  and friends) only reach handlers if a test dispatches them with `bubbles: true`.
- **Public repository:** this library is public. Nothing in it names or describes the private sites built on it.
