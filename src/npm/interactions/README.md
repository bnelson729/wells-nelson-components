# @wells-nelson/interactions

Svelte 5 inputs, actions and account UI. Peer dependencies: `@wells-nelson/displays` (install it
alongside, so the app and this package share one theme and icon registry) and `svelte`. No
storage dependency: the account components take the sync layer through interfaces.

```sh
npm install @wells-nelson/displays @wells-nelson/interactions
```

## Inputs

Every form control shares `FieldProps`: `label` (required; `hideLabel` keeps it for assistive tech only),
`hint`, `error`, `required` ("(required)" and `aria-required`), `optional` ("(optional)", rather than a
placeholder that disappears when typing) and `disabled`. The hint or error is tied to the control with
`aria-describedby`, an error sets `aria-invalid` and is announced.

- `TextField`: text. Other attributes go to the `<input>`; `readonly` shows the value as plain text.
- `SelectField`: one of a fixed list (`options: { value, label }[]`, `bind:value`, `onchange`).
- `Field`: label, hint and error around any other control, which gets its id and ARIA attributes from the
  snippet's argument:

  ```svelte
  <Field label="Starts" {error}>
  	{#snippet children(control)}<input type="datetime-local" {...control} bind:value={start} />{/snippet}
  </Field>
  ```

- `Checkbox`: `description` (a second line), `children` (rich content for the label), `block` (the whole
  row is the checkbox, box in the row's first column), `tone="muted"` for a gray tick.
- `Toggle`: a switch for settings that apply at once.
- `Segmented`: one of a few, all visible; `size="sm"` for a compact choice inside a row.
- `Combobox`: type to filter, offers "Create …"; `onchange(choice)`; plus `sameName`. It follows the
  WAI-ARIA combobox pattern. Inside something that scrolls, like a `Modal`, opening it near the end adds
  room below so its options aren't cut off.
- `NameModal`: create something by name: one field, Cancel and Create, optional extra fields, async
  `onsubmit` with its error shown. Opened by a "+ New …" button by the title; keep it mounted and bind
  `open` (each time it opens, the field starts again from `value`).
- `SearchBar`: fixed at the bottom, with a clear button; it sits above a `TabBar` via `--footer-offset`, as
  does `UndoButton`.

## Modals: `Overlay`

Keep a modal mounted and hold what it's about in an `Overlay`, which clears it only after the dialog has
finished closing, so nothing inside reads a value that was cleared mid-close:

```svelte
<script lang="ts">
	const editTask = new Overlay<Task>();
</script>

<IconButton icon="pencil" label="Edit task" onclick={() => editTask.show(task)} />

<Modal bind:open={editTask.isOpen} onclosed={editTask.closed} title="Edit task">
	{#if editTask.value}{#key editTask.value.id}<TaskForm task={editTask.value} />{/key}{/if}
</Modal>

<!-- Nothing in particular: -->
<NameModal bind:open={newTask.isOpen} onclosed={newTask.closed} title="New task" label="Task" {onsubmit} />
```

## Lists and sections

```svelte
<ActiveList
	items={people}
	noun="People"
	label={(p) => p.name}
	onopen={edit}
	onactivechange={(p, on) => setActive(p, on)}
	bind:inactiveExpanded={() => !prefs.isCollapsed('people-inactive', true), (open) => prefs.setCollapsed('people-inactive', !open)}
	collapsibleActive
	sideBySide
/>

<CollapsibleSection title={status.name} count={rows.length} expanded={!collapsed.has(status.id)}
	onexpandedchange={(open) => setCollapsed(status.id, !open)}
	onadd={…} onedit={…} dragData={{ type: 'section', id: status.id }} drop={{ accepts, ondrop, ordered: true }}>
	{#each rows as row (row.id)}<ListRow data-dnd-item>…</ListRow>{/each}
	{#snippet empty()}Nothing here yet.{/snippet}
</CollapsibleSection>
```

`ActiveList`'s `collapsibleActive` lets the active section collapse too; that isn't remembered, so
it's expanded whenever the list is shown again. With `sideBySide`, once the list is 40rem wide
the active and inactive sections sit side by side, both always expanded.

A CollapsibleSection's title is a heading (`headingLevel`, default 2) holding the button that collapses
it, so screen readers can jump between sections; use 3 for sections inside another section.

Both take `layout`: `card` (default) draws rounded cards; `lines` fills the container edge to edge with
rules between rows, like lines on paper. A `lines` CollapsibleSection's pinned header needs an opaque
background: set `--section-header-bg` to whatever it sits on (default `--bg`). A CollapsibleSection's
`emphasis="subtle"` gives its header a muted background. Both take an `empty` snippet; rows inside a
CollapsibleSection get small, muted icon buttons (as in a `ListRow`).

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

`errorText(err, action)` (from `@wells-nelson/displays`, re-exported here) turns an error into a sentence
for the UI; `ErrorMessage` shows it with the technical text behind "Details". Use them where an awaited
action failed.

`focusFirstInvalid(form)`: after a submit that failed validation, moves focus to the first field marked
`aria-invalid` once the messages are rendered.

## Undo

```ts
const undo = new UndoStack(); // button visible 8 s (kept while hovered or focused), history kept 1 min idle
setDone(task, true);
undo.push({ label: `Done: ${task.name}`, undo: () => setDone(task, false) });
```

```svelte
<UndoButton stack={undo} />
```

The button sits in a status region, so its `label` and "Undo" are read out when it appears.

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

`AccountPanel` (sign-in, sync status and sign-out), `SignInCard` on its own (e.g. for a website),
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

`DataRiskButton` (with `deviceMayClearData()`) warns, next to a local-only container, that this browser
deletes site data after 7 days without a visit, and says how to keep it. `AppVersion`'s `links` puts the
privacy policy and terms under the version. `ContainerEditModal`'s `children` adds the app's own settings.

`ShareModal` tells people that sharing sends no email ("We don't send them an email, so let them know"); give
`inviteHint` to add which address to use (for example when sign-in is Google only). With `roles`, `ShareModal`
shows a role picker and protects the last owner, and
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
