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
`--border-strong` (dividers), `--control-border` (the outline of a field, checkbox, switch or segmented
control: 3:1 against `--surface` and `--bg`), `--accent`, `--accent-strong`, `--accent-text`,
`--accent-soft`, `--on-accent`, `--danger`, `--on-danger`, `--danger-soft`, `--warning`,
`--warning-soft`, `--focus` (the focus ring), `--tap` (smallest hit area, 44px), `--radius`,
`--radius-lg`, `--shadow`, `--shadow-lg`, `--header-h`, `--header-offset`, `--content-w`, `--tabbar-h`,
`--footer-offset` (the space fixed bottom UI leaves for a `TabBar`; 0 without one). Text on a colored
fill uses that fill's `--on-*` token, never a fixed `#fff`.

Helpers: `.page`, `.page-title`, `.stack`, `.card`, `.card-section` (a titled group inside a card,
e.g. on a Profile page), `.row-card`, `.muted`, `.text-sm`, `.error-text`, `.notice`, `.empty`,
`.visually-hidden`, plus drag-and-drop classes. Native `select` is styled like the text inputs.
Everything focusable gets one focus ring (`:focus-visible`, 2px `--focus`); placeholders use
`--muted`. Keep app-only tokens in the app's own stylesheet.

Text-like inputs (`text`, `email`, `search`, `tel`, `url`, `number`, `password`) look the same. Date
and time inputs (`date`, `time`, `datetime-local`) match them, and on iOS keep a fixed size whatever
their value. The page keeps room for a thin classic scrollbar (`scrollbar-gutter: stable`), so nothing
shifts sideways when a page starts or stops scrolling. Apps that put `class="touch-app"` on `<html>` get app-like touch
screens: text can't be selected (a long press acts on the control), except in fields and anything
marked `.selectable`; `Leaderboards` and `SortableTable` are; and touch feedback: a pressed link or
button dims and fades back (iOS also needs `touchFeedback()` from interactions). Websites leave it off.

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
<Badge tone="count" label="3 items">3</Badge>

<!-- A pill button: with pressed it switches on and off, without it's an action. -->
<Chip pressed={picked} onclick={toggle}>Sat 14</Chip>

<!-- Something to know: warning (default), danger or info; optional actions, ✕, or a link. -->
<Notice role="status">Your session expired.</Notice>
<Notice tone="danger" role="alert" ondismiss={clear}>Couldn't save.</Notice>
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

`Button` (primary / secondary / danger / ghost / danger-ghost for a quiet destructive action, optional
icon, `block`, `size="lg"` for the main actions of a busy screen (`--control-h` tall when set), `href`
for a link that looks like a button, `busy`), `IconButton` (button or link, required label, `active`
on a link, `pressed` on an on/off button, `showLabel`), `Modal` (native `<dialog>`, sm / md / lg) and
`ConfirmDialog` (danger variant, `busyLabel`, text or a `children` snippet) complete the set. See them all
in the sandbox (`npm run sandbox`).

**Modals.** Escape, ✕ and the footer's buttons close a `Modal`. A click or tap outside closes it only
when the press started outside too (so selecting text in a field doesn't), and never once something
inside has been typed in or changed, so work isn't lost by accident; `dismissible={false}` turns
outside clicks off altogether. It opens with focus on an `autofocus` element, else (with a mouse or
keyboard) the first field, else the first footer button, which for `ConfirmDialog` is Cancel.

All controls are at least `--tap` (44px) in both directions where they're tapped.
