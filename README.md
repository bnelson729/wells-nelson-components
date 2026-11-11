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
| [`@wells-nelson/build-tools`](src/npm/build-tools) | `wn-postbuild`, `wn-icons`, `wn-manifest` CLIs, Vite helpers (base path, dependency pre-bundling, Content Security Policy), the app-shell service worker, and Pages workflow / manifest templates |

Dependencies between them: `interactions` depends on `displays`. Nothing else depends on another
package. The account components in `interactions/account` describe what they need from the sync
layer as plain interfaces (`CloudStatus`, `AccountActions`, `MembersApi`); `data-storage`'s
`CloudSync` and members API satisfy them, which [tests/compat](tests/compat) checks.

## Contributing

Setup, the sandbox, checks, how changes reach `main` and how packages are released:
[CONTRIBUTING.md](CONTRIBUTING.md) and [PUBLISHING.md](PUBLISHING.md).

## Trying unreleased changes in an app

Pack the packages (`npm run pack:all`) and install the tarballs in the app
(`npm install ../wells-nelson-components/packs/wells-nelson-displays-0.0.0.tgz`). Once the change is
published, the reusable workflow
[use-published-packages.yml](.github/workflows/use-published-packages.yml) puts the app back on npm: on
the app's pull request it replaces each `file:…tgz` dependency with the latest published version,
reinstalls, runs the app's checks and commits package.json and package-lock.json to the branch.
Its `replaced` output lists what it swapped.

```yaml
# the app's .github/workflows/published-packages.yml
on:
  pull_request:
    paths: [package.json, package-lock.json]
permissions:
  contents: write
jobs:
  packages:
    uses: bnelson729/wells-nelson-components/.github/workflows/use-published-packages.yml@main
    with:
      verify: npm run check && npm test && npm run build # default: check, test and build, each if present

  # A commit pushed with GITHUB_TOKEN doesn't start the pull request's other workflows; start the
  # app's CI on it so its required check reports on the new commit.
  ci:
    needs: packages
    if: needs.packages.outputs.replaced != ''
    runs-on: ubuntu-latest
    permissions:
      actions: write
    steps:
      - run: gh workflow run ci.yml --repo "$GITHUB_REPOSITORY" --ref "$GITHUB_HEAD_REF"
        env:
          GH_TOKEN: ${{ github.token }}
```

The app's CI workflow then needs `workflow_dispatch` among its triggers, and should fail while
`package.json` still has a `file:…tgz` dependency, so such a branch can't be merged.

Other inputs: `scope` (default `@wells-nelson/`), `dist-tag`, `node-version`, `working-directory`,
`commit-message`. Forks are skipped. Instead of the `ci` job above, a `token` secret (a fine-grained token
with Contents: write) makes the push itself trigger the pull request's workflows.

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
