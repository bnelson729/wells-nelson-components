# Content style

How every Wells Nelson app words things, so they read as one family. The shared components follow it, and their
wording helpers (`errorText`, `plural`, `formatDate` and friends in `@wells-nelson/displays`) do the mechanical
parts. Each app's own `docs/style.md` adds its domain terms.

Examples use a made-up to-do app with **projects** and **tasks**.

## Voice

Plain, calm, brief and specific. Say what happened and what to do, in the reader's words, in one or two
sentences. Second person ("you", "your"). Apps don't speak as "we"; a company website and its policies do.

| Moment | Tone | Example |
| --- | --- | --- |
| Success | Light and short, often just the fact | "Saved", "Added: Groceries, Laundry", "Done: Laundry" |
| Empty | Inviting, with the next step | "No projects yet. Name one below to get started." |
| Error | Calm, specific, no blame, a way forward | "Couldn't reach the server. Check your connection and try again." |
| Destructive | Exact about what goes and whether it comes back | "“Home” and all its tasks will be deleted for everyone it's shared with. This can't be undone." |
| Sensitive | Matter-of-fact, options first | "Someone removed your access to “Home”. You can keep a local-only copy, or remove it from this device." |

No exclamation marks. No jargon: say "storage on this device", not "database"; "sync", not "replicate".

## Terms

| Use | Don't use | Meaning |
| --- | --- | --- |
| sign in / sign out | log in, log out | Start or end a session ("sign-in" is the noun) |
| sync, synced, not synced yet, waiting to sync | upload, reach the cloud, saved to the cloud | Copying changes between this device and your account |
| Sync now | Force re-sync | Try syncing immediately |
| your account | the cloud, our servers (in sentences) | Where synced data lives |
| cloud-enabled / local-only | online / offline (as a setting) | The setting on a shared container ("offline" is only about the connection) |
| on this device | in this browser (unless the browser is the subject) | Local storage |
| share, stop sharing | invite (as a button), unshare | Give or take away someone's access |
| viewer, editor, owner | member, admin | Access levels |
| delete | remove (for permanent deletion) | Gone for good |
| remove | delete (for taking something out of a place) | Taken out of a group or device; it still exists elsewhere |
| leave | quit, exit | Remove yourself from something shared with you |
| edit {thing} | {thing} settings | What the pencil opens |
| backup, export, import | download, save file | A file of your data |
| Profile | Account, Settings (for the screen) | Where sign-in, sync and data live |

## Capitalization

- Sentence case everywhere: titles, buttons, labels, tabs, table headers.
- Capitalize product names, screen names as they appear in navigation ("the Profile"), and proper nouns.
- Use the product's full name in sentences, titles and accessible names; its initials are only a visual mark.

## Punctuation

- Full stops end sentences in body text, hints, errors and empty states. None on buttons, labels, titles,
  tabs, badges or one-word statuses ("Saved").
- Confirmation titles are questions: "Delete this task?"
- Straight apostrophes (`'`). Curly double quotes around names people typed: “Home”.
- One ellipsis character (…) for work in progress ("Saving…") and for choices that need more ("Project…").
- A middle dot ( · ) separates metadata and page-title parts ("Tasks · Home · To Do"); an em dash with spaces
  ( — ) sets off an aside; an en dash marks scores and ranges ("8–7", "Jul 11 – Jul 12").
- No Oxford comma ("projects, tasks and notes").

## Numbers, dates and times

- Numerals always ("3 tasks", "1 project"). Count with `plural()`, never by hand. "No …" in empty states.
- Dates: "Sat, Jun 7"; with the year when it isn't this year: "Sat, Jun 7, 2025" (`formatDate`). Long form on
  policy pages: "November 22, 2026" (`formatLongDate`). No ordinals ("7th"), no numeric dates ("6/7/2025").
- Times: "9:00 AM", no leading zero, no seconds (`formatTime`). Recent events: "Today at 3:04 PM",
  "Yesterday at 3:04 PM" (`formatRecent`).
- Ranges: "Jul 11 – Jul 12"; "2 of 3 tasks".

## Controls

- Buttons are a verb plus the object when it isn't obvious ("Delete task", "Save and add another", "Add 3
  tasks"). The same action has the same label everywhere.
- Editors are titled "Edit {thing}" / "New {thing}", and the label that opens something matches its title.
- Field labels are nouns ("Task name"). Hints go under the field, with the format or an example. Mark
  "(required)" and "(optional)" in the label (`TextField`'s `required` / `optional`) when a form has both;
  never use a placeholder as the only label or as the optional marker.
- Tooltips are extras. Anything a touch-screen user needs is visible text.

## Templates

**Error:** `Couldn't {action}. {Why, if it helps}. {What to do}.`
"Couldn't save the task. Check your connection and try again." Show it with `ErrorMessage`: messages written
for people (`userError`) show as they are; anything else becomes "Couldn't {action}. Try again in a moment."
with the technical text behind "Details". Never join a raw message into a sentence.

**Field error:** an instruction. "Add a name." / "Use a whole number, up to 4 digits." / "Pick a project, or
type a new one." Shown on Save (and when leaving a field after a Save attempt), next to the field, tied with
`aria-describedby`; focus moves to the first one.

**Empty state:** `No {things} yet. {How to add one, naming the control}.` "No tasks yet. Use New task to add
one." Read-only: "No tasks yet. An editor can add them." Filtered: "Nothing matches “{query}”."

**Confirmation:** title `{Verb} this {thing}?`; message names the thing, says what goes with it and who it
affects, says what stays, and ends "This can't be undone." when it can't (and only then). Buttons: "Cancel"
and `{Verb} {thing}` ("Delete task"), busy `{Verb}ing…`.

**Success:** what happened, in as few words as possible; never "successfully". "Saved", "Shared with
sam@example.com." Undoable actions show the Undo button with the past action: "Done: Laundry", "Undo".

**Offline:** "You're offline. {What} once you're back online."
