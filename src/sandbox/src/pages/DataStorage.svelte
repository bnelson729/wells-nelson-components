<script lang="ts">
	import { Badge, Button, IconButton } from '@wells-nelson/displays';
	import type { DataSet, Location } from '@wells-nelson/data-storage';
	import { generateMigration, tablesFromSchemas } from '@wells-nelson/data-storage/sql';
	import { AddRow, Checkbox, Toggle } from '@wells-nelson/interactions';
	import { AccountPanel } from '@wells-nelson/interactions/account';
	import seed from 'virtual:seed';
	import { onMount } from 'svelte';
	import { collections, refs, schemas, store, type Docs, type NoteDoc, type ProjectDoc, type TaskDoc, type TaskLinkDoc } from '../demo-store';
	import Panel from '../Panel.svelte';

	const { app, cloud, ops, prefs, tombstones } = store;
	let error = $state<string | null>(null);

	onMount(() => void store.init());

	// ------------------------------------------------ live rows (RxDB queries)
	let localProjects = $state<ProjectDoc[]>([]);
	let cloudProjects = $state<ProjectDoc[]>([]);

	function watchProjects(ds: DataSet<Docs> | null, set: (rows: ProjectDoc[]) => void) {
		if (!ds) return set([]);
		const sub = ds.db.collections.projects.find().$.subscribe((docs) => set(docs.map((d) => d.toMutableJSON())));
		return () => sub.unsubscribe();
	}
	$effect(() => watchProjects(app.local, (rows) => (localProjects = rows)));
	$effect(() => watchProjects(app.cloud, (rows) => (cloudProjects = rows)));

	// Read tombstones reactively: re-derive whenever the lists change.
	const entries = $derived(
		ops.entries(localProjects, cloudProjects).sort((a, b) => a.container.name.localeCompare(b.container.name))
	);

	let selectedId = $state<string | null>(null);
	const selected = $derived(entries.find((e) => e.container.id === selectedId));
	let tasks = $state<TaskDoc[]>([]);
	let links = $state<TaskLinkDoc[]>([]);
	let notes = $state<NoteDoc[]>([]);

	$effect(() => {
		const entry = selected;
		if (!entry) return;
		const ds = app.dataSet(entry.location);
		const selector = { project_id: entry.container.id };
		const subs = [
			ds.db.collections.tasks.find({ selector }).$.subscribe((d) => (tasks = d.map((x) => x.toMutableJSON()))),
			ds.db.collections.task_links.find({ selector }).$.subscribe((d) => (links = d.map((x) => x.toMutableJSON()))),
			ds.db.collections.notes.find({ selector }).$.subscribe((d) => (notes = d.map((x) => x.toMutableJSON())))
		];
		return () => subs.forEach((s) => s.unsubscribe());
	});

	const short = (id: string) => id.slice(0, 8);
	const taskTitle = (id: string) => tasks.find((t) => t.id === id)?.title ?? `? ${short(id)}`;

	async function run(fn: () => Promise<unknown> | unknown) {
		error = null;
		try {
			await fn();
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		}
	}

	// ------------------------------------------------ actions
	async function seedProjects() {
		const ds = app.dataSet('local');
		for (const p of seed?.projects ?? []) {
			const projectId = ops.createContainer(ds, { name: p.name });
			const t = Date.now();
			const rows = p.tasks.map((task) => ({ ...task, id: crypto.randomUUID(), project_id: projectId, updated_at: t }));
			await ops.insertContainerDocs(ds, {
				tasks: rows,
				task_links:
					rows.length > 1
						? [{ id: `${rows[0].id}:${rows[1].id}`, project_id: projectId, from_id: rows[0].id, to_id: rows[1].id, updated_at: t }]
						: [],
				notes: [{ id: crypto.randomUUID(), project_id: projectId, text: p.note, mentions: rows.map((r) => r.id).join(','), updated_at: t }]
			});
		}
	}

	async function duplicate(id: string, location: Location) {
		const ds = app.dataSet(location);
		const copyId = await ops.copyContainer(ds, ds, id, true);
		const original = entries.find((e) => e.container.id === id)!.container.name;
		ops.renameContainer(ds, copyId, `${original} (copy)`);
		selectedId = copyId;
	}

	function addTask(title: string) {
		const entry = selected!;
		const ds = app.dataSet(entry.location);
		const id = crypto.randomUUID();
		ops.insertDoc(ds, 'tasks', { id, project_id: entry.container.id, title, external_ref: '', done: false, updated_at: Date.now() }, entry.container.id);
	}

	function setDone(task: TaskDoc, done: boolean) {
		ops.patch(app.dataSet(selected!.location), 'tasks', task.id, task.project_id, { done });
	}

	// ------------------------------------------------ device storage and SQL
	let storageTick = $state(0);
	const deviceKeys = $derived.by(() => {
		void storageTick;
		void entries;
		return Object.keys(localStorage)
			.filter((k) => k.startsWith('sandbox:'))
			.sort()
			.map((k) => `${k} = ${localStorage.getItem(k)}`);
	});

	let sqlRoles = $state(true);
	const sql = $derived(
		generateMigration({
			title: 'Sandbox projects: schema for RxDB <-> Supabase replication.',
			container: 'projects',
			containerField: 'project_id',
			noun: 'project',
			roles: sqlRoles,
			tables: tablesFromSchemas(collections, schemas as never, { containerField: 'project_id', refs })
		})
	);
