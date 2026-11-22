# Changelog: @wells-nelson/displays

## Unreleased (minor)

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
- `ConfirmDialog`: opens on Cancel; `busyLabel`; `children` instead of `message`.
- New `Chip` (pill button, on/off with `pressed`) and `Notice` (warning / danger / info, actions, dismiss, link).
- `Badge tone="count"` with an optional `label` for assistive tech.
- `AppHeader`: the unsynced dot is part of the profile link's name; 44px brand link and profile.
- `SortableTable`: 44px headers; the table's scroller and `Leaderboards` can be scrolled from the keyboard.
- `Splash` says "Loading" to assistive tech; `FatalError` has a "Try again" button (`retryLabel`).

- `IconButton` `showLabel`: the label next to the icon. `AppHeader` `labels` (`always` / `active`) decides which
  nav buttons show theirs, and `profileShowLabel` labels the avatar.
- `phoneLayout` / `PHONE_LAYOUT_QUERY`: when to show a `TabBar` instead of the `AppHeader` (narrow screens, and
  touch screens held sideways). `TabBar` now sets `--header-h: 0px` while shown.
- Theme: date and time inputs match the text inputs (and keep their size on iOS).
- Theme, opt-in with `<html class="touch-app">`: no accidental text selection on touch screens (fields and
  `.selectable` excepted; `Leaderboards` and `SortableTable` are selectable), and touch feedback (pressed
  controls dim). **Sites:** apps add the class to `app.html`; websites leave it off.

## 1.1.1 and earlier

See the git tags `@wells-nelson/displays@<version>`.
