# Changelog: @wells-nelson/interactions

## Unreleased (minor)

- New `NameModal`: create something by name (one field, Cancel and Create, optional extra fields, `validate`,
  async `onsubmit` with its error shown). Opened from a "+ New …" button by the page or section title.
- `AddRow` `onempty`: with it, the + (or Enter) on an empty field opens the full form (e.g. a `NameModal`)
  instead of doing nothing; the + is no longer disabled.
- New `DataRiskButton` and `deviceMayClearData()` (`/account`): Safari, and every browser on iPhone and
  iPad, deletes a site's data after 7 days without a visit unless the app is installed. Show the button
  next to each local-only container there; it explains the risk and the ways out (install the app, sign in
  and make it cloud-enabled, or use another browser). `installHint()` says how to install on the device.
- `AppVersion` `links`: a line of links under the version, e.g. the privacy policy and terms (new tab).
- `Combobox` shows a choice set from outside (an app filling in a likely option): the box used to stay
  empty until it was focused and left.
- `ContainerEditModal` takes `children`: the app's own settings for the container, under "Open … when the
  app starts".

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

Accessibility and usability pass:

- `CollapsibleSection`: the title is a heading (`headingLevel`, h2 by default) holding the collapse button, so
  screen reader users can move between sections; the chevron is a pointer-only duplicate, out of the tab order
  and hidden from assistive tech.
- `AddRow`: the field is named by its placeholder (the text people see), the button by `label` (before, both
  had `label`).
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
