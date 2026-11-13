<script lang="ts">
	import {
		Badge,
		Button,
		ConfirmDialog,
		FatalError,
		Icon,
		IconButton,
		Leaderboards,
		Modal,
		SortableTable,
		Splash,
		baseIcons,
		phoneLayout,
		type SortableColumn
	} from '@wells-nelson/displays';
	import { Segmented, Toggle } from '@wells-nelson/interactions';
	import { stats, type MemberStats } from '../mock';
	import Panel from '../Panel.svelte';
	import { shell } from '../state.svelte';

	const extraIcons = ['layout', 'cursor', 'users', 'database', 'tool'];
	let modalOpen = $state(false);
	let modalSize = $state<'sm' | 'md' | 'lg'>('md');
	let confirmOpen = $state(false);
	let dangerConfirm = $state(true);
	let confirmed = $state(0);
	let activeIcon = $state(false);

	const columns: SortableColumn<MemberStats>[] = [
		{ key: 'assigned', title: 'Tasks', full: 'Tasks assigned', value: (s) => s.assigned },
		{ key: 'done', title: 'Done', full: 'Tasks done', value: (s) => s.done },
		{
			key: 'donePct',
			title: 'Done %',
			full: 'Share of tasks done',
			value: (s) => s.donePct,
			display: (s) => (s.donePct == null ? '' : `${s.donePct}%`)
		},
		{ key: 'overdue', title: 'Late', full: 'Overdue tasks', value: (s) => s.overdue },
		{
			key: 'avgDays',
			title: 'Avg days',
			full: 'Average days to finish',
			value: (s) => s.avgDays,
			display: (s) => s.avgDays?.toFixed(1) ?? ''
		}
	];
	let sortKey = $state('assigned');
	let descending = $state(true);
	let showEmpty = $state(false);

	const top = (value: (s: MemberStats) => number | null, desc = true) =>
		stats
			.filter((s) => value(s) != null)
			.sort((a, b) => (desc ? value(b)! - value(a)! : value(a)! - value(b)!))
			.slice(0, 3);
	const boards = [
		{ title: 'Most done', rows: top((s) => s.done), value: (s: MemberStats) => s.done },
		{ title: 'Best done %', rows: top((s) => s.donePct), value: (s: MemberStats) => `${s.donePct}%` },
		{ title: 'Fastest', rows: top((s) => s.avgDays || null, false), value: (s: MemberStats) => `${s.avgDays}d` },
		{ title: 'Most late', rows: top((s) => s.overdue), value: (s: MemberStats) => s.overdue }
	];
</script>

<Panel title="Theme" note="theme.css plus the optional green palette. Dark mode follows the system setting.">
	<Segmented
		label="Palette"
		bind:value={shell.palette}
		options={[
			{ value: 'blue', label: 'Blue (default)' },
			{ value: 'green', label: 'Green' }
		]}
	/>
	<div class="swatches">
		{#each ['--bg', '--surface', '--surface-2', '--text', '--muted', '--border-strong', '--accent', '--accent-soft', '--danger', '--danger-soft', '--warning', '--warning-soft'] as token (token)}
			<div class="swatch"><span style:background={`var(${token})`}></span><code>{token}</code></div>
		{/each}
	</div>
	<div class="notice"><Icon name="alert" /> A <code>.notice</code> using the warning tokens.</div>
	<label class="date">
		<span>A <code>datetime-local</code> input, styled like the text inputs</span>
		<input type="datetime-local" value="2026-06-07T10:00" step="300" />
	</label>
	<p class="muted">
		On a touch screen this text can't be selected; fields and <code>.selectable</code> content (the tables and leaderboards
		below) can.
	</p>
	<div class="card empty">An <code>.empty</code> state inside a <code>.card</code>.</div>
</Panel>

<Panel title="AppHeader" note="The header at the top of this sandbox. Change it here.">
	<Toggle label="Unsynced changes dot" bind:checked={shell.unsynced} />
	<Toggle label="Avatar image" bind:checked={shell.avatar} />
	<Toggle label="Hide on scroll (scroll down to try)" bind:checked={shell.hideOnScroll} />
	<Toggle label="Wide (64rem)" bind:checked={shell.wide} />
	<Segmented
		label="Nav labels (showLabel, and the header's labels option)"
		bind:value={shell.labels}
		options={[
			{ value: 'none', label: 'None' },
			{ value: 'always', label: 'Always' },
			{ value: 'active', label: 'Active only' }
		]}
	/>
	<Toggle label="Label the profile (profileShowLabel)" bind:checked={shell.profileLabel} />
</Panel>

<Panel
	title="TabBar"
	note="Bottom navigation for phones, instead of the header. While it's shown, the search bar and Undo on the Interactions page sit above it (--footer-offset). Automatic follows phoneLayout: narrow screens, and touch screens held sideways."