</script>

<Panel title="Store" note="createSyncedStore with Dexie (IndexedDB) in this browser. Data survives reloads.">
	<p>
		{#if app.fatal}
			<span class="error">Couldn't open the database: {app.fatal}</span>
		{:else if !app.ready}
			Opening…
		{:else}
			Ready · local data set <code>sandbox_local</code> · cloud {cloud.configured ? (app.cloud ? 'connected' : 'signed out') : 'not configured'}
		{/if}
	</p>
	<div class="row">
		<Button variant="primary" icon="plus" onclick={() => run(seedProjects)} disabled={!app.ready}>Add mock projects</Button>
		{#if !seed}<span class="muted">The mock seed is only served by the dev server.</span>{/if}
	</div>
	<AddRow placeholder="New project" label="Add project" onadd={(name) => run(() => (selectedId = ops.createContainer(app.dataSet('local'), { name })))} />
	{#if error}<p class="error">{error}</p>{/if}
</Panel>

<Panel title="Projects" note="ops.entries merges local and cloud and skips tombstoned ones. Duplicate copies with new ids; delete hides at once.">
	{#if entries.length === 0}
		<p class="muted">No projects yet.</p>
	{/if}
	<ul class="list">
		{#each entries as e (e.container.id)}
			<li class:selected={e.container.id === selectedId}>
				<button type="button" class="name" onclick={() => (selectedId = e.container.id)}>{e.container.name}</button>
				<Badge tone={e.location === 'cloud' ? 'accent' : 'neutral'}>{e.location}</Badge>
				{#if prefs.defaultContainerId === e.container.id}<Badge tone="warning">Default</Badge>{/if}
				<IconButton
					icon="check"
					label="Make default"
					active={prefs.defaultContainerId === e.container.id}
					onclick={() => (prefs.setDefaultContainer(prefs.defaultContainerId === e.container.id ? null : e.container.id), storageTick++)}
				/>
				<IconButton icon="copy" label="Duplicate with new ids" onclick={() => run(() => duplicate(e.container.id, e.location))} />
				{#if app.cloud && e.location === 'local'}
					<IconButton icon="cloud" label="Make cloud-enabled" onclick={() => run(() => ops.makeCloud(e.container.id))} />
				{/if}
				<IconButton
					icon="trash"
					label="Delete"
					onclick={() => run(() => ops.deleteContainer(app.dataSet(e.location), e.container.id).then(() => storageTick++))}
				/>
			</li>
		{/each}
	</ul>
</Panel>

{#if selected}
	<Panel title={`“${selected.container.name}”`} note="Tasks are patched through TanStack DB; links and notes show the ids a duplicate rewrites. External refs are kept.">
		<ul class="list">
			{#each tasks as task (task.id)}
				<li>
					<Checkbox label={`${task.title} done`} hideLabel checked={task.done} onchange={(on) => setDone(task, on)} />
					<span class="name">{task.title}</span>
					<code class="muted">{short(task.id)}</code>
					{#if task.external_ref}<Badge>{task.external_ref}</Badge>{/if}
				</li>
			{/each}
		</ul>
		<AddRow placeholder="New task" label="Add task" onadd={addTask} />
		{#each links as link (link.id)}
			<p class="small">Link <code>{short(link.from_id)}:{short(link.to_id)}</code>: {taskTitle(link.from_id)} → {taskTitle(link.to_id)}</p>
		{/each}
		{#each notes as note (note.id)}
			<p class="small">Note “{note.text}” mentions {note.mentions.split(',').filter(Boolean).map(taskTitle).join(', ')}</p>
		{/each}
		<p class="muted small">Tombstoned here: {tombstones.has(selected.location, selected.container.id) ? 'yes' : 'no'}</p>
	</Panel>
{/if}

<Panel title="Account" note="The real CloudSync. Configure Supabase in src/sandbox/.env.local to sign in.">
	<AccountPanel
		{cloud}
		account={cloud}
		nouns={{ singular: 'project', plural: 'projects' }}
		appName="the sandbox"
		returnUrl={() => `${location.origin}${location.pathname}#/data-storage`}
		pendingName={(id) => entries.find((e) => e.container.id === id)?.container.name ?? 'Deleted project'}
	/>
</Panel>

<Panel title="Device storage" note="Persisted values under the sandbox: prefix (tombstones, prefs, sync state).">
	<div class="row"><Button icon="refresh" onclick={() => storageTick++}>Refresh</Button></div>
	<pre>{deviceKeys.join('\n') || 'Nothing stored yet.'}</pre>
</Panel>

<Panel title="SQL migration" note="generateMigration from this store's schemas.">
	<Toggle label="Roles" bind:checked={sqlRoles} />
	<pre>{sql}</pre>
</Panel>

<style>
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	.list:empty {
		display: none;
	}
	.list li {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 3rem;
		padding: 0 0.25rem 0 0.5rem;
	}
	.list li + li {
		border-top: 1px solid var(--border);
	}
	.list li.selected {
		background: var(--accent-soft);
	}
	.name {
		flex: 1;
		min-width: 0;
		padding: 0.5rem 0.25rem;
		border: none;
		background: none;
		text-align: left;
		font-weight: 600;
		cursor: pointer;
	}
	span.name {
		font-weight: 400;
		cursor: default;
	}
	p {
		margin: 0;
	}
	.small {
		font-size: 0.9rem;
	}
	.error {
		color: var(--danger);
	}
</style>
