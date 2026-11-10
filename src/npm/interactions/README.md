# @wells-nelson/interactions

Svelte 5 inputs, actions and account UI. Peer dependencies: `@wells-nelson/displays` (install it
alongside, so the app and this package share one theme and icon registry) and `svelte`. No
storage dependency: the account components take the sync layer through interfaces.

```sh
npm install @wells-nelson/displays @wells-nelson/interactions
```

## Inputs

`TextField` (label, error, hint), `Checkbox` (optionally hidden label), `Toggle` (a switch for
settings that apply at once), `Combobox` (type to filter, offers "Create …"; plus `sameName`),
`AddRow` (inline "name + plus" that refocuses), `Segmented` (one of a few) and `SearchBar`
(fixed at the bottom, with a clear button).

```svelte
<ActiveList
	items={people}
	noun="People"
	label={(p) => p.name}
	onopen={edit}
	ontoggle={(p, on) => setActive(p, on)}
	bind:inactiveOpen={() => !prefs.isCollapsed('people-inactive', true), (open) => prefs.setCollapsed('people-inactive', !open)}
/>

<CollapsibleSection title={status.name} count={rows.length} collapsed={…} ontogglecollapse={…}
	onadd={…} onedit={…} dragData={{ type: 'section', id: status.id }} drop={{ accepts, ondrop, ordered: true }}>
	{#each rows as row (row.id)}<li data-dnd-item>…</li>{/each}
</CollapsibleSection>
```

Both take `appearance`: `card` (default) draws rounded cards; `lines` fills the container edge to
edge with rules between rows, like lines on paper. A `lines` CollapsibleSection's pinned header
needs an opaque background: set `--section-header-bg` to whatever it sits on (default `--bg`).

## Actions

- `use:longpress={handler}`: fires after a 500 ms still hold and swallows the click that follows.
- `use:draggable={{ data, onstart, onend }}` / `use:dropZone={{ accepts, ondrop, ordered }}` /
  `reorder(ids, id, index)`: long-press (300 ms) drag for touch and mouse, with an insertion line
  for ordered zones and the scroll position restored after the drop. Both actions use the same
  press detection (`watchPress`).

## Undo

```ts
const undo = new UndoStack(); // button visible 5 s, history kept 1 min idle
setDone(task, true);
undo.push({ undo: () => setDone(task, false) });
```

```svelte
<UndoButton stack={undo} />
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
every member counts as an owner. The sandbox's Account page drives every state with a mock.
