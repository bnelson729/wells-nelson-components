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

## Icons

The base set: alert, check, chevron, cloud, cloud-pending, gear, grip, home, mail, pencil, plus,
refresh, search, share, trash, undo, user, wifi-off, x. Register app icons at startup:

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
>
	{#snippet brand()}MA{/snippet}
	{#snippet nav()}<IconButton icon="calendar" label="Schedule" href={…} active={…} />{/snippet}
</AppHeader>

<!-- Phones: a bottom tab bar instead of the header (set --header-h: 0px at that width). -->
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

`Button` (primary / secondary / danger / ghost, optional icon, `block`), `IconButton` (button or
link, required label, `active`), `Modal` (native `<dialog>`, sm / md / lg) and `ConfirmDialog`
(danger variant, busy state) complete the set. See them all in the sandbox (`npm run sandbox`).
