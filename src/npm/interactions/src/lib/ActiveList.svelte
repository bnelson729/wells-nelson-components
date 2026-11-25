<script lang="ts" generics="T extends { id: string; active: boolean }">
	import { Badge, Icon, IconButton, ListRow } from '@wells-nelson/displays';
	import type { Snippet } from 'svelte';
	import Checkbox from './Checkbox.svelte';

	/**
	 * Active rows first, then a collapsible inactive section. Each row has an active checkbox and a
	 * pencil that opens it; tapping the name does nothing. Bind `inactiveExpanded` to persist whether
	 * the inactive section is expanded (e.g. to device preferences). `collapsibleActive` lets the
	 * active section collapse too (always expanded when shown again), and `sideBySide` puts the
	 * two sections in columns, both expanded, once the list is wide enough.
	 */
	let {
		items,
		noun,
		label,
		onopen,
		onactivechange,
		readOnly = false,
		inactiveExpanded = $bindable(false),
		emptyText,
		empty,
		layout = 'card',
		collapsibleActive = false,
		sideBySide = false,
		class: className
	}: {
		items: T[];
		/** Plural noun for headings, e.g. "Members". */
		noun: string;
		label: (item: T) => string;
		onopen: (item: T) => void;
		/** After the person ticks or unticks a row's "active" checkbox. */
		onactivechange: (item: T, active: boolean) => void;
		readOnly?: boolean;
		/** Whether the inactive section is expanded. */
		inactiveExpanded?: boolean;
		emptyText?: string;
		/** Shown instead of `emptyText` when there are no active rows. */
		empty?: Snippet;
		/**
		 * `card` (default): rounded cards. `lines`: fills its container edge to edge with no card,
		 * so the rows read like lines on paper.
		 */
		layout?: 'card' | 'lines';
		/** The active section can be collapsed too. Not remembered: it starts expanded every time. */
		collapsibleActive?: boolean;
		/**
		 * When the list is at least `SIDE_BY_SIDE_MIN` wide, show active and inactive side by side,
		 * both always expanded (the collapse toggles go away).
		 */
		sideBySide?: boolean;
		/** Last resort: a class on the root element. */
		class?: string;
	} = $props();

	/** Width (px) from which `sideBySide` puts the sections in columns: two 20rem columns. */
	const SIDE_BY_SIDE_MIN = 640;

	let width = $state(0);
	let activeOpen = $state(true);
	const columns = $derived(sideBySide && width >= SIDE_BY_SIDE_MIN);
	const showActive = $derived(columns || !collapsibleActive || activeOpen);
	const showInactive = $derived(columns || inactiveExpanded);

	const sectionClass = $derived(['group', layout, layout === 'card' && 'card']);

	const active = $derived(items.filter((i) => i.active));
	const inactive = $derived(items.filter((i) => !i.active));
</script>

{#snippet row(item: T)}
	<ListRow class="row">
		{#if readOnly}
			<span class="state" class:on={item.active}><Icon name={item.active ? 'check' : 'x'} size={16} /></span>
		{:else}
			<Checkbox
				checked={item.active}
				label={`${label(item)} is active`}
				hideLabel
				onchange={(checked) => onactivechange(item, checked)}
			/>
		{/if}
		<span class="line-text"><span class="line-name">{label(item)}</span></span>
		<IconButton icon="pencil" label={`${readOnly ? 'View' : 'Edit'} ${label(item)}`} onclick={() => onopen(item)} />
	</ListRow>
{/snippet}

<div class={['active-list', columns && 'columns', className]} bind:clientWidth={width}>
	<section class={sectionClass}>
		{#if collapsibleActive && !columns}
			<button type="button" class="toggle strong" aria-expanded={activeOpen} onclick={() => (activeOpen = !activeOpen)}>
				<span class="chev" class:collapsed={!activeOpen}><Icon name="chevron" size={20} /></span>
				Active {noun.toLowerCase()}
				<Badge tone="count">{active.length}</Badge>
			</button>
		{:else}
			<h2>Active {noun.toLowerCase()} <Badge tone="count">{active.length}</Badge></h2>
		{/if}
		{#if showActive}
			<ul>
				{#each active as item (item.id)}
					{@render row(item)}
				{:else}
					<li class="muted empty-row">
						{#if empty}{@render empty()}{:else}{emptyText ?? `No ${noun.toLowerCase()} yet.`}{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if inactive.length > 0 || columns}
		<section class={sectionClass}>
			{#if columns}
				<h2 class="muted-heading">Inactive {noun.toLowerCase()} <Badge tone="count">{inactive.length}</Badge></h2>
			{:else}
				<button
					type="button"
					class="toggle"
					aria-expanded={inactiveExpanded}
					onclick={() => (inactiveExpanded = !inactiveExpanded)}
				>
					<span class="chev" class:collapsed={!inactiveExpanded}><Icon name="chevron" size={20} /></span>
					Inactive {noun.toLowerCase()}
					<Badge tone="count">{inactive.length}</Badge>
				</button>
			{/if}
			{#if showInactive}
				<ul>
					{#each inactive as item (item.id)}
						{@render row(item)}
					{:else}
						<li class="muted empty-row">No inactive {noun.toLowerCase()}.</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>

<style>
	.columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0 var(--space-3);
		align-items: start;
	}
	.card {
		margin-bottom: var(--space-3);
		overflow: hidden;
	}
	.lines {
		width: 100%;
		border-bottom: 1px solid var(--border);
	}
	h2,
	.toggle {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: 0;
		padding: var(--space-3) var(--space-4);
		font-size: var(--text-md);
		font-weight: var(--weight-bold);
	}
	.toggle {
		width: 100%;
		border: none;
		background: none;
		cursor: pointer;
		padding-left: var(--space-2);
		color: var(--muted);
	}
	.toggle.strong {
		color: inherit;
	}
	.muted-heading {
		color: var(--muted);
	}
	.chev {
		display: grid;
		transition: transform var(--duration-fast);
	}
	.chev.collapsed {
		transform: rotate(-90deg);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.active-list :global(.row) {
		padding-right: var(--space-2);
	}
	.state {
		display: grid;
		place-items: center;
		width: var(--tap, 2.75rem);
		color: var(--muted);
	}
	.state.on {
		color: var(--accent-text);
	}
	.empty-row {
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--border);
	}
</style>
