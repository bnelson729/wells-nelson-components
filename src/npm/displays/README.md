# @wells-nelson/displays

Svelte 5 display components and the shared theme. Peer dependency: `svelte`.

## Theme

Import once in the root layout. The default palette is blue; import the green one (or set
`--accent*` yourself) after it.

```ts
import '@wells-nelson/displays/theme.css';
import '@wells-nelson/displays/palettes/green.css';
```

Tokens: `--bg`, `--surface`, `--surface-2`, `--surface-hover`, `--text`, `--muted`, `--border`,
`--border-strong`, `--accent`, `--accent-strong`, `--accent-text`, `--accent-soft`, `--on-accent`,
`--danger`, `--danger-soft`, `--warning`, `--warning-soft`, `--radius`, `--radius-lg`, `--shadow`,
`--shadow-lg`, `--header-h`, `--header-offset`, `--content-w`, `--tabbar-h`, `--footer-offset`
(the space fixed bottom UI leaves for a `TabBar`; 0 without one). Helpers: `.page`, `.page-title`,
`.stack`, `.card`, `.row-card`, `.muted`, `.notice`, `.empty`, `.visually-hidden`, plus
drag-and-drop classes. Keep app-only tokens in the app's own stylesheet.

Date and time inputs (`date`, `time`, `datetime-local`) match the text inputs, and on iOS keep a
fixed size whatever their value. On touch screens text can't be selected (a long press acts like an
app, not a page), except in fields and anything marked `.selectable`; `Leaderboards` and
`SortableTable` are.

## Icons

The base set: alert, check, chevron, cloud, cloud-pending, download, gear, grip, home, mail, pencil, plus,
refresh, search, share, trash, undo, upload, user, wifi-off, x. Register app icons at startup:

```ts
import { registerIcons } from '@wells-nelson/displays';
registerIcons({ calendar: '<rect …/>', folder: '<path …/>' }); // 24x24, stroke-based
```

## Components

```svelte
<AppHeader
	brandHref={resolve('/')}
	brandLabel="Home — all projects"
	profileHref={resolve('/profile')}
	profileActive={routeId === '/profile'}
	avatarUrl={cloud.user?.user_metadata?.avatar_url}
	unsynced={cloud.hasAnyPending || cloud.sessionExpired}
	hideOnScroll
	width={isDashboard ? '64rem' : undefined}
	labels="always"
>
	{#snippet brand()}MA{/snippet}
	{#snippet nav()}<IconButton icon="calendar" label="Schedule" href={…} active={…} showLabel />{/snippet}
</AppHeader>

<!-- Phones: a bottom tab bar instead of the header. -->
<TabBar
	items={[
		{ label: 'Home', icon: 'home', href: resolve('/'), active: routeId === '/' },
		{ label: 'Schedule', icon: 'calendar', href: projectId ? scheduleHref : undefined }, // no href: disabled
		{ label: 'Profile', icon: 'user', href: resolve('/profile'), imageUrl: avatar, dot: unsynced, dotLabel: 'Unsynced changes' }
	]}
/>

<SortableTable
	title="Members"
	rows={stats}
	rowKey={(s) => s.id}
	rowLabel={(s) => s.name}
	sortKey="assigned"
	columns={[
		{ key: 'assigned', title: 'Tasks', full: 'Tasks assigned', value: (s) => s.assigned },
		{ key: 'donePct', title: 'Done %', value: (s) => s.donePct, display: (s) => `${s.donePct}%` }
	]}
/>

<Leaderboards rowKey={(s) => s.id} rowLabel={(s) => s.name} boards={[{ title: 'Most done', rows: topDone, value: (s) => s.done }]} />

<Badge tone="warning">Pending</Badge>
<Splash text="MA" />
<FatalError error={app.fatal} />
```

Nav buttons with `showLabel` show their label to the right of the icon. `AppHeader`'s `labels` decides
which: `always` (default) all of them, `active` only the current one. `profileShowLabel` does the same
for the avatar (off by default).

**Phones.** Show a `TabBar` instead of the `AppHeader` when `phoneLayout.current` is true: narrow
screens (up to 40rem) and touch screens held sideways (up to 30rem tall). It goes by the screen,
not the user agent, which can't tell an iPad from a Mac; the query is `PHONE_LAYOUT_QUERY`. While
mounted, `TabBar` sets `--header-h: 0px` so pages start at the top, and `--footer-offset` so fixed
bottom UI sits above it.

```svelte
<script>
	import { phoneLayout } from '@wells-nelson/displays';
</script>

{#if phoneLayout.current}<TabBar items={…} />{:else}<AppHeader …>…</AppHeader>{/if}
```

`Button` (primary / secondary / danger / ghost, optional icon, `block`), `IconButton` (button or
link, required label, `active`, `showLabel`), `Modal` (native `<dialog>`, sm / md / lg) and `ConfirmDialog`
(danger variant, busy state) complete the set. See them all in the sandbox (`npm run sandbox`).
