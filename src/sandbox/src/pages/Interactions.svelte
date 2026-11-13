<script lang="ts">
	import { Badge, Button, IconButton, Modal } from '@wells-nelson/displays';
	import {
		ActiveList,
		AddRow,
		AppVersion,
		Checkbox,
		CollapsibleSection,
		Combobox,
		DevWipeButton,
		SearchBar,
		SyncBanners,
		Segmented,
		TextField,
		Toggle,
		UndoButton,
		UndoStack,
		dropZone,
		longpress,
		preventZoom,
		reorder,
		wipeAllData,
		type ComboChoice,
		type DragData
	} from '@wells-nelson/interactions';
	import {
		people as mockPeople,
		statuses as mockStatuses,
		tags,
		tasks as mockTasks,
		type Status,
		type Task
	} from '../mock';
	import Panel from '../Panel.svelte';

	// ------------------------------------------------ inputs
	let name = $state('');
	let checked = $state(true);
	let toggled = $state(false);
	let tagChoice = $state<ComboChoice>(null);
	let updateAvailable = $state(false);
	let checks = 0;
	let tagOptions = $state(tags.map((t) => ({ id: t.id, label: t.label })));
	let priority = $state<'low' | 'normal' | 'high'>('normal');
	const nameError = $derived(name && name.trim().length < 3 ? 'At least 3 characters.' : null);

	function createTag() {
		if (tagChoice && 'newName' in tagChoice) {
			const id = `g${tagOptions.length + 1}`;
			tagOptions = [...tagOptions, { id, label: tagChoice.newName }];
			tagChoice = { id };
		}
	}

	// ------------------------------------------------ tasks grouped by status, with drag and drop
	let tasks = $state<Task[]>(mockTasks.map((t) => ({ ...t })));
	let statusOrder = $state<Status[]>(mockStatuses.map((s) => s.id));
	let collapsed = $state<Record<string, boolean>>({});
	let dragging = $state<'task' | 'section' | null>(null);
	let query = $state('');
	const undo = new UndoStack();
	let appearance = $state<'card' | 'lines'>('card');

	const visible = $derived(
		query.trim() ? tasks.filter((t) => t.title.toLowerCase().includes(query.trim().toLowerCase())) : tasks
	);
	const statusName = (id: Status) => mockStatuses.find((s) => s.id === id)!.name;
	const personName = (id: string) => mockPeople.find((p) => p.id === id)?.name ?? '';

	function moveTask(data: DragData, status: Status, index: number) {
		const task = tasks.find((t) => t.id === data.id);
		if (!task) return;
		const before = tasks.map((t) => ({ ...t }));
		const others = tasks.filter((t) => t.id !== task.id);
		const inStatus = others.filter((t) => t.status === status);
		const anchor = inStatus[index];
		const moved = { ...task, status };
		const at = anchor ? others.indexOf(anchor) : others.length;
		tasks = [...others.slice(0, at), moved, ...others.slice(at)];
		undo.push({ undo: () => void (tasks = before) });
	}

	function toggleDone(task: Task) {
		const previous = task.status;
		task.status = previous === 'done' ? 'todo' : 'done';
		undo.push({ undo: () => void (tasks.find((t) => t.id === task.id)!.status = previous) });
	}

	function addTask(status: Status) {
		const title = prompt(`New task in “${statusName(status)}”`);
		if (title?.trim()) tasks = [...tasks, { id: crypto.randomUUID(), title: title.trim(), status, assignee: 'p1' }];
	}

	// ------------------------------------------------ people
	let people = $state(mockPeople.map((p) => ({ ...p })));
	let inactiveOpen = $state(false);
	let opened = $state<string | null>(null);
	let collapsibleActive = $state(true);
	let sideBySide = $state(true);
	let comboModal = $state(false);
	let modalTag = $state<ComboChoice>(null);
	let noZoom = $state(false);
	const syncApp = $state({ writeError: null as string | null });
	const syncCloud = $state({ rejectedWrite: null as string | null });
	$effect(() => {
		if (noZoom) return preventZoom();
	});

	// ------------------------------------------------ long press
	let presses = $state(0);
	let clicks = $state(0);
