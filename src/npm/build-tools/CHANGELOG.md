# Changelog: @wells-nelson/build-tools

The heading `## Unreleased (patch|minor|major)` decides the next release's version, and the release
turns it into `## <version> (<date>)`. See [PUBLISHING.md](../../../PUBLISHING.md).

## Unreleased (minor)

- New `wn-check-design` (and `checkDesign`): the design check. Raw colors in components and styles reaching into
  library internals are errors; literal font sizes and z-indexes are warnings (`--strict` makes them errors,
  `--warn` reports without failing). **Sites:** add `"check:design": "wn-check-design"` to `package.json`.
- The shared site CI runs `npm run check:design` when a site has it, and the site's end-to-end tests
  (`npm run test:e2e`, Playwright with Chromium) when it has those. Takes effect when the `v2` tag moves.

## 1.2.2 (2026-11-24)

- `/playwright` `layoutProblems(page, { phoneWidth })`: for end-to-end tests, the elements (and list markers)
  printed outside their page column, modal or the screen, unless marked `data-may-overflow`; with `phoneWidth`,
  page columns and modals wider than a phone, on any screen.

## 1.2.1 (2026-11-21)

- `ci.yml` does the package swap itself (pushed with the site's `PAT` secret), and `deploy-pages.yml` runs it
  before deploying, so `published-packages.yml` is gone. `database.yml` passes `secrets: inherit`, without
  which the database password never reaches the workflow. **Sites:** copy the three templates again, delete
  `published-packages.yml`, and add the `PAT` secret.

## 1.2.0 (2026-11-12)

- `/kit` `siteKit()`: the SvelteKit options every site shares (static SPA, base path, CSP, runes, version).
- `/vitest` `siteVitest()`, `/eslint` `siteEslint()` and `/prettier`: a site's test, lint and format configs.
- Workflow templates are now short callers of the library's reusable workflows at `@v2`; the database SQL
  lives in the library (`ops/sql`), so `templates/supabase-ops` is gone. **Sites:** delete `supabase/ops/`.

## 1.1.1 and earlier

See the git tags `@wells-nelson/build-tools@<version>`. Versions 1.2.1 and later were released as patches (the bump then came from commit
messages) although some added features; their headings were reconstructed from git history.
