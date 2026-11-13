# Changelog: @wells-nelson/displays

## Unreleased (minor)

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
