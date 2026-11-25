# Design guide

How sites built on `@wells-nelson/displays` and `@wells-nelson/interactions` look and behave, and which
component to reach for. This is the shared design: each site's own style guide adds only what's specific
to it (its screens, its domain) and links here for the rest. Wording rules are in
[content-style.md](content-style.md); props are in each package's README; every component is live in the
sandbox (`npm run sandbox`), and the **States** page shows each one in every state.

- [Conventions for component APIs](#conventions-for-component-apis)
- [Tokens](#tokens)
- [Choosing a component](#choosing-a-component)
- [Patterns](#patterns): pages, rows, creating, editing, deleting, sections, feedback
- [Components](#components): the most used ones, with when to use them and their accessibility contract
- [Adding to the library](#adding-to-the-library)

## Conventions for component APIs

Every component follows these. A new one is reviewed against them (the pull request checklist).

1. **Names describe meaning, not looks.** `tone` is intent (`neutral | accent | danger | warning |
   success`); `variant` is emphasis (`solid | outline | ghost`); `size` is `sm | md | lg`. No combined
   values like `danger-ghost`, and no pixel numbers in public props, except `Icon`'s `size`.
2. **Accessible names are required props.** Anything without visible text takes a required `label`. A
   visible label can be hidden with `hideLabel`, never left out.
3. **State props match ARIA.** `checked`, `pressed`, `expanded`, `current`, `selected`, `invalid`,
   `disabled`, `busy`. Use the ARIA word even when it reads oddly.
4. **Values are bindable, with a change event.** `bind:value` (or `checked`, `open`, `expanded`) and
   `onchange(value)` for a control's one value, `on<name>change` for others (`onexpandedchange`). A
   component is either controlled through those or keeps internal state with an initial value; never
   both through different props.
5. **Events say what happened.** `on<verb>` (`onclose`, `onsubmit`, `onactivechange`). A callback that can
   be async may return a promise; the component shows busy and errors (like `NameModal`, `ConfirmDialog`).
6. **Form controls share `FieldProps`:** `label`, `hideLabel`, `hint`, `error`, `required`, `optional`,
   `disabled`, wired to `aria-describedby` and `aria-invalid` the same way everywhere.
7. **Composition before configuration.** Content goes in snippets (`children`, `footer`, `actions`,
   `empty`), not string props, once it might need markup. More than about 12 props means it should be
   split.
8. **Escape hatches.** Interactive components pass other attributes (`aria-*`, `data-*`, `title`) to their
   main element, and every component accepts `class`, as a last resort. Styling a component's internals
   from a site (`:global(.icon-btn)`) is a bug to report, not a fix; the design check fails on it.
9. **Defaults are the common case.** If sites pass the same value at most call sites, the default is
   wrong or the component needs context (as `ListRow` gives its icon buttons).
10. **Only tokens.** No raw colors, font sizes, z-indexes or durations in component CSS.
11. **Every state is designed:** hover, focus-visible, active, disabled, busy, error, empty, read-only,
    long content, forced colors and reduced motion. Each appears on the sandbox's States page.
12. **Changes follow semver from the changelog.** Additive is minor, behavior or visual fixes are patch,
    anything a site must change is major. A rename ships as a deprecated alias with a development warning
    (`deprecated()`) for at least one minor, with a codemod in `scripts/codemods/`.

## Tokens

All in `@wells-nelson/displays/theme.css`, light and dark. A palette (`palettes/*.css`) sets the accent
and, optionally, tinted neutrals; see [the palette contract](../src/npm/displays/src/lib/palettes/README.md).

| Kind      | Tokens                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| Surfaces  | `--bg` (page), `--surface` (cards, rows, fields), `--surface-2` (headers, tints), `--surface-hover`, `--scrim` |
| Text      | `--text`, `--muted` (secondary text, quiet actions)                                                           |
| Lines     | `--border` (hairlines), `--border-strong` (outlined buttons), `--control-border` (3:1 control outlines)         |
| Accent    | `--accent` (main actions, selection), `--accent-strong` (hover), `--accent-text`, `--accent-soft`, `--on-accent` |
| Intents   | `--danger`, `--warning`, `--success`, each with `-soft` and `--on-…`                                          |
| Controls  | `--focus` (the focus ring), `--on-control` (a switch's thumb)                                                  |
| Space     | `--space-1` … `--space-6`: 0.25, 0.5, 0.75, 1, 1.5, 2rem                                                       |
| Type      | `--text-xs` 0.75, `--text-sm` 0.875, `--text-md` 1, `--text-lg` 1.125, `--text-xl` 1.5rem; `--weight-*`; `--leading-*` |
| Shape     | `--radius-sm`, `--radius`, `--radius-lg`, `--radius-full`; `--shadow`, `--shadow-lg`                          |
| Layers    | `--z-raised`, `--z-sticky`, `--z-dropdown`, `--z-fixed`, `--z-floating`, `--z-overlay` (dialogs use the top layer) |
| Motion    | `--duration-instant`, `--duration-fast`, `--duration-normal`, `--ease-out`; off under reduced motion          |
| Sizing    | `--tap` (44px targets), `--header-h`, `--tabbar-h`, `--content-w`, `--modal-max-w`                            |

Naming: `--<role>` for a base color, `--<role>-soft` for a tinted background, `--<role>-text` for the color
used as text on surfaces, `--on-<role>` for content on a solid `--<role>` fill. A site's own tokens go in its
`src/app.css`, named by meaning, not by app.

**Phone breakpoint:** `PHONE_MAX_WIDTH` (`40rem`). In CSS, `@media (max-width: 40rem)` and
`(min-width: 40rem)`, never `40.01rem`. `phoneLayout` (JavaScript) also counts a phone held sideways.

**Global classes** are part of the API, with the same semver rules as props: `.page`, `.page-title`,
`.stack`, `.card`, `.row-card`, `.card-section`, `.lines` / `.line` / `.line-text` / `.line-name` /
`.line-subtext` / `.line-heading`, `.overline`, `.inline-icon`, `.muted`, `.text-sm`, `.error-text`,
`.empty`, `.visually-hidden`, `.selectable`, and `touch-app` on `<html>`.

## Choosing a component

| Need                                                        | Use                                                          | Not                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------- |
| The main action of a form or screen                         | `Button variant="solid" tone="accent"`                        | more than one solid button per area   |
| Other actions                                               | `Button` (outline, the default)                              |                                       |
| A quiet destructive action under a form's fields            | `Button variant="ghost" tone="danger"`                        | a danger button in the footer         |
| Icon-only action                                            | `IconButton` (always with `label`)                           | a bare `<button>` with an icon        |
| Title of a page or card, with its actions                   | `PageHeader`                                                 | a hand-built title row                |
| On/off that applies right away                              | `Toggle`                                                     | `Checkbox`                            |
| On/off next to a title, where room is short                 | `IconButton pressed`                                         |                                       |
| A row's state, or picking several things                    | `Checkbox` (`block` for a whole row)                         |                                       |
| One of two to five short options, all visible               | `Segmented` (`size="sm"` inside a row)                        | `SelectField`                         |
| One of a fixed list                                         | `SelectField`                                                | a hand-built `<select>`               |
| Pick an existing thing or create one by typing              | `Combobox`                                                   |                                       |
| Text                                                        | `TextField`                                                  |                                       |
| Any other control that needs a label, hint or error        | `Field`                                                      |                                       |
| Create something by name                                    | "+ New …" `Button` in the `PageHeader`, opening `NameModal`   | an inline "name + plus" row           |
| Edit one thing                                              | its `Modal`, driven by an `Overlay`                           | clearing its state before it closed   |
| Ask before something that can't be undone                   | `ConfirmDialog tone="danger"`                                 | confirming frequent, undoable actions |
| Something that can be undone                                | `UndoStack` + `UndoButton`                                    | a confirmation                        |
| Something the person should know (failed, pending, worked)  | `Notice`                                                     | a `.notice` div                       |
| An error after an action                                    | `ErrorMessage`                                               | raw `error.message`                   |
| Status of a thing ("Pending", "Default")                    | `Badge`                                                      |                                       |
| A list of content (tasks, entries)                          | `ul.lines` of `ListRow`s, `ListHeading` between groups        | cards per row                         |
| A list of places to go (projects)                           | `.card` + `.row-card` links                                   |                                       |
| Groups of rows that collapse                                | `CollapsibleSection`                                          |                                       |
| Active and inactive things (members)                        | `ActiveList`                                                  |                                       |
| Numbers to compare                                          | `SortableTable`, `Leaderboards`                               |                                       |

## Patterns

### Pages

- A page is `.page` (max width `--content-w`) with one `PageHeader` (the `h1`) at the top: the title on
  the left, the page's actions on the right ("+ New …", a toggle). A page that belongs to another has
  `back` ("Back to Projects").
- Collections are a vertical `.stack` of cards, or a `.lines` list. A row is at least 3rem tall.
- Touch targets are at least `--tap` (44px) square.
- Fixed bottom UI (search bar, Undo) leaves room with a spacer and sits above a `TabBar` through
  `--footer-offset`.

### Rows

- **Navigation rows** (one per page to open): the whole row is the link and highlights on hover.
  `IconButton`s on them keep the default size (`lg`).
- **Content rows** (`ListRow`): tapping the text does nothing. Actions are explicit: a checkbox on the
  left, then the words (`.line-name`, then an optional `.line-subtext`), then small muted `IconButton`s.
  The pencil is always the far-right action.
- **Anatomy of a line:** the left edge is the tick box in a 44px cell; a line without one indents its text
  the same, so names line up. Lines run edge to edge with a hairline between them; a group's heading
  between lines is a `ListHeading`. No outlined or filled `Button`s inside a line.
- Status is a small muted icon with an accessible label, or a `Badge`.

### Creating things

- Things with only a name are created with a "+ New …" button in the `PageHeader` (or the section's
  plus), which opens `NameModal`.
- Things with more fields open their modal empty. A "Save and add another" button keeps the shared
  choices for the next one.
- Pre-fill from context: adding from a section's plus selects that section.

### Editing

- The pencil opens the editor for the thing it's on, as a `Modal`. Nothing else opens editors.
- **Modal anatomy:** title "Edit …" or "New …"; the fields; a destructive action as a quiet danger button
  under the fields, never in the footer; footer with Cancel, then the main action on the far right.
- Escape, ✕ and Cancel close without saving. A click outside closes too, until something has been typed or
  changed.
- **The modal pattern:** keep the modal mounted and hold what it's about in an `Overlay`, cleared only
  after the dialog has closed (`onclosed`). A `{#key}` on the thing's id starts the form fresh each time:

  ```svelte
  <script lang="ts">
  	const editTask = new Overlay<Task>();
  </script>

  <IconButton icon="pencil" label="Edit task" onclick={() => editTask.show(task)} />

  <Modal bind:open={editTask.isOpen} onclosed={editTask.closed} title="Edit task">
  	{#if editTask.value}
  		{#key editTask.value.id}<TaskForm task={editTask.value} onsaved={editTask.hide} />{/key}
  	{/if}
  </Modal>
  ```

  A modal component with its own form state can instead be mounted while the overlay has a value, keyed
  on it, with `bind:open={overlay.isOpen} onclosed={overlay.closed}`: it stays until the dialog has closed,
  and each opening starts a fresh form.

### Deleting

- Deletes that can't be undone ask in a `ConfirmDialog tone="danger"`: a question as the title, the thing
  named in its message, the verb repeated on the button ("Delete project").
- Deletes that need a choice (move the contents or delete them) can use a two-step inline flow instead,
  where the second step is the confirmation.
- Deleted things disappear immediately.

### Sections

- `CollapsibleSection`: the header (chevron, title, count, plus, pencil) stays pinned while you scroll
  its rows. The chevron and the title both expand and collapse; settings open only from the pencil.
- Collapsing from a pinned header scrolls the section back into view below the app header.
- An empty section says so in its `empty` snippet.

### Feedback and errors

- Frequent, reversible actions show Undo (8 seconds, kept while hovered or focused) instead of asking.
- Unavailable actions are disabled with a short reason next to them, not hidden.
- Errors appear next to what failed, in plain words (`ErrorMessage`); a field's error is its `error`.
- Empty states say what to do next.

### Motion and touch

- Motion is short (`--duration-fast` for state changes) and turns off under reduced motion.
- Apps (`touch-app`) don't select text on a long press, except in fields and `.selectable` content, and
  dim a pressed control right away.

## Components

The most used components. Each has an example on the sandbox's Displays or Interactions page, and every
state on the States page.

### Button

A labelled action, or a link drawn as one (`href`).

- **Use when:** there's a word for the action. One `solid accent` button per area at most.
- **Don't use when:** the action is an icon (`IconButton`), or it's navigation in running text (a link).
- **Props:** `variant` (`solid | outline | ghost`, default outline), `tone` (default neutral), `size`
  (`md | lg`), `icon`, `block`, `busy`, `disabled`, `href`.
- **Accessibility:** its text is its name. `busy` keeps focus on the button (`aria-busy`,
  `aria-disabled`) and ignores clicks, so the person doesn't lose their place; a disabled or busy link
  has no `href`.

### IconButton

A round, icon-only button or link, 44px square.

- **Use when:** a well-known icon says it all (edit, delete, close, share), in rows, headers and toolbars.
- **Don't use when:** the action needs a word to be understood; use a `Button` with an `icon`.
- **Props:** `label` (required), `size` (`sm` rows, `md` section headers, `lg` headers and navigation;
  `ListRow` and `CollapsibleSection` rows default to small and muted), `tone` (`neutral | muted | accent
  | danger`), `pressed` (on/off), `current` (link to the current page), `showLabel`.
- **Accessibility:** `label` is the name and the tooltip; `pressed` sets `aria-pressed`, `current` sets
  `aria-current="page"`; both stay visible in forced colors.

### Modal and Overlay

A dialog over the page (native `<dialog>`: top layer, Escape closes, background inert).

- **Use when:** editing or creating one thing, or a short focused task.
- **Don't use when:** it's a whole page of content, or a message that needs no decision (`Notice`).
- **Props:** `open` (bindable), `title`, `size` (`sm | md | lg`), `footer`, `onclose` (the person closed
  it), `onclosed` (closing finished, by any route), `dismissible`.
- **Pattern:** drive it with an `Overlay`, which keeps what it shows until it has closed (see [Editing](#editing)).
- **Accessibility:** focus starts on an `autofocus` element, else (mouse or keyboard) the first field,
  else the first footer button; on touch screens a field isn't focused unasked.

### ConfirmDialog

- **Use when:** something can't be undone. **Don't use when:** it can (offer Undo).
- **Props:** `title` (a question), `message` or `children`, `confirmLabel` (required: the verb and its
  object), `tone="danger"` for destructive actions, `onconfirm` (may be async: busy, then errors shown).
- **Accessibility:** opens with focus on Cancel.

### PageHeader

- **Use when:** a page (or a card section, `level={2}`) has a title and actions beside it.
- **Props:** `title`, `level`, `id`, `actions` (snippet), `back` (`{ href, label }`).
- **Accessibility:** the title is the page's `h1` (or the given level); actions wrap under it when narrow.

### ListRow and ListHeading

- **Use when:** listing content in `.lines` (see [Rows](#rows)).
- **Props:** `ListRow` passes attributes and attachments (drag and drop) to its `<li>`; icon buttons
  inside are small and muted unless they say otherwise.

### TextField, SelectField, Field

- **Use when:** text (`TextField`), one of a fixed list (`SelectField`), any other control (`Field` gives
  the control its id and ARIA through its snippet argument).
- **Props:** `FieldProps` (`label`, `hideLabel`, `hint`, `error`, `required`, `optional`, `disabled`);
  `readonly` on `TextField` shows the value as plain text, at full contrast.
- **Accessibility:** the label is a real `<label>`; hint and error are tied with `aria-describedby`, an
  error sets `aria-invalid` and is announced; `required` sets `aria-required` (not the native attribute,
  so the site's message shows rather than the browser's). After a failed submit, `focusFirstInvalid`.

### Checkbox, Toggle, Segmented

- **Checkbox:** a row's state, or one of several choices saved with a form. `description` adds a second
  line, `children` richer content, `block` makes a whole line one checkbox, `tone="muted"` a gray tick
  for done things.
- **Toggle:** a setting that applies immediately (`role="switch"`).
- **Segmented:** two to five short, mutually exclusive options, all visible; `size="sm"` inside a row.
- **Accessibility:** each stretches a real, invisible `<input>` over the whole control; states stay
  visible in forced colors; `FieldProps` hint and error as for fields.

### Notice and ErrorMessage

- **Notice:** something to know, in one look: `warning`, `danger`, `info`, `success`; optional
  `actions`, `ondismiss`, or `href` for the whole notice. `role="alert"` for failures that appear while
  someone works, `role="status"` for news.
- **ErrorMessage:** an error from an action, in plain words, with the technical text behind "Details".

### Badge and Icon

- **Badge:** a short status pill (`neutral | accent | warning | danger | success`), or `tone="count"`
  with a `label` for assistive tech. Long text is cut short with an ellipsis.
- **Icon:** 24×24 stroke icons. Decorative unless given `label`. `inline` sits it in a line of text;
  `.inline-icon` around it draws it like the button it stands for. Sites declare the icons they register
  (`interface AppIcons`) so names are type-checked; an unknown name warns in development.

## Adding to the library

When to update a shared component, create one, or build locally, and the checklist for a new component,
are in [CONTRIBUTING.md](../CONTRIBUTING.md#what-belongs-in-the-library).
