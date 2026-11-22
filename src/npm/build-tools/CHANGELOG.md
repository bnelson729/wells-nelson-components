# Changelog: @wells-nelson/build-tools

## Unreleased (minor)

- `/kit` `siteKit()`: the SvelteKit options every site shares (static SPA, base path, CSP, runes, version).
- `/vitest` `siteVitest()`, `/eslint` `siteEslint()` and `/prettier`: a site's test, lint and format configs.
- Workflow templates are now short callers of the library's reusable workflows at `@v2`; the database SQL
  lives in the library (`ops/sql`), so `templates/supabase-ops` is gone. **Sites:** delete `supabase/ops/`.
- `ci.yml` does the package swap itself (pushed with the site's `PAT` secret), and `deploy-pages.yml` runs it
  before deploying, so `published-packages.yml` is gone. `database.yml` passes `secrets: inherit`, without
  which the database password never reaches the workflow. **Sites:** copy the three templates again, delete
  `published-packages.yml`, and add the `PAT` secret.

## 1.1.1 and earlier

See the git tags `@wells-nelson/build-tools@<version>`.
