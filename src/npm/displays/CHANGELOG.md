# Changelog: @wells-nelson/displays

The heading `## Unreleased (patch|minor|major)` decides the next release's version, and the release
turns it into `## <version> (<date>)`. See [PUBLISHING.md](../../../PUBLISHING.md).

## Unreleased (major)

2.0: one vocabulary for component props, token scales, and fixes for states that disappeared. **Apps:** run
`node scripts/codemods/v2.mjs <app folder>` from this repository, finish what it lists, and declare
registered icons in `AppIcons`.

- **Breaking:** `Button` splits `variant` into emphasis and meaning: `variant` is `solid | outline | ghost`
  (default `outline`) and `tone` is `neutral | accent | danger | warning | success` (default `neutral`).
  `primary` → `variant="solid" tone="accent"`, `secondary` → the default, `danger` → `variant="solid"
  tone="danger"`, `ghost` → `variant="ghost" tone="accent"`, `danger-ghost` → `variant="ghost" tone="danger"`.
- **Breaking:** `ConfirmDialog`'s `danger` is `tone="danger"`.
- **Breaking:** `IconButton`'s `active` is `current` (it sets `aria-current`), and `current` and `pressed`
  are drawn as different states. `AppHeader`'s `profileActive` is `profileCurrent` (and sets
  `aria-current`), its `labels="active"` is `labels="current"`, and `TabItem.active` is `current`.
- **Breaking:** `IconName` is the base set plus the names an app declares in `AppIcons` (module augmentation),
  instead of any string. A typo is a type error.
- **Breaking:** the `.notice` class is gone: use `Notice`.
- **Deprecated:** `IconButton size={number}`: use `size="sm" | "md" | "lg"` (18, 20, 22px). Numbers still work
  and warn once in development.
- `IconButton` `size="sm|md|lg"`, `tone="neutral|muted|accent|danger"`, and other attributes (`aria-*`,
  `data-*`) passed to its element. Inside a `ListRow` (or anything that calls `setIconButtonDefaults`) icon
  buttons default to small and muted.
- New `PageHeader`: a page's (or card's) title with its actions on the right and an optional link back.
- New `ListRow` and `ListHeading`, and the lines-on-paper classes in the theme: `.lines`, `.line`,
  `.line-text`, `.line-name`, `.line-subtext`, `.line-heading`.
- Theme: scales for space (`--space-1…6`), type (`--text-xs…xl`, `--weight-*`, `--leading-*`), layers
  (`--z-*`) and motion (`--duration-*`, `--ease-out`); `--radius-sm` and `--radius-full`. Every component
  uses them, so some sizes move by a pixel or two (0.9rem text is now 0.875rem).
