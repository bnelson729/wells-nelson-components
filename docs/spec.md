# Overview

Shared components for any Wells Nelson project.

## Node Components

Components for NodeJS for display, interactions, and data storage.

Built on the following stack: SvelteKit 3 / Svelte 5, TanStack DB on RxDB (IndexedDB), Supabase sync, plain CSS.

Each group below is its own package under `src/npm`, built, tested and shipped separately. The
sandbox (`npm run sandbox`) shows every group against mock data.

### Node Displays (`@wells-nelson/displays`)

| Component | What it does | Options |
| --- | --- | --- |
| `Button` | Button with primary / secondary / danger / ghost variants, an optional icon, and full width | `variant`, `icon`, `block` |
| `IconButton` | Icon-only button or link with a required accessible label and an "active" state | `href`, `active`, `size` |
| `Icon` | 24×24 stroke icon set rendered from inline SVG paths | Base set (plus, x, check, pencil, trash, share, chevron, alert, cloud, wifi-off, user, gear, undo, refresh, mail, search, grip…); apps add theirs with `registerIcons` |
| `Modal` | Native `<dialog>` with title, close button, scrollable body, optional footer | `size`: sm / md |
| `ConfirmDialog` | Yes/no dialog on top of `Modal`, with a danger variant and a busy state | `danger`, `confirmLabel` |
| `Badge` | Small status pill ("Default", "Pending", "Editor") | `tone`: neutral / accent / warning / danger |
| `AppHeader` | Fixed header: brand on the left, context nav icons, profile avatar with an unsynced-changes dot, and a dev-only slot | `hideOnScroll`, `width`, snippets for brand, nav and dev tools |
| `SortableTable` | Table with a pinned first column; tap a header to sort or flip, rows without a value sort last | Column config: key, title, value, display |
| `Leaderboards` | A sideways-scrolling row of "top N" cards | Generic rows and value formatter |
| Theme CSS | Design tokens (colors, radius, shadows, header height, light/dark), base element styles, `.page` / `.card` / `.row-card` / `.notice` / `.empty` helpers, drag-and-drop styles | Blue default; green palette; accent tokens overridable |
| `Splash`, `FatalError` | Startup placeholder, and the "database couldn't be opened" message | Brand text and messages |

### Node Interactions (`@wells-nelson/interactions`)

| Component | What it does | Options |
| --- | --- | --- |
| `TextField` | Labeled input with error and hint text | |
| `Checkbox` | Custom checkbox (a real input stretched over the control) with an optional hidden label | `hideLabel` |
| `Toggle` | Switch (`role="switch"`) for settings that apply immediately | |
| `Combobox` | Type-to-filter dropdown that offers "Create “…”" when there's no exact match | `createLabel` |
| `AddRow` | Inline "name + plus" creator that refocuses after adding | |
| `Segmented` | Joined radio buttons for one-of-a-few choices | |
| `CollapsibleSection` | Section with a sticky header (chevron, title, count, add and edit actions) that collapses in place and scrolls back into view when collapsed while pinned | Optional drag and drop, `variant`, `appearance`: card / lines |
| `ActiveList` | Active rows plus a collapsible "inactive" section, with an active checkbox and a pencil per row | Generic over the row type, `appearance`: card / lines |
| `longpress` action | Fires after a still hold and swallows the click that follows | |
| Drag and drop (`draggable`, `dropZone`, `reorder`) | Long-press drag for touch and mouse, ordered drop zones with an insertion line, collapse-all during a drag, and scroll restored after the drop | Built on the same press detection as `longpress` |
| `UndoStack` + `UndoButton` | Stackable undo for quick, reversible actions: the button shows for 5 seconds, and history is dropped after 1 minute idle | Generic `{ undo() }` entries |
| `SearchBar` | Fixed bottom search box with a clear button | Matching stays in the app |
| `DevWipeButton` + `wipeAllData()` | Dev-only "delete every database and setting, then reload" | Message, teardown hook |
| Sign-in panel (`AccountPanel` and its cards) | "Continue with Google" plus "Email me a sign-in link", offline and not-configured states, and the signed-in summary with sync status and sign-out (warning about unsynced changes) | Composable cards, email link optional |
| `LocalItemsPrompt` | After sign-in, offers to make never-asked-about local-only containers cloud-enabled | Nouns, callbacks |
| `ShareModal` | Invite by email, list active / pending members, remove members; offers sign-in or cloud-enable first | Optional roles (role picker, last-owner rules) |
| `ContainerEditModal` | Rename, "open when the app starts", cloud-enabled toggle with a disconnect warning, delete / leave | Nouns, role-aware delete vs leave |

