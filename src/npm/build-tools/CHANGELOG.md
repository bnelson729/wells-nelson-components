# Changelog: @wells-nelson/build-tools

## Unreleased (minor)

- `/kit` `siteKit()`: the SvelteKit options every site shares (static SPA, base path, CSP, runes, version).
- `/vitest` `siteVitest()`, `/eslint` `siteEslint()` and `/prettier`: a site's test, lint and format configs.
- Workflow templates are now short callers of the library's reusable workflows at `@v1`; the database SQL
  lives in the library (`ops/sql`), so `templates/supabase-ops` is gone. **Sites:** delete `supabase/ops/`.

## 1.1.1 and earlier

See the git tags `@wells-nelson/build-tools@<version>`.
