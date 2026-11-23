# Changelog: @wells-nelson/displays

## Unreleased (minor)

Content pass (wording that is the same in every app, and errors people can act on):

- New `ErrorMessage`: an error in plain words, read out when it appears, with the technical text behind
  "Details". New wording helpers: `errorText`, `rawErrorText`, `knownErrorText`, `userError` /
  `isUserFacing`, `plural`, and `formatTime`, `formatDate`, `formatDateTime`, `formatRecent`,
  `formatLongDate` (one date and time style).
- **Breaking:** `ConfirmDialog`'s `confirmLabel` is required (it names the action, e.g. "Delete task"; the
  generic "Confirm" default is gone). An `onconfirm` failure shows through `ErrorMessage`; `errorAction`
  words the fallback ("Couldn't delete the task…").
- `FatalError`: "This app can't start" / "This app couldn't open its storage on this device."; the browser's
  error text moves behind "Details".
- `SortableTable`: header buttons are named by the column's full name (`full`), so "PP" is read as "Points
  played"; the empty text defaults to "Nothing to show yet."
- `AppHeader` and `TabBar` read the dot label mid-sentence: "Profile (unsynced changes)".

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

- `IconButton` `showLabel`: the label next to the icon. `AppHeader` `labels` (`always` / `active`) decides which
  nav buttons show theirs, and `profileShowLabel` labels the avatar.
- `phoneLayout` / `PHONE_LAYOUT_QUERY`: when to show a `TabBar` instead of the `AppHeader` (narrow screens, and
  touch screens held sideways). `TabBar` now sets `--header-h: 0px` while shown.
- Theme: date and time inputs match the text inputs (and keep their size on iOS); so do `tel`, `url`,
  `number` and `password` inputs.
- Theme: the page always keeps room for a classic (Windows, Linux) scrollbar, a thin one, so the page and the
  fixed header no longer shift sideways when a page starts or stops scrolling (`scrollbar-gutter: stable`).
- Theme, opt-in with `<html class="touch-app">`: no accidental text selection on touch screens (fields and
  `.selectable` excepted; `Leaderboards` and `SortableTable` are selectable), and touch feedback (pressed
  controls dim). **Sites:** apps add the class to `app.html`; websites leave it off.

## 1.1.1 and earlier

See the git tags `@wells-nelson/displays@<version>`.
