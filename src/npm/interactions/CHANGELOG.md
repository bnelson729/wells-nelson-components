# Changelog: @wells-nelson/interactions

## Unreleased (minor)

Accessibility and usability pass:

- `TextField`: error and hint tied to the input (`aria-describedby`), errors announced; `hideLabel`, `required`.
- `Combobox`: `aria-activedescendant` and option ids; `aria-selected` marks the chosen option; errors tied and announced.
- `Checkbox`: `disabled`, `tone="muted"`; 44px; states stay visible in forced-colors mode (so does `Toggle`'s).
- `Toggle`, `Segmented`, `AddRow`, `SearchBar`: 44px, 3:1 outlines (`--control-border`), a real focus ring.
- `UndoStack`: visible 8 s by default, `pause` / `resume` (the button keeps itself up while hovered or focused),
  entries take a `label`, shown and announced with the button (`UndoButton` is a status region).
- `focusFirstInvalid(form)`: after a failed submit, focus the first invalid field.
- `CollapsibleSection` and `ActiveList` use `Badge tone="count"`; the section count has a spoken label.
- `SyncBanners` and `SignInCard` use `Notice`. Account cards use `.card-section`, quiet danger buttons and
  announced errors. `SyncStatusCard` says what to do after a sync error. `AccountPanel`'s "not set up" text is
  for the people using the app, not developers.
- `LocalItemsPrompt`: "Keep them on this device" (was "Not now", which never asked again) with a note on
  changing it later; the primary button waits until something is ticked.

- `SyncBanners`: the rejected-write and write-error banners every site shows, dismissable.
- `checkForUpdatesOnStart`, `touchFeedback` and `preventZoom`: start-up helpers for apps.
- `errorText(err)`: an error as one line for the UI.
- `ActiveList` `collapsibleActive` (not remembered) and `sideBySide` (columns once 40rem wide).
- `Combobox` makes room below itself inside a scrolling container, so its options aren't cut off.

## 1.1.0 and earlier

See the git tags `@wells-nelson/interactions@<version>`.
