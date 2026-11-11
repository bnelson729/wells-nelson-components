# @wells-nelson/build-tools

Build and deployment tooling for SvelteKit PWAs deployed to GitHub Pages.

## CLIs

```json
"scripts": {
	"build": "vite build && wn-postbuild --forbid-from seed/demo.json#people.name",
	"icons": "wn-icons --letters MA --background \"#1f5fa8\"",
	"manifest": "wn-manifest --name \"My App\" --short-name MA --background \"#f3f5f8\" --theme \"#1f5fa8\" --description \"…\""
}
```

- `wn-postbuild`: copies `build/404.html` to `index.html` and writes `.nojekyll`. Optional
  leak check: `--forbid <text>` or `--forbid-from <file.json>#<path>` fails the build if those
  strings appear in it (a missing file is skipped, e.g. a git-ignored seed in CI).
- `wn-icons`: `static/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` and
  `static/favicon.svg` from one to three letters (A–Z) and colors. No dependencies.
- `wn-manifest`: `static/manifest.webmanifest`.

The same functions are exported: `postbuild`, `collectStrings`, `writeIcons`, `renderPng`,
`renderSvg`, `renderManifest`.

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

## Templates

`templates/deploy-pages.yml` (replace `__REPO__`) and `templates/manifest.webmanifest`.

Try the icons, manifest, `basePath` and `postbuild` in the sandbox's Build tools page.