</script>

<Panel title="Inputs">
	<TextField label="Project name" bind:value={name} error={nameError} hint="Shown when there's no error." />
	<div class="row">
		<Checkbox label="Notify me" bind:checked />
		<Checkbox label="Hidden label" hideLabel />
	</div>
	<Toggle label="Applies immediately" bind:checked={toggled} />
	<Combobox label="Tag" options={tagOptions} bind:choice={tagChoice} createLabel="Create tag" />
	<Button onclick={() => (comboModal = true)}>Combobox at the end of a modal</Button>
	<div class="row">
		<span class="muted">Choice: <code>{JSON.stringify(tagChoice)}</code></span>
		{#if tagChoice && 'newName' in tagChoice}<Button onclick={createTag}>Create it</Button>{/if}
	</div>
	<Segmented
		label="Priority"
		bind:value={priority}
		options={[
			{ value: 'low', label: 'Low' },
			{ value: 'normal', label: 'Normal' },
			{ value: 'high', label: 'High' }
		]}
	/>
	<p class="muted">Checked: {checked} · toggled: {toggled} · priority: {priority}</p>
</Panel>

<Panel
	title="CollapsibleSection, drag and drop, undo, search"
	note="Long-press a task to drag it to another position or section; long-press a section header to reorder sections. Tick a task to finish it, then use Undo (bottom left). The search bar at the bottom filters."
>
	<Segmented
		label="Appearance (CollapsibleSection and ActiveList)"
		bind:value={appearance}
		options={[
			{ value: 'card', label: 'Card' },
			{ value: 'lines', label: 'Lines' }
		]}
	/>
	<div
		class="sections"
		class:lines={appearance === 'lines'}
		use:dropZone={{
			accepts: (d) => d.type === 'section',
			ordered: true,
			ondrop: (d, index) => (statusOrder = reorder(statusOrder, d.id, index) as Status[])
		}}
	>
		{#each statusOrder as status (status)}
			{@const rows = visible.filter((t) => t.status === status)}
			<CollapsibleSection
				title={statusName(status)}
				count={rows.length}
				countLabel={(n) => `${n} tasks`}
				collapsed={!!collapsed[status] || dragging === 'section'}
				ontogglecollapse={() => (collapsed[status] = !collapsed[status])}
				onadd={() => addTask(status)}
				addLabel={`Add to ${statusName(status)}`}
				onedit={() => alert(`Settings for “${statusName(status)}”`)}
				variant={status === 'done' ? 'subtle' : 'default'}
				{appearance}
				dragData={{ type: 'section', id: status }}
				ondragstart={() => (dragging = 'section')}
				ondragend={() => (dragging = null)}
				drop={{
					accepts: (d) => d.type === 'task',
					ordered: true,
					ondrop: (d, index) => moveTask(d, status, index)
				}}
			>
				{#each rows as task (task.id)}
					<li class="task" data-dnd-item>
						<Checkbox
							label={`${task.title} done`}
							hideLabel
							checked={task.status === 'done'}
							onchange={() => toggleDone(task)}
						/>
						<span class="title" class:done={task.status === 'done'}>{task.title}</span>
						<Badge>{personName(task.assignee).split(' ')[0]}</Badge>
					</li>
				{/each}
			</CollapsibleSection>
		{/each}
	</div>
	<p class="muted">Section order: {statusOrder.map(statusName).join(' → ')}</p>
</Panel>

<Panel title="ActiveList" note="Active rows, then a collapsible inactive section. The checkbox toggles active.">
	<ActiveList
		items={people}
		noun="People"
		label={(p) => p.name}
		bind:inactiveOpen
		{appearance}
		{collapsibleActive}
		{sideBySide}
		ontoggle={(p, on) => (people.find((x) => x.id === p.id)!.active = on)}
		onopen={(p) => (opened = p.name)}
	/>
	<Toggle label="Active section collapses (collapsibleActive)" bind:checked={collapsibleActive} />
	<Toggle label="Side by side once 40rem wide (sideBySide)" bind:checked={sideBySide} />
	<p class="muted">Inactive open: {inactiveOpen} · last opened: {opened ?? '—'}</p>
</Panel>

<Panel
	title="AppVersion"
	note="The running version; Update appears once a newer deploy is out. The check here finds one every other time."
>
	<Toggle label="Update available" bind:checked={updateAvailable} />
	{#key updateAvailable}
		<AppVersion
			version="1.4.2"
			{updateAvailable}
			onupdate={() => alert('The app would reload here.')}
			oncheck={async () => {
				await new Promise((r) => setTimeout(r, 600));
				return checks++ % 2 === 1;
			}}
		/>
	{/key}
</Panel>

<Panel title="SyncBanners" note="The store's failed-write banners. Each dismiss clears the error.">
	<div class="row">
		<Button onclick={() => (syncApp.writeError = 'QuotaExceededError: the device is out of storage')}
			>Fail a local write</Button
		>
		<Button onclick={() => (syncCloud.rejectedWrite = 'new row violates row-level security policy for table "tasks"')}>
			Reject a cloud write
		</Button>
	</div>
	<SyncBanners app={syncApp} cloud={syncCloud} />
</Panel>

<Panel title="preventZoom" note="Stops pinch and double-tap zoom on this page (try it on a phone or tablet).">
	<Toggle label="Prevent zoom" bind:checked={noZoom} />
</Panel>

<Modal bind:open={comboModal} title="New task">
	<TextField label="Title" value="Write the summary" />
	<Combobox label="Tag" options={tagOptions} bind:choice={modalTag} createLabel="Create tag" />
	{#snippet footer()}
		<Button variant="primary" onclick={() => (comboModal = false)}>Done</Button>
	{/snippet}
</Modal>

<Panel title="AddRow">
	<AddRow
		placeholder="Add a person"
		label="Add person"
		onadd={(n) => (people = [...people, { id: crypto.randomUUID(), name: n, email: '', active: true }])}
	/>
</Panel>

<Panel title="longpress" note="Hold the button still for half a second. The click after a long press is swallowed.">
	<div class="row">
		<button type="button" class="press" use:longpress={() => presses++} onclick={() => clicks++}
			>Press or hold me</button
		>
		<span class="muted">Clicks: {clicks} · long presses: {presses}</span>
	</div>
</Panel>

<Panel
	title="DevWipeButton"
	note="Deletes this origin's IndexedDB and storage (including the Data storage page's database), then reloads."
>
	<div class="row">
		<DevWipeButton onconfirm={() => wipeAllData({ redirectTo: location.pathname })} />
		<IconButton icon="refresh" label="Reload" onclick={() => location.reload()} />
	</div>
</Panel>

<SearchBar bind:value={query} placeholder="Search tasks" />
<UndoButton stack={undo} />

<style>
	.task {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		min-height: 3rem;
		padding: 0 0.75rem 0 0.25rem;
		border-top: 1px solid var(--border);
		list-style: none;
	}
	.title {
		flex: 1;
		min-width: 0;
	}
	.title.done {
		color: var(--muted);
		text-decoration: line-through;
	}
	.sections {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.sections.lines {
		/* These sections sit on a white panel, not the page. */
		--section-header-bg: var(--surface);
		gap: 0;
		border-top: 1px solid var(--border);
	}
	.press {
		padding: 0.75rem 1rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface);
		cursor: pointer;
		user-select: none;
		-webkit-touch-callout: none;
	}
</style>