- Theme: `--success`, `--on-success`, `--success-soft`, `--on-warning`, `--scrim` (behind a dialog) and
  `--on-control` (a switch's thumb), in light and dark. `Badge` and `Notice` take `tone="success"`.
- Theme: `.overline` (a small uppercase heading), `.inline-icon` (an icon in a sentence, drawn like its
  button); `readonly` inputs read as plain text; every animation and transition turns off under
  `prefers-reduced-motion`.
- New `palettes/purple.css`. Palettes follow a contract (`palettes/README.md`, `PALETTE_ACCENT_TOKENS`,
  `PALETTE_NEUTRAL_TOKENS`): every palette sets `--on-accent` in light mode too, and a test checks each
  palette's contrast in both modes.
- `Button`: `busy` keeps the button focusable (`aria-busy`, `aria-disabled`) and ignores clicks and submits,
  so focus no longer drops to the page; a disabled or busy link has no `href`. Long labels wrap.
- `Modal` `onclosed`: called once the dialog has closed, by any route. Use it with `Overlay` (interactions)
  to keep modals mounted. Its backdrop is `--scrim`.
- `formatAgo`: "2 hours and 5 minutes ago" (rounded down) within the last 10 hours, else as `formatRecent`.
- `Modal`: sticky content in its body (a `CollapsibleSection`'s header) pins flush to the top of the body,
  instead of below the app header or with a gap the content showed through.
- `Icon` `inline` (sits on a line of text), and a development warning for a name nobody registered. Base
  icons `chevron-up`, `chevron-left` and `chevron-right`.
- Forced colors: a pressed `IconButton` is filled with the highlight color, the current page's is ringed
  (`IconButton`, `AppHeader`'s profile, `TabBar`).
- Every component takes `class`, as a last resort; `SortableTable` takes an `empty` snippet.
- `PHONE_MAX_WIDTH` (`'40rem'`), the phone breakpoint for CSS; `deprecated()` and `devWarn()` for
  development-only warnings.
- `Badge` cuts long text short; `Chip` wraps it.

## 1.2.6 (2026-11-24)

- `Modal`: `--modal-max-w` caps the width of every size, so a phone-sized app (with a narrow `--content-w`)
  keeps its modals phone sized on a tablet or desktop too.

## 1.2.5 (2026-11-23)

- Dropdowns (`select`) look like the text fields: the same height and box, with the arrow drawn by the
  theme. Phones (iOS especially) drew a smaller native control that ignored the height.

## 1.2.4 (2026-11-22)

Content pass (wording that is the same in every app, and errors people can act on):

- New `ErrorMessage`: an error in plain words, read out when it appears, with the technical text behind
  "Details". New wording helpers: `errorText`, `rawErrorText`, `knownErrorText`, `userError` /
  `isUserFacing`, `plural`, and `formatTime`, `formatDate`, `formatDateTime`, `formatRecent`,
  `formatLongDate` (one date and time style).
- **Breaking:** `ConfirmDialog`'s `confirmLabel` is required (it names the action, e.g. "Delete task"; the
  generic "Confirm" default is gone). An `onconfirm` failure shows through `ErrorMessage`; `errorAction`
  words the fallback ("Couldn't delete the task…"). This shipped in a patch release by mistake (it should
  have been 2.0.0): a `ConfirmDialog` without `confirmLabel` fails type-checking from 1.2.4 on.
- `FatalError`: "This app can't start" / "This app couldn't open its storage on this device."; the browser's
  error text moves behind "Details".
- `SortableTable`: header buttons are named by the column's full name (`full`), so "PP" is read as "Points
  played"; the empty text defaults to "Nothing to show yet."
- `AppHeader` and `TabBar` read the dot label mid-sentence: "Profile (unsynced changes)".

## 1.2.3 (2026-11-22)

- Internal changes that make the components easier to test; no change in behavior.

## 1.2.2 (2026-11-21)

- Theme: the page always keeps room for a classic (Windows, Linux) scrollbar, a thin one, so the page and the
  fixed header no longer shift sideways when a page starts or stops scrolling (`scrollbar-gutter: stable`).

## 1.2.1 (2026-11-21)

Accessibility and usability pass:

- Theme: `--control-border` (3:1 outlines for fields, checkbox, switch, segmented), `--on-danger`, `--focus`,
  `--tap` (44px). One focus ring for everything focusable; placeholders in `--muted`; a styled `select`.
  Dark `--danger` is lighter (`#f0766f`) so text on it and beside it passes 4.5:1; light `--muted` is a little
  darker in both palettes. Helpers `.card-section`, `.text-sm`, `.error-text`.
- `Modal`: a click outside closes it only when the press started outside, and never once something inside has
  been typed in or changed; `dismissible={false}` turns it off. Opens on an `autofocus` element, else (mouse or
  keyboard) the first field, else the first footer button.
- `Button`: `danger-ghost`, `size="lg"`, `href` (with `rel`, `target`), `busy`. 44px tall.
- `IconButton`: 44px; `pressed` (`aria-pressed`) for on/off buttons.
- `ConfirmDialog`: opens on Cancel; `busyLabel`; `children` instead of `message`. When `onconfirm` throws, it
  stays open and shows the error's message (before, it stayed open silently and the rejection went unhandled).
- New `Chip` (pill button, on/off with `pressed`) and `Notice` (warning / danger / info, actions, dismiss, link).
- `Badge tone="count"` with an optional `label` for assistive tech.
- `AppHeader`: the unsynced dot is part of the profile link's name; 44px brand link and profile.
- `SortableTable`: 44px headers; the table's scroller and `Leaderboards` can be scrolled from the keyboard; the
  table is named after its title (`aria-labelledby`), so table navigation says which table it is.
- `Splash` says "Loading" to assistive tech; `FatalError` has a "Try again" button (`retryLabel`).

## 1.2.0 (2026-11-12)

- `IconButton` `showLabel`: the label next to the icon. `AppHeader` `labels` (`always` / `active`) decides which
  nav buttons show theirs, and `profileShowLabel` labels the avatar.
- `phoneLayout` / `PHONE_LAYOUT_QUERY`: when to show a `TabBar` instead of the `AppHeader` (narrow screens, and
  touch screens held sideways). `TabBar` now sets `--header-h: 0px` while shown.
- Theme: date and time inputs match the text inputs (and keep their size on iOS); so do `tel`, `url`,
  `number` and `password` inputs.
- Theme, opt-in with `<html class="touch-app">`: no accidental text selection on touch screens (fields and
  `.selectable` excepted; `Leaderboards` and `SortableTable` are selectable), and touch feedback (pressed
  controls dim). **Sites:** apps add the class to `app.html`; websites leave the class off.

## 1.1.1 and earlier

See the git tags `@wells-nelson/displays@<version>`. Versions 1.2.1 to 1.2.6 were released as patches
(the bump then came from commit messages) although several added features; their headings were
reconstructed from git history.