>
	<Segmented
		label="Tab bar"
		bind:value={shell.tabBar}
		options={[
			{ value: 'off', label: 'Off' },
			{ value: 'on', label: 'On' },
			{ value: 'auto', label: 'Automatic' }
		]}
	/>
	<p class="muted">phoneLayout matches this screen: <strong>{phoneLayout.current ? 'yes' : 'no'}</strong></p>
</Panel>

<Panel title="Button and IconButton">
	<div class="row">
		<Button variant="primary" icon="plus">Primary</Button>
		<Button>Secondary</Button>
		<Button variant="danger" icon="trash">Danger</Button>
		<Button variant="ghost">Ghost</Button>
		<Button variant="primary" disabled>Disabled</Button>
	</div>
	<Button block icon="share">Block</Button>
	<div class="row">
		<IconButton icon="pencil" label="Edit" />
		<IconButton icon="share" label="Share" active={activeIcon} onclick={() => (activeIcon = !activeIcon)} />
		<IconButton icon="trash" label="Delete" disabled />
		<IconButton icon="gear" label="Settings (link)" href="#/displays" />
		<IconButton icon="home" label="Home" href="#/displays" showLabel />
		<span class="muted">The share button toggles <code>active</code>.</span>
	</div>
</Panel>

<Panel title="Icon" note="The base set, then icons registered by this sandbox with registerIcons.">
	<div class="icons">
		{#each [...Object.keys(baseIcons), ...extraIcons] as name (name)}
			<div class="icon-cell" class:extra={extraIcons.includes(name)}>
				<Icon {name} size={24} />
				<code>{name}</code>
			</div>
		{/each}
	</div>
</Panel>

<Panel title="Badge">
	<div class="row">
		<Badge>Default</Badge>
		<Badge tone="accent">Editor</Badge>
		<Badge tone="warning">Pending</Badge>
		<Badge tone="danger">Removed</Badge>
	</div>
</Panel>

<Panel title="Modal and ConfirmDialog">
	<div class="row">
		<Button onclick={() => ((modalSize = 'md'), (modalOpen = true))}>Open modal</Button>
		<Button onclick={() => ((modalSize = 'lg'), (modalOpen = true))}>Open large modal</Button>
		<Button onclick={() => (confirmOpen = true)}>Open confirm</Button>
		<Toggle label="Danger" bind:checked={dangerConfirm} />
		<span class="muted">Confirmed {confirmed} times</span>
	</div>
</Panel>

<Panel title="SortableTable" note="Tap a header to sort, tap again to flip. Rows without a value sort last.">
	<Toggle label="No rows" bind:checked={showEmpty} />
	<SortableTable
		title="Members"
		rows={showEmpty ? [] : stats}
		{columns}
		rowKey={(s) => s.id}
		rowLabel={(s) => s.name}
		bind:sortKey
		bind:descending
	/>
	<p class="muted">Sorted by <code>{sortKey}</code>, {descending ? 'descending' : 'ascending'}.</p>
</Panel>

<Panel title="Leaderboards">
	<Leaderboards {boards} rowKey={(s) => s.id} rowLabel={(s) => s.name} />
</Panel>

<Panel title="Splash and FatalError" note="Full-screen in an app; framed here.">
	<div class="frame"><Splash text="WN" /></div>
	<div class="frame"><FatalError error="QuotaExceededError: storage is full" /></div>
</Panel>

<Modal bind:open={modalOpen} title={modalSize === 'lg' ? 'A large modal' : 'A modal'} size={modalSize}>
	<p>Native <code>&lt;dialog&gt;</code> with a scrollable body. Close with Esc, the backdrop, or the buttons.</p>
	{#each Array(12) as _, i (i)}<p class="muted">Filler line {i + 1}</p>{/each}
	{#snippet footer()}
		<Button onclick={() => (modalOpen = false)}>Close</Button>
	{/snippet}
</Modal>

<ConfirmDialog
	bind:open={confirmOpen}
	title="Archive this project?"
	message={'It disappears from the list.\n\nThe confirm button stays busy for a second to show the busy state.'}
	confirmLabel="Archive"
	danger={dangerConfirm}
	onconfirm={() => new Promise<void>((r) => setTimeout(() => (confirmed++, r()), 1000))}
/>

<style>
	.date {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-weight: 600;
		font-size: 0.9rem;
	}
	.swatches {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
		gap: 0.5rem;
	}
	.swatch {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
	}
	.swatch span {
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 0.4rem;
		border: 1px solid var(--border-strong);
	}
	.icons {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
		gap: 0.5rem;
	}
	.icon-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.6rem 0.25rem;
		border-radius: var(--radius);
		background: var(--surface-2);
		font-size: 0.75rem;
	}
	.icon-cell.extra {
		background: var(--accent-soft);
	}
	.frame {
		height: 12rem;
		overflow: hidden;
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius);
		background: var(--bg);
	}
	.frame :global(.splash) {
		min-height: 12rem;
	}
</style>
