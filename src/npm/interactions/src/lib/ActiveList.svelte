<script lang="ts" generics="T extends { id: string; active: boolean }">
	import { Icon, IconButton } from '@wells-nelson/displays';
	import Checkbox from './Checkbox.svelte';

	/**
	 * Active rows first, then a collapsible inactive section. Each row has an active checkbox and a
	 * pencil that opens it; tapping the name does nothing. Bind `inactiveOpen` to persist whether
	 * the inactive section is expanded (e.g. to device preferences).
	 */
	let {
		items,
		noun,
		label,
		onopen,
		ontoggle,
		readOnly = false,
		inactiveOpen = $bindable(false),
		emptyText = 'None yet.',
		appearance = 'card'
	}: {
		items: T[];
		/** Plural noun for headings, e.g. "Members". */
		noun: string;
		label: (item: T) => string;
		onopen: (item: T) => void;
		ontoggle: (item: T, active: boolean) => void;
		readOnly?: boolean;
		inactiveOpen?: boolean;
		emptyText?: string;
		/**
		 * `card` (default): rounded cards. `lines`: fills its container edge to edge with no card,
		 * so the rows read like lines on paper.
		 */
		appearance?: 'card' | 'lines';
	} = $props();

	const sectionClass = $derived(['group', appearance, appearance === 'card' && 'card']);

	const active = $derived(items.filter((i) => i.active));
	const inactive = $derived(items.filter((i) => !i.active));
</script>

{#snippet row(item: T)}
	<li class="row">
		{#if readOnly}
			<span class="state" class:on={item.active}><Icon name={item.active ? 'check' : 'x'} size={16} /></span>
		{:else}
			<Checkbox
				checked={item.active}
				label={`${label(item)} active`}
				hideLabel
				onchange={(checked) => ontoggle(item, checked)}
			/>
		{/if}
		<span class="name">{label(item)}</span>
		<IconButton icon="pencil" label={`${readOnly ? 'View' : 'Edit'} ${label(item)}`} size={18} onclick={() => onopen(item)} />
	</li>
{/snippet}

<section class={sectionClass}>
	<h2>Active {noun.toLowerCase()} <span class="count">{active.length}</span></h2>
	<ul>
		{#each active as item (item.id)}
			{@render row(item)}
		{:else}
			<li class="muted empty-row">{emptyText}</li>
		{/each}
	</ul>
</section>

{#if inactive.length > 0}
	<section class={sectionClass}>
		<button type="button" class="toggle" aria-expanded={inactiveOpen} onclick={() => (inactiveOpen = !inactiveOpen)}>
			<span class="chev" class:collapsed={!inactiveOpen}><Icon name="chevron" size={20} /></span>
			Inactive {noun.toLowerCase()} <span class="count">{inactive.length}</span>
		</button>
		{#if inactiveOpen}
			<ul>
				{#each inactive as item (item.id)}
					{@render row(item)}
				{/each}
			</ul>
		{/if}
	</section>
{/if}

<style>
	.card {
		margin-bottom: 0.75rem;
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
		gap: 0.5rem;
		margin: 0;
		padding: 0.75rem 1rem;
		font-size: 1rem;
		font-weight: 700;
	}
	.toggle {
		width: 100%;
		border: none;
		background: none;
		cursor: pointer;
		padding-left: 0.5rem;
		color: var(--muted);
	}
	.chev {
		display: grid;
		transition: transform 0.15s;
	}
	.chev.collapsed {
		transform: rotate(-90deg);
	}
	.count {
		min-width: 1.6rem;
		padding: 0 0.45rem;
		border-radius: 1rem;
		background: var(--surface-2);
		color: var(--muted);
		font-size: 0.8rem;
		text-align: center;
		line-height: 1.5rem;
		font-weight: 600;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		min-height: 3rem;
		padding: 0 0.5rem 0 0.25rem;
		border-top: 1px solid var(--border);
	}
	.state {
		display: grid;
		place-items: center;
		width: 2.5rem;
		color: var(--muted);
	}
	.state.on {
		color: var(--accent-text);
	}
	.name {
		flex: 1;
		min-width: 0;
		padding: 0.7rem 0.25rem;
		font-weight: 500;
		overflow-wrap: anywhere;
	}
	.row :global(.icon-btn) {
		color: var(--muted);
	}
	.empty-row {
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--border);
	}
</style>
