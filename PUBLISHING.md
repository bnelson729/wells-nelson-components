# Publishing

[.github/workflows/packages.yml](.github/workflows/packages.yml) publishes each package to the
public npm registry with its own version.

## How versions work

- Each package's releases are git tags named after it: `@wells-nelson/displays@0.3.2`,
  `@wells-nelson/data-storage@1.0.4`, …
- On every push to `main`, after all checks pass, a package is released when its shipped files
  changed since its latest tag. Changes only to its tests or Markdown don't count. Packages
  that were never released are released.
- [reecetech/version-increment](https://github.com/reecetech/version-increment) computes the next
  version from that package's latest tag: a **patch** bump by default. A package with no tag yet
  starts from 0.0.0, so its first automatic release is 0.0.1.
- The workflow writes the version into `package.json` only for the publish (in the repo it stays
  `0.0.0`), publishes, then pushes the tag.
- Packages publish one at a time in dependency order (`displays` before `interactions`).
  `interactions` declares `@wells-nelson/displays` as a peer dependency. At publish time its range
  becomes `>=<latest displays> <next major>`, so apps share one copy of the theme and icon
  registry.
- If a run publishes a version but fails before pushing its tag, the next run tags the commit npm
  recorded for that version and moves on, instead of failing or publishing twice.

Manual releases: **Actions → Packages → Run workflow** (on `main`). Choose:

- **packages:** comma-separated names (`displays, interactions, data-storage, build-tools`),
  `all`, or empty for "changed since last release".
- **increment:** `patch`, `minor` or `major`.

Use this for minor and major bumps.

## One-time setup

### 1. npm: own the `@wells-nelson` scope

1. Sign in at [npmjs.com](https://www.npmjs.com) with two-factor authentication turned on.
2. Create a free organization named **wells-nelson** (**Add organization**, free plan for public
   packages). The scope `@wells-nelson` belongs to that organization.
   If the name is taken, pick another scope and rename it in each `src/npm/*/package.json`
   `name`, in `@wells-nelson/` imports, and in `scripts/release/lib.mjs`.

### 2. GitHub: the release environment

1. Repo **Settings → Environments → New environment**, named **`npm-publish`** (the workflow's
   publish job runs in it; GitHub creates it on first use if you skip this).
2. Optional, recommended: under **Deployment branches and tags**, allow only `main`. Add
   **Required reviewers** if you want to approve each release.
3. If **Settings → Actions → General** limits which actions may run, allow
   `reecetech/version-increment`.
4. If you add tag rulesets that cover `@wells-nelson/*`, let GitHub Actions bypass them so the
   workflow can push release tags.

The repo must be public: packages are published with
[provenance](https://docs.npmjs.com/generating-provenance-statements), which links each
version to the commit and workflow run that built it.

### 3. Auth for the first release (token)

npm's trusted publishing (step 4) is configured per package, and a package has to exist before
you can configure it. So the first release of each package uses a short-lived token:

1. npmjs.com → your avatar → **Access Tokens → Generate New Token → Granular Access Token**:
   - **Expiration:** as short as you like (a week is plenty).
   - **Packages and scopes:** *Read and write*, limited to the **@wells-nelson** scope (or all
     packages, if the scope can't be selected before anything is published).
   - **Bypass two-factor authentication** for publishing: on (CI can't answer a 2FA prompt).
2. GitHub repo **Settings → Environments → `npm-publish` → Environment secrets → Add secret**:
   name **`NPM_TOKEN`**, value the token. (An environment secret is only visible to the publish
   job.)
3. Release. Either push to `main`, or run the workflow manually with packages `all`. To start at
   0.1.0 instead of 0.0.1, choose increment `minor`; for 1.0.0, `major`.
4. Check the four packages on npm and the four tags in GitHub.

### 4. Switch to trusted publishing (no secrets)

For **each** of the four packages, on npmjs.com → the package → **Settings → Trusted
Publisher → GitHub Actions**:

| Field | Value |
| --- | --- |
| Organization or user | `bnelson729` |
| Repository | `wells-nelson-components` |
| Workflow filename | `packages.yml` |
| Environment name | `npm-publish` |
| Allowed actions | tick **Allow npm publish** |

**Allow npm publish matters.** New trusted publishers default to `npm stage publish` only (a
version is uploaded hidden and waits for someone to approve it with 2FA). This workflow runs
`npm publish`, so without that box the publish fails with **"OIDC permission denied for this
action"**. npm can't edit an existing connection; to change it, delete the trusted publisher
and add it again. A new connection must complete a successful publish within 2 days.

Then:

1. Delete the `NPM_TOKEN` secret from the `npm-publish` environment and revoke the token on npm.
2. Optional, recommended: in each package's **Settings → Publishing access**, choose the option
   that requires two-factor authentication and disallows tokens. After that, only this
   workflow (through OIDC) can publish.

From then on, `npm publish` in the workflow authenticates with a short-lived OIDC token from
GitHub. It needs the job's `id-token: write` permission, which is set, and npm 11.5.1 or newer,
which ships with Node 24. A new package added to the repo goes through steps 3 and 4 once.

If a release failed (for example with the OIDC error above), fix the setting and use **Re-run
failed jobs** on that workflow run. Nothing was published or tagged, so it retries the same
versions. The `0.0.0-stage` versions npm shows are placeholders from staged publishing; they're
harmless and never become `latest`.

## Adding a package

1. Create it under `src/npm/<name>` with `"version": "0.0.0"`, `repository` (with `directory`),
   and `"publishConfig": { "access": "public", "provenance": true }`. Copy these from an
   existing package.
2. Reference sibling packages with `"*"`; the release script turns those into real ranges.
3. Add it to `PACKAGES` in `scripts/release/lib.mjs`, after anything it depends on.
4. Add it to the `package` job's matrix and the root `package.json` workspaces.
5. Publish its first version with a token, then configure its trusted publisher (steps 3–4).