The account and sharing components take the sync layer through plain interfaces, so this package
has no storage dependency.

### Node Data Storage (`@wells-nelson/data-storage`)

Data lives in **containers** (e.g. a project or a list) that hold all the other rows and are
what gets shared. The storage layer is parameterized by the container table and its id field
(e.g. `project_id`).

| Component | What it does | Options |
| --- | --- | --- |
| `Persisted` | Reactive value mirrored to localStorage, failure-tolerant, re-keyable per user | |
| `openDatabase` | Creates an RxDB database with a pluggable storage factory and a last-write-wins conflict handler | Schemas as a parameter |
| `flatSchema` | Builds RxDB JSON schemas for flat tables (all fields required, string id) | Tables stay in apps |
| `createDataSet` | Wraps every RxDB collection in a TanStack DB collection (GC off, optional container index); local vs cloud data set; dispose | Collection list, container field |
| Cloud sync engine (`CloudSync`) | Supabase session (Google, email link), per-user cloud database, live replication per collection, pending-change tracking with "settle", last sync time, push blocking for removed containers, membership / revocation checks, cached roles, rejected-write detection, sign-out teardown | Collections, container field, roles |
| Deletion tombstones | Hides deleted rows at once and keeps hiding them if a sync briefly restores an old copy; per data set; pruned after a week | Key prefix |
| Container operations | `removeDocs` (bump `updated_at`, then soft-delete), move a container between local and cloud, copy with id remapping (including ids inside text fields), purge from the device without pushing, keep-copy on lost access | `refs` and a remap hook for composite ids and ids in text |
| Device preferences | Default container (cold-start redirect), "already prompted" list, collapsed sections | Subclass for app-specific prefs |
| Supabase helpers | Lazy client (PKCE), members API (fetch, invite, remove, leave, my memberships) with friendly error messages | Table and RPC names, optional roles |
| Env config (`envConfig`) | Reads the Supabase URL and key; local-only mode when they're missing | |
| SQL migration generator | `set_modified` trigger and `_modified` checkpoint index, `current_email()`, membership table with an `is_member` helper and RLS loop, creator-becomes-member trigger, "touch rows on new share" trigger, members RPC with active/pending, realtime publication | Table list, container table, roles (adds last-owner protection) |

`createSyncedStore` wires all of it from one config.

### Build and deployment tooling (`@wells-nelson/build-tools`)

* **Service worker** (`registerAppShellCache`): precaches the app shell and assets, serves the cached shell for navigations when offline, and leaves cross-origin requests alone.
* **`wn-postbuild`:** copies `404.html` to `index.html` and writes `.nojekyll`, with an optional check that forbidden strings (e.g. dev-only seed data) didn't leak into the build.
* **`wn-icons`:** PWA icons and favicon drawn from one to three letters, with colors as parameters.
* **`wn-manifest`:** `manifest.webmanifest`.
* **Vite config pieces:**
  * `basePath`: the `BASE_PATH` handling (one value for GitHub Pages or a custom domain)
  * `optimizeDeps` for the RxDB, TanStack and Supabase packages
  * `devJsonModule`: a dev-only virtual module for seed data
* **Templates:** GitHub Pages workflow and `manifest.webmanifest`.

### Notes for packaging

* Svelte 5 components are published with `@sveltejs/package`.
* Peer dependencies: `svelte`, `@tanstack/db`, `@tanstack/rxdb-db-collection`, `rxdb`, `rxjs` and `@supabase/supabase-js`. Keep the RxDB override in apps, so the TanStack adapter shares the app's single RxDB copy.
* Library code uses relative imports only.
