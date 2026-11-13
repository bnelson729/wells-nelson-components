# Contributing to wells-nelson-components

How to work on the packages: setup, the sandbox, checks, how changes reach `main`, and releases. What
each package offers is in its own README under [src/npm](src/npm); releases and npm setup are in
[PUBLISHING.md](PUBLISHING.md).

## How changes reach `main`

Every push to `main` runs the [Packages](.github/workflows/packages.yml) workflow, and each package whose
shipped files changed is **published to npm**: a patch, unless a commit says otherwise (below). So `main`
should only ever get commits that pass the checks below.

- **Maintainers** may commit directly to `main`. Run `npm run check && npm run lint && npm test` first (and try
  the change in the sandbox); a red `main` blocks the next release.
- **Larger or riskier changes**, and **everyone else**, use a branch and a pull request:
  `git switch -c <type>/<short-topic>` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`), push, and open a
  pull request to `main`. The Packages workflow builds, type-checks, tests and packs every package on the
  pull request, without publishing. Merge once it's green.
- **Say how big the change is in the commit message**: a line `Release: minor` for a new feature (a new
  component, option, export or a changed default), `Release: major` for a breaking change. The release takes
  the biggest one among the package's commits since its last release; without one it's a patch. A manual run
  (**Actions → Packages → Run workflow**) can still choose. A breaking change also needs a note in the package
  README on how to upgrade.

Whatever the route, each change comes with:

- a test in the package's `src/tests` (Vitest);
- an example in the sandbox when it's visible or interactive;
- the package README updated (props, options, defaults);
- a line under **Unreleased** in the package's `CHANGELOG.md` (what changed, in a sentence, and what a site
  has to do, if anything); a release moves them under its version;
- defaults that keep existing apps working unless they opt in.

**Four packages are enough.** Their split follows their dependencies (UI, interactive UI, storage, build), and
sites upgrade all of them together. Add a fifth only for something with different dependencies or users, and
never just to group code.

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
npm run lint         # ESLint (after a build): floating promises, unused code
npm run format       # Prettier; CI runs npm run format:check
npm test             # vitest in each package, then the release scripts' tests
npm run pack:all     # tarballs in packs/
```

One package: `npm run build -w src/npm/displays` (build `displays` before working on
`interactions`, which compiles against its `dist`).

The Packages workflow runs one job per package (build, type-check, test, publint, pack) and uploads each
tarball as an artifact. A second job checks that the packages' types fit together
([tests/compat](tests/compat)), that lint and formatting pass, that the sandbox compiles, and that the release
scripts pass their tests.

### Changes to the generated SQL

`generateMigration` in `data-storage` writes an app's whole schema. Apps keep the migrations they've applied
and add a new numbered file for every change, so when you change the generated SQL:

- keep `sql.test.ts` asserting the new statements; `sql-apply.test.ts` applies every variant to a real Postgres
  (PGlite) and runs the nightly security lint from [ops/sql](ops/sql) on it;
- say in the package README what changed, so an app can carry it over into its next migration;
- prefer statements an app can re-run safely (`create or replace function`, `drop policy if exists`).

### Changes to the reusable workflows

Sites call `.github/workflows/site-*.yml` and `use-published-packages.yml` at the tag `v1`, which you move by
hand, so a change on `main` reaches no site until you do. `site-database.yml` runs the SQL in
[ops/sql](ops/sql) at its own commit, so the SQL moves with the tag. To ship a change:

1. Merge it to `main`.
2. Try it from one site: point that site's caller at `@main` on a branch, run the workflow, and put it back.
3. Move the tag: `git tag -f v1 && git push -f origin v1`. Every site uses it from its next run.

A change that breaks callers (a removed input, a new required input, more permissions) goes to `v2` instead,
and each site moves its callers when it's ready. Either way:

- keep inputs backwards compatible (new inputs get defaults), and don't ask for permissions the callers don't
  grant: a job that wants more than its caller gives fails before it starts, even if it wouldn't run;
- update the caller templates in `src/npm/build-tools/templates/`, the README's "Reusable workflows" table and
  [OPERATIONS.md](OPERATIONS.md).

### Trying a change in an app

`npm run try -- ../my-site` builds and packs every package and installs the tarballs into the site (only the
packages it uses, each in its own section of package.json). Installing the package folder instead (or
`npm link`) can load a second copy of shared dependencies. Once the change is released,
the app's pull request switches back to the published versions; see
[Trying unreleased changes in an app](README.md#trying-unreleased-changes-in-an-app).

## Releases

On `main`, each package whose shipped files changed since its last release is published to npm with its own
version, tagged `@wells-nelson/<package>@<version>`. Setup, auth and manual releases:
[PUBLISHING.md](PUBLISHING.md).
