# @wells-nelson/build-tools

Build and deployment tooling for SvelteKit sites (apps and websites) deployed to GitHub Pages, including the
configs every site shares.

## A site's configs

```js
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { siteKit } from '@wells-nelson/build-tools/kit';
import { optimizeDeps } from '@wells-nelson/build-tools/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
	server: { port: 5176 },
	plugins: [sveltekit(siteKit({ mode, base: '/my-site', pollUpdates: true }))],
	optimizeDeps: optimizeDeps()
}));
```

`siteKit` returns the SvelteKit options every site shares: adapter-static with a `404.html` fallback,
`paths.base` from `BASE_PATH` (else `base`; `/` in development), the Content Security Policy for
`VITE_SUPABASE_URL` (`connect` / `img` add sources), runes, and the version (`APP_VERSION` from the deploy,
else `<package.json version>-local`). `pollUpdates` checks for a new deploy every 5 minutes (apps).

```js
// vitest.config.js: Svelte without the SvelteKit plugin; $app/env stands in with version 'test'
import { siteVitest } from '@wells-nelson/build-tools/vitest';
export default siteVitest();

// eslint.config.js: no-floating-promises and no-unused-vars, type-aware, over src/
import { siteEslint } from '@wells-nelson/build-tools/eslint';
export default siteEslint();
```

```ts
// e2e/*.spec.ts: nothing printed outside its page column, modal or the screen; a phone-sized app's
// columns and modals no wider than a phone, on any screen
import { layoutProblems } from '@wells-nelson/build-tools/playwright';
expect(await layoutProblems(page, { phoneWidth: 480 })).toEqual([]);
```

`layoutProblems` names each element (or list marker) that reaches outside its frame (`.page` or an open
`dialog`, or the screen); add `data-may-overflow` to an element that's meant to. With `phoneWidth`, a frame
wider than that is a problem too: pair it with `--content-w` and `--modal-max-w` no wider than a phone.

In package.json, `"prettier": "@wells-nelson/build-tools/prettier"` (tabs, single quotes, 120 columns, Svelte).
The site installs the tools these use: `@sveltejs/adapter-static`, `@sveltejs/vite-plugin-svelte`, `vitest`,
`eslint`, `typescript-eslint`, `eslint-plugin-svelte`, `prettier`, `prettier-plugin-svelte`.

## CLIs

```json
"scripts": {
	"build": "vite build && wn-postbuild --forbid-from seed/demo.json#people.name",
	"icons": "wn-icons --letters MA --background \"#1f5fa8\"",
	"check:design": "wn-check-design",
	"manifest": "wn-manifest --name \"My App\" --short-name MA --background \"#f3f5f8\" --theme \"#1f5fa8\" --description \"…\""
}
```

- `wn-postbuild`: copies `build/404.html` to `index.html` and writes `.nojekyll`. Optional
  leak check: `--forbid <text>` or `--forbid-from <file.json>#<path>` fails the build if those
  strings appear in it (a missing file is skipped, e.g. a git-ignored seed in CI).
- `wn-icons`: `static/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` and
  `static/favicon.svg` from one to three letters (A–Z) and colors. No dependencies.
- `wn-manifest`: `static/manifest.webmanifest`.
- `wn-check-design`: the design check, run by the shared CI as `npm run check:design`. In `src/`, a raw color
  in a component's styles (tokens only; a site's own tokens live in `src/app.css`) and a selector reaching into a
  library component's internals (`:global(.icon-btn)`, `.line .icon-btn` in a global stylesheet) are errors;
  literal font sizes and z-indexes are warnings (errors with `--strict`). Each finding says what to use
  instead; a `design-allow: <reason>` comment on the line (or the one above) allows it. `--warn` reports
  without failing, for a site still moving over.

The same functions are exported: `postbuild`, `collectStrings`, `writeIcons`, `renderPng`,
`renderSvg`, `renderManifest`, `checkDesign`, `formatFindings`.

## Vite (`@wells-nelson/build-tools/vite`)

```js
import { basePath, devJsonModule, optimizeDeps } from '@wells-nelson/build-tools/vite';

export default defineConfig(({ mode, command }) => ({
	plugins: [
		devJsonModule({ id: 'virtual:seed', file: 'seed/demo.json', enabled: command === 'serve' }),
		sveltekit({ adapter: adapter({ fallback: '404.html' }), paths: { base: basePath({ mode, env: loadEnv(mode, process.cwd(), ''), fallback: '/my-app' }) } })
	],
	optimizeDeps: optimizeDeps(['some-lazily-loaded-dep'])
}));
```

### Content Security Policy

`contentSecurityPolicy({ supabaseUrl })` returns SvelteKit `csp` options: hashes for SvelteKit's inline
scripts and no other scripts, network access only to the app and its Supabase project (REST and
Realtime), images from the app, `data:`/`blob:` and Google profile pictures. Pass `connect` / `img` for
more sources.

```js
sveltekit({ csp: contentSecurityPolicy({ supabaseUrl: env.VITE_SUPABASE_URL }), ... })
```

## Service worker (`@wells-nelson/build-tools/service-worker`)

```ts
/// <reference types="@sveltejs/kit" />
import { dev, version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self } from '$app/service-worker';
import { registerAppShellCache } from '@wells-nelson/build-tools/service-worker';

registerAppShellCache({ sw: self, version, dev, files: [...immutable, ...assets], cachePrefix: 'my-app' });
```

Navigations go to the network first, so starting the app online always loads the latest deploy;
offline they fall back to the cached shell. A new worker skips waiting and takes over open
pages. `networkOnly` paths are never cached (default: SvelteKit's `_app/version.json`, so
`updated` from `$app/state` notices new deploys). `dev` caches nothing.

On activate a worker deletes only its own older caches (`<cachePrefix>-cache-*`). Give each app
on an origin its own `cachePrefix`: GitHub Pages project sites of one user all share
`https://<user>.github.io`.

## Templates

Copy them from `node_modules/@wells-nelson/build-tools/templates/` into a new site (see ONBOARDING.md in
the repository). The workflow templates are a few lines each: triggers, permissions and a call to one of
the library's reusable workflows (see "Reusable workflows" in the repository README), where the steps live.

- `deploy-pages.yml` → `.github/workflows/deploy.yml` (replace `__REPO__`): the CI check, then build and deploy
  to Pages, with a version tag reserved before the build and a GitHub release after the deploy.
- `ci.yml` → `.github/workflows/` as it is: the pull request check, which also swaps local package tarballs for
  the published versions and commits that (with the site's `PAT` secret).
- `database.yml` → `.github/workflows/` (replace `__SCHEMA__`): nightly encrypted backup with a test restore,
  keep-alive, security lint and client error digest. The SQL it runs lives in the repository's `ops/sql`, so the
  site keeps none.
- `manifest.webmanifest`: for PWAs.

Try the icons, manifest, `basePath` and `postbuild` in the sandbox's Build tools page.
