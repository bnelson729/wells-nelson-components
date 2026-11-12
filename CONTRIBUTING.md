# Contributing to wells-nelson-components

How to work on the packages: setup, the sandbox, checks, how changes reach `main`, and releases. What
each package offers is in its own README under [src/npm](src/npm); releases and npm setup are in
[PUBLISHING.md](PUBLISHING.md).

## How changes reach `main`

Every push to `main` runs the [Packages](.github/workflows/packages.yml) workflow, and each package whose
shipped files changed is **published to npm** with a patch version. So `main` should only ever get
commits that pass the checks below.

- **Maintainers** may commit directly to `main`. Run `npm run check && npm test` first (and try the change in
  the sandbox); a red `main` blocks the next release.
- **Larger or riskier changes**, and **everyone else**, use a branch and a pull request:
  `git switch -c <type>/<short-topic>` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`), push, and open a
  pull request to `main`. The Packages workflow builds, type-checks, tests and packs every package on the
  pull request, without publishing. Merge once it's green.
- **New features** in a package (a new component, option or export) need a **minor** release: after merging,
  run **Actions → Packages → Run workflow** with that package and `minor`. Breaking changes need `major`, and a
  note in the package README on how to upgrade.

Whatever the route, each change comes with:

- a test in the package's `src/tests` (Vitest);
- an example in the sandbox when it's visible or interactive;
- the package README updated (props, options, defaults);
- defaults that keep existing apps working unless they opt in.

**This repository is public.** Code, tests, docs, commit messages and pull requests must not name or describe
the private apps that use these packages. Use generic examples (projects, tasks, lists). `docs/todo.md` and
`docs/review.md` are git-ignored working notes for that reason; keep them out of commits.

## Setup

You need Node.js 24 and npm.

```sh
npm install
npm run sandbox      # http://localhost:5180
```

### Sandbox

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

## Checks

```sh
npm run build        # all packages, in dependency order
npm run check        # svelte-check / tsc for each package and the sandbox, then the cross-package type check
npm test             # vitest in each package, then the release scripts' tests
npm run pack:all     # tarballs in packs/
```

One package: `npm run build -w src/npm/displays` (build `displays` before working on
`interactions`, which compiles against its `dist`).

The Packages workflow runs one job per package (build, type-check, test, publint, pack) and uploads each
tarball as an artifact. A second job checks that the packages' types fit together
([tests/compat](tests/compat)), that the sandbox compiles, and that the release scripts pass their tests.

### Changes to the generated SQL

`generateMigration` in `data-storage` writes an app's whole schema. Apps keep the migrations they've applied
and add a new numbered file for every change, so when you change the generated SQL:

- keep `sql.test.ts` asserting the new statements;
- say in the package README what changed, so an app can carry it over into its next migration;
- prefer statements an app can re-run safely (`create or replace function`, `drop policy if exists`).

### Changes to the reusable workflows

Sites call `.github/workflows/site-*.yml` and `use-published-packages.yml` at `@main`, so a change merged here
is in every site's next run. Before merging:

- try it from a site's branch by pointing its caller at your branch (`…/site-deploy.yml@<your-branch>`), and
  put the caller back to `@main` afterwards;
- keep inputs backwards compatible (new inputs get defaults), and don't ask for permissions the callers don't
  grant: a job that wants more than its caller gives fails before it starts, even if it wouldn't run;
- update the caller templates in `src/npm/build-tools/templates/` and the README's "Reusable workflows" table.

### Trying a change in an app

Pack the packages (`npm run pack:all`) and install the tarballs in the app
(`npm install ../wells-nelson-components/packs/wells-nelson-<package>-0.0.0.tgz`). Installing the package
folder instead (or `npm link`) can load a second copy of shared dependencies. Once the change is released,
the app's pull request switches back to the published versions; see
[Trying unreleased changes in an app](README.md#trying-unreleased-changes-in-an-app).

## Releases

On `main`, each package whose shipped files changed since its last release is published to npm with its own
version, tagged `@wells-nelson/<package>@<version>`. Setup, auth and manual releases:
[PUBLISHING.md](PUBLISHING.md).
