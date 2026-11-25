# Changelog: @wells-nelson/interactions

The heading `## Unreleased (patch|minor|major)` decides the next release's version, and the release
turns it into `## <version> (<date>)`. See [PUBLISHING.md](../../../PUBLISHING.md).

## Unreleased (major)

2.0: fields share one set of props, modals can stay mounted, and props follow the displays vocabulary.
Needs `@wells-nelson/displays` 2.0. **Apps:** run `node scripts/codemods/v2.mjs <app folder>` from this
repository and finish what it lists.

- **Breaking:** `AddRow` is removed: create things with a "+ New …" `Button` that opens `NameModal`.
- **Breaking:** `CollapsibleSection`: `collapsed` and `ontogglecollapse` are `expanded` (bindable, the
  opposite) and `onexpandedchange(expanded)`; `variant` is `emphasis`; `appearance` is `layout`.
- **Breaking:** `ActiveList`: `ontoggle` is `onactivechange`, `inactiveOpen` is `inactiveExpanded`,
  `appearance` is `layout`. Its rows are `ListRow`s.
- **Breaking:** `SignOutCard` and `SyncStatusCard` are no longer exported from `/account`; use
  `AccountPanel`.
- New `Overlay`: what a modal is about, kept until the dialog has finished closing. The default modal pattern:
  keep the modal mounted, `bind:open={overlay.isOpen}` and `onclosed={overlay.closed}`, so nothing reads a
  value that was cleared while the dialog closed.
- `NameModal` can stay mounted: `open` is bindable, it starts again from `value` each time it opens, and takes
  `onclosed`; `onclose` is optional and means the person backed out.
- New `Field` (label, hint and error around any control) and `SelectField` (a labelled dropdown), and a
  `FieldProps` type every control shares: `label`, `hideLabel`, `hint`, `error`, `required`, `optional`,
  `disabled`.
- `Checkbox`: `description`, `children` (rich label content), `block` (the whole row is the checkbox), `hint`
  and `error`; other attributes go to the input.
- `Segmented`: `size="sm"` for a compact choice inside a row, `hint`, `error`, `required`, `optional`,
  `hideLabel`; it's a labelled `radiogroup`, and the chosen option stays visible in forced colors.
- `Toggle`: `hint` and `error`; the thumb is `--on-control`.
- `Combobox`: `hint`, `optional`, `disabled` and `onchange(choice)`.
- `TextField`: other attributes go to the input as before; `readonly` reads as plain text.
- `CollapsibleSection` and `ActiveList` take an `empty` snippet; icon buttons in a section's rows are small and
  muted.
- Every component uses the theme's scales (space, type, layers, motion) and takes `class`.

## 1.2.5 (2026-11-24)

- New `NameModal`: create something by name (one field, Cancel and Create, optional extra fields, `validate`,
  async `onsubmit` with its error shown). Opened from a "+ New …" button by the page or section title.
- `AddRow` `onempty`: with it, the + (or Enter) on an empty field opens the full form (e.g. a `NameModal`)
  instead of doing nothing; the + is no longer disabled.

## 1.2.4 (2026-11-23)

- New `DataRiskButton` and `deviceMayClearData()` (`/account`): Safari, and every browser on iPhone and
  iPad, deletes a site's data after 7 days without a visit unless the app is installed. Show the button
  next to each local-only container there; it explains the risk and the ways out (install the app, sign in
  and make it cloud-enabled, or use another browser). `installHint()` says how to install on the device.
- `AppVersion` `links`: a line of links under the version, e.g. the privacy policy and terms (new tab).
- `Combobox` shows a choice set from outside (an app filling in a likely option): the box used to stay
  empty until it was focused and left.
- `ContainerEditModal` takes `children`: the app's own settings for the container, under "Open … when the
  app starts".

## 1.2.3 (2026-11-22)

Content pass (one vocabulary for sync, errors people can act on):

- Errors in the account cards, `ShareModal`, `ContainerEditModal`, `LocalItemsPrompt`, `DeviceDataCard`
  and `SyncBanners` are plain sentences (`ErrorMessage`), with the technical text behind "Details".
  `errorText` now comes from `@wells-nelson/displays` and takes the action ("Couldn't sign out…").
- Sync words: "Sync now" (was "Force re-sync"), "waiting to sync", "Not synced yet", "Last synced: Today at
  3:04 PM", "Some changes couldn't sync to your account." No "upload", "the cloud" or "reached the cloud" in
  sentences.
- `ShareModal`: a visible "Email address to share with" label; says no email is sent; "Shared with …" after
  sharing; `inviteHint`; "Stop sharing with …" for every member; "Sign in to share".
- `ContainerEditModal`: "Make “…” local-only?"; deletes end "This can't be undone."; the cloud-enabled
  toggle says what it does.
- `AccountPanel` / `ShareModal` without Supabase: "Sign-in isn't available" ("This version of … can't sign
  in"), instead of "this copy of …".
- `TextField` `optional`: "(optional)" in the label.
- `CollapsibleSection`: the count reads "1 item" (was "1 items"); add and edit default to "Add to {title}" and
  "Edit {title}".
- `ActiveList`: checkbox "Ann is active"; empty text defaults to "No {noun} yet.", and "No inactive {noun}.".
- `AppVersion`: "Update now"; a failed check says whether you're offline.
- `DeviceDataCard`: "Added 2 projects to this device."; busy "Asking the browser…".

## 1.2.2 (2026-11-22)

- `CollapsibleSection`: the title is a heading (`headingLevel`, h2 by default) holding the collapse button, so
  screen reader users can move between sections; the chevron is a pointer-only duplicate, out of the tab order
  and hidden from assistive tech.
- `AddRow`: the field is named by its placeholder (the text people see), the button by `label` (before, both
  had `label`).

## 1.2.1 (2026-11-21)

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

## 1.2.0 (2026-11-12)

- `SyncBanners`: the rejected-write and write-error banners every site shows, dismissable.
- `checkForUpdatesOnStart`, `touchFeedback` and `preventZoom`: start-up helpers for apps.
- `errorText(err)`: an error as one line for the UI.
- `ActiveList` `collapsibleActive` (not remembered) and `sideBySide` (columns once 40rem wide).
- `Combobox` makes room below itself inside a scrolling container, so its options aren't cut off.

## 1.1.0 and earlier

See the git tags `@wells-nelson/interactions@<version>`. Versions 1.2.1 to 1.2.5 were released as
patches (the bump then came from commit messages) although several added features; their headings
were reconstructed from git history.
