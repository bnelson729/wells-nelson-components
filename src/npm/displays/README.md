# @wells-nelson/displays

Svelte 5 display components and the shared theme. Peer dependency: `svelte`. Which component to use
when, and the API conventions every component follows, are in the
[design guide](../../../docs/design-guide.md).

## Theme

Import once in the root layout, in this order: the theme, then a palette (blue is the default; `green`
and `purple` ship too), then the app's own styles.

```ts
import '@wells-nelson/displays/theme.css';
import '@wells-nelson/displays/palettes/green.css';
import '../app.css';
```

A palette sets the accent tokens, and optionally tinted neutrals, in light and dark; the contract and
the contrast it must meet are in [palettes/README.md](src/lib/palettes/README.md). Add a brand palette
here, not in an app, so the contrast test covers it.

Tokens: `--bg`, `--surface`, `--surface-2`, `--surface-hover`, `--text`, `--muted`, `--border`,
`--border-strong` (dividers), `--control-border` (the outline of a field, checkbox, switch or segmented
control: 3:1 against `--surface` and `--bg`), `--accent`, `--accent-strong`, `--accent-text`,
`--accent-soft`, `--on-accent`, `--danger`, `--on-danger`, `--danger-soft`, `--warning`, `--on-warning`,
`--warning-soft`, `--success`, `--on-success`, `--success-soft`, `--scrim` (behind a dialog),
`--on-control` (a switch's thumb), `--focus` (the focus ring), `--tap` (smallest hit area, 44px),
`--radius-sm`, `--radius`, `--radius-lg`, `--radius-full`, `--shadow`, `--shadow-lg`, `--header-h`,
`--header-offset`, `--content-w`, `--tabbar-h`, `--footer-offset` (the space fixed bottom UI leaves for a
`TabBar`; 0 without one). Text on a colored fill uses that fill's `--on-*` token, never a fixed `#fff`.

Scales: `--space-1` … `--space-6` (0.25 to 2rem), `--text-xs` … `--text-xl` (0.75 to 1.5rem),
`--weight-regular | medium | semibold | bold | heavy`, `--leading-tight | normal | loose`, `--z-raised |
sticky | dropdown | fixed | floating | overlay`, `--duration-instant | fast | normal` and `--ease-out`.
Components and apps use these instead of literal values. The phone breakpoint is `PHONE_MAX_WIDTH`
(`40rem`): CSS media queries can't read custom properties, so write `(max-width: 40rem)`. Every animation
and transition turns off when the system asks for reduced motion.

Helpers (part of the API, versioned like props): `.page`, `.page-title`, `.stack`, `.card`,
`.card-section` (a titled group inside a card, e.g. on a Profile page), `.row-card`, the lines-on-paper
rows (`.lines`, `.line`, `.line-text`, `.line-name`, `.line-subtext`, `.line-heading`), `.overline` (a
small uppercase heading), `.inline-icon` (an icon in a sentence, drawn like its button), `.muted`,
`.text-sm`, `.error-text`, `.empty`, `.visually-hidden`, plus drag-and-drop classes. A `readonly` input
reads as plain text. Native `select` is styled like the text inputs.
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

The base set: alert, check, chevron (down), chevron-up, chevron-left, chevron-right, cloud,
cloud-pending, download, gear, grip, home, mail, pencil, plus, refresh, search, share, trash, undo, upload,
user, wifi-off, x. Register app icons at startup, and declare them so their names are type-checked:

```ts
import { registerIcons } from '@wells-nelson/displays';
registerIcons({ calendar: '<rect …/>', folder: '<path …/>' }); // 24x24, stroke-based

declare module '@wells-nelson/displays' {
	interface AppIcons {
		calendar: true;
		folder: true;
	}
}
```

An unknown name renders an empty box and warns once in development. `<Icon inline>` sits an icon on a line
of text.

## Components

```svelte
<AppHeader
	brandHref={resolve('/')}
	brandLabel="Home — all projects"
	profileHref={resolve('/profile')}
	profileCurrent={routeId === '/profile'}
	avatarUrl={cloud.user?.user_metadata?.avatar_url}
	unsynced={cloud.hasAnyPending || cloud.sessionExpired}
	hideOnScroll
	width={isDashboard ? '64rem' : undefined}
	labels="always"
>
	{#snippet brand()}MA{/snippet}
	{#snippet nav()}<IconButton icon="calendar" label="Schedule" href={…} current={…} showLabel />{/snippet}
</AppHeader>

<!-- Phones: a bottom tab bar instead of the header. -->
<TabBar
	items={[
		{ label: 'Home', icon: 'home', href: resolve('/'), current: routeId === '/' },
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

<!-- A page's title with its actions, and optionally a link back. -->
<PageHeader title="Tasks" back={{ href: resolve('/'), label: 'Back to Projects' }}>
	{#snippet actions()}<Button icon="plus" onclick={() => newTask.show()}>New task</Button>{/snippet}
</PageHeader>

<!-- Lines on paper: content rows. IconButtons inside are small and muted. -->
<ul class="lines">
	<ListHeading>This week</ListHeading>
	<ListRow data-dnd-item>
		<Checkbox label="Done" hideLabel />
		<span class="line-text"><span class="line-name">Write the plan</span><span class="line-subtext">Ann</span></span>
		<IconButton icon="pencil" label="Edit Write the plan" onclick={…} />
	</ListRow>
</ul>

<!-- Something to know: warning (default), danger, info or success; optional actions, ✕, or a link. -->
<Notice role="status">Your session expired.</Notice>
<Notice tone="danger" role="alert" ondismiss={clear}>Couldn't save.</Notice>
<Splash text="MA" />
<FatalError error={app.fatal} />

<!-- An error in plain words, with the technical text behind "Details". -->
<ErrorMessage {error} action="save the task" />
```

## Wording helpers

What every app says the same way (see [docs/content-style.md](../../../docs/content-style.md)):

- `errorText(err, action)`: an error as a sentence. A `userError(message)` (or any error with
  `userFacing: true`, which `@wells-nelson/data-storage` sets on its own messages) shows as it is; known
  technical ones (network, expired session, rate limit, permission, storage full) are translated; anything
  else reads "Couldn't {action}. Try again in a moment." `rawErrorText(err)` keeps the original for Details,
  logs and reports. `ErrorMessage` and `ConfirmDialog` use these.
- `plural(n, 'task')`: "1 task", "3 tasks".
- Dates and times, US English: `formatTime` ("9:00 AM"), `formatDate` ("Sat, Jun 7", with the year when it
  isn't this year), `formatDateTime` ("Sat, Jun 7, 9:00 AM"), `formatRecent` ("Today at 3:04 PM") and
  `formatLongDate` ("November 22, 2026", for policy pages).

Nav buttons with `showLabel` show their label to the right of the icon. `AppHeader`'s `labels` decides
which: `always` (default) all of them, `current` only the current page's. `profileShowLabel` does the same
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

`Button`: `variant` is how loud (`solid`, `outline` (default), `ghost`) and `tone` what it means
(`neutral` (default), `accent`, `danger`, `warning`, `success`): the main action is `variant="solid"
tone="accent"`, a quiet destructive one `variant="ghost" tone="danger"`. Optional `icon`, `block`,
`size="lg"` for the main actions of a busy screen (`--control-h` tall when set), `href` for a link that
looks like a button. `busy` keeps focus on the button and ignores clicks (`aria-busy`, `aria-disabled`);
a disabled or busy link isn't followed.

`IconButton`: button or link, required `label`; `size` `sm` (18px, rows), `md` (20px, section headers) or
`lg` (22px, headers and navigation; the default outside a row); `tone` `neutral`, `muted`, `accent` or
`danger`; `current` on a link to the current page, `pressed` on an on/off button (both stay visible in
forced colors); `showLabel`. `ListRow` (and `CollapsibleSection` rows) make the icon buttons inside them
small and muted; `setIconButtonDefaults` does the same for your own containers.

`Modal` (native `<dialog>`, sm / md / lg; `onclose` when the person closes it, `onclosed` once it has
closed by any route) and `ConfirmDialog` (`tone="danger"`, `busyLabel`, text or a `children` snippet; when
`onconfirm` throws it stays open and shows the error) complete the set. Keep modals mounted and drive them
with an `Overlay` from `@wells-nelson/interactions`. Every component takes `class` as a last resort;
interactive ones pass other attributes (`aria-*`, `data-*`) to their element. See them all, in every state,
in the sandbox (`npm run sandbox`, the States page).

`deprecated(what, instead)` warns once in development builds: for renamed props during their alias period.

**Modals.** Escape, ✕ and the footer's buttons close a `Modal`. A click or tap outside closes it only
when the press started outside too (so selecting text in a field doesn't), and never once something
inside has been typed in or changed, so work isn't lost by accident; `dismissible={false}` turns
outside clicks off altogether. It opens with focus on an `autofocus` element, else (with a mouse or
keyboard) the first field, else the first footer button, which for `ConfirmDialog` is Cancel.

All controls are at least `--tap` (44px) in both directions where they're tapped.
