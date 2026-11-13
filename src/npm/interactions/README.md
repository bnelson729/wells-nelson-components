# @wells-nelson/interactions

Svelte 5 inputs, actions and account UI. Peer dependencies: `@wells-nelson/displays` (install it
alongside, so the app and this package share one theme and icon registry) and `svelte`. No
storage dependency: the account components take the sync layer through interfaces.

```sh
npm install @wells-nelson/displays @wells-nelson/interactions
```

## Inputs

`TextField` (label, error, hint), `Checkbox` (optionally hidden label), `Toggle` (a switch for
settings that apply at once), `Combobox` (type to filter, offers "Create …"; plus `sameName`. Inside
something that scrolls, like a `Modal`, opening it near the end adds room below so its options
aren't cut off),
`AddRow` (inline "name + plus" that refocuses), `Segmented` (one of a few) and `SearchBar`
(fixed at the bottom, with a clear button; it sits above a `TabBar` via `--footer-offset`, as
does `UndoButton`).

```svelte
<ActiveList
	items={people}
	noun="People"
	label={(p) => p.name}
	onopen={edit}
	ontoggle={(p, on) => setActive(p, on)}
	bind:inactiveOpen={() => !prefs.isCollapsed('people-inactive', true), (open) => prefs.setCollapsed('people-inactive', !open)}
	collapsibleActive
	sideBySide
/>

<CollapsibleSection title={status.name} count={rows.length} collapsed={…} ontogglecollapse={…}
	onadd={…} onedit={…} dragData={{ type: 'section', id: status.id }} drop={{ accepts, ondrop, ordered: true }}>
	{#each rows as row (row.id)}<li data-dnd-item>…</li>{/each}
</CollapsibleSection>
```

`ActiveList`'s `collapsibleActive` lets the active section collapse too; that isn't remembered, so
it's expanded whenever the list is shown again. With `sideBySide`, once the list is 40rem wide
the active and inactive sections sit side by side, both always expanded.

Both take `appearance`: `card` (default) draws rounded cards; `lines` fills the container edge to
edge with rules between rows, like lines on paper. A `lines` CollapsibleSection's pinned header
needs an opaque background: set `--section-header-bg` to whatever it sits on (default `--bg`).

## Actions

- `use:longpress={handler}`: fires after a 500 ms still hold and swallows the click that follows.
- `use:draggable={{ data, onstart, onend }}` / `use:dropZone={{ accepts, ondrop, ordered }}` /
  `reorder(ids, id, index)`: long-press (300 ms) drag for touch and mouse, with an insertion line
  for ordered zones and the scroll position restored after the drop. Both actions use the same
  press detection (`watchPress`).

## App shell and start-up

```svelte
<main class="main">
	<SyncBanners {app} {cloud} />  <!-- rejected and failed writes; titles and hint are props -->
	{@render children()}
</main>
```

For apps, in the root layout's `onMount` (each returns a function that undoes it):

- `checkForUpdatesOnStart({ dev })`: asks the browser for a new service worker now and whenever the app
  returns to the foreground; `AppVersion` offers the reload.
- `touchFeedback()`: the empty touch listener iOS needs before the theme's touch feedback (`touch-app`)
  applies.
- `preventZoom()`: stops pinch and double-tap zoom (iPad and iPhone Safari, the home-screen app and
  Android). People who rely on zooming lose it, so keep text and controls big enough without.

`errorText(err)` turns an error into one line for the UI: show it where an awaited action failed.

## Undo

```ts
const undo = new UndoStack(); // button visible 5 s, history kept 1 min idle
setDone(task, true);
undo.push({ undo: () => setDone(task, false) });
```

```svelte
<UndoButton stack={undo} />
```

## App version

The running version, with an Update button once a newer deploy is out (in SvelteKit, feed it
`updated` from `$app/state`; set `kit.version.name` to the release version and a
`pollInterval`). Without an update, `oncheck` adds "Check for updates". `onupdate` defaults to
reloading the page.

```svelte
<AppVersion version={version} updateAvailable={updated.current} oncheck={() => updated.check()} />
```

## Dev wipe

```svelte
{#if import.meta.env.DEV}
	<DevWipeButton onconfirm={() => wipeAllData({ beforeWipe: store.resetDevice, redirectTo: resolve('/') })} />
{/if}
```

## Account and sharing (`@wells-nelson/interactions/account`)

`AccountPanel` (or the `SignInCard`, `SyncStatusCard`, `SignOutCard` it's made of),
`LocalItemsPrompt`, `ShareModal`, `ContainerEditModal`. Pass `store.cloud` as `cloud`/`account`
and `store.supabase` as `members` from `@wells-nelson/data-storage`, or anything with the same
shape. Wording comes from `nouns` (`{ singular: 'project', plural: 'projects' }`) and `appName`.

```svelte
<AccountPanel cloud={store.cloud} account={store.cloud} nouns={NOUNS} appName="My App"
	returnUrl={() => new URL(resolve('/profile'), location.origin).href}
	pendingName={(id) => projects.find(id)?.container.name ?? 'Deleted project'} />

<ShareModal containerId={id} name={entry.container.name} location={entry?.location} ready={projects.ready}
	role={entry.role} roles cloud={store.cloud} members={store.supabase} nouns={NOUNS} appName="My App"
	signInHref={resolve('/profile')} onmakecloud={() => store.ops.makeCloud(id)} {onclose} />
```

With `roles`, `ShareModal` shows a role picker and protects the last owner, and
`ContainerEditModal` offers "Leave" instead of "Delete" while other owners remain. Without roles
every member counts as an owner. `localOnlyReason` keeps a container local-only (e.g. built-in
sample data): both modals show that text instead of offering to make it cloud-enabled. A member's
`active` may be `null` (the server didn't say); then neither Active nor Pending is shown.

`DeviceDataCard` is a Profile card for the data on this device: whether the browser keeps it for good
(`persisted`, with a "Keep data on this device" button via `onpersist`, and a Home Screen tip on iOS),
export of every container or one (`onexport` returns the JSON) and import of a backup file (`onimport`).
With `@wells-nelson/data-storage`:

```svelte
<DeviceDataCard nouns={NOUNS} items={entries.map((e) => ({ id: e.container.id, name: e.container.name, location: e.location }))}
	persisted={store.app.persisted} onpersist={store.requestPersistence}
	onexport={(items) => store.ops.exportContainers(items)} onimport={(data) => store.ops.importContainers(data)}
	filename="my-app" />
``` The sandbox's Account page drives every state with a mock.
