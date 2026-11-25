<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import { sortRows, type SortableColumn } from './types.js';

	/**
	 * Table with a pinned first column that scrolls sideways on small screens. Tap a header to
	 * sort by it, tap again to flip. Rows without a value sort last.
	 */
	let {
		title,
		rows,
		columns,
		rowKey,
		rowLabel,
		labelHeader = 'Name',
		sortKey = $bindable(),
		descending = $bindable(true),
		emptyText = 'Nothing to show yet.',
		empty,
		class: className
	}: {
		title?: string;
		rows: T[];
		columns: SortableColumn<T>[];
		rowKey: (row: T) => string;
		/** The pinned first column. */
		rowLabel: (row: T) => string;
		labelHeader?: string;
		/** Column currently sorted by; defaults to the first column. */
		sortKey?: string;
		descending?: boolean;
		emptyText?: string;
		/** Shown instead of `emptyText` when there are no rows, for more than a sentence. */
		empty?: Snippet;
		/** Last resort: a class on the root element. */
		class?: string;
	} = $props();

	const headingId = $props.id();

	const activeKey = $derived(sortKey ?? columns[0]?.key);
	const activeColumn = $derived(columns.find((c) => c.key === activeKey));
	const sorted = $derived(activeColumn ? sortRows(rows, activeColumn.value, rowLabel, descending) : rows);

	function sortBy(key: string) {
		if (key === activeKey) descending = !descending;
		else {
			sortKey = key;
			descending = true;
		}
	}

	function cell(col: SortableColumn<T>, row: T) {
		if (col.display) return col.display(row);
		return col.value(row) ?? '';
	}
</script>

<section class={['table-card', 'card', 'selectable', className]}>
	{#if title}<h2 id={headingId}>{title}</h2>{/if}
	{#if rows.length === 0}
		{#if empty}{@render empty()}{:else}<p class="muted empty-row">{emptyText}</p>{/if}
	{:else}
		<!-- Focusable so the keyboard can scroll it sideways on a small screen. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="scroll" tabindex="0" role="region" aria-label={title ?? 'Table'}>
			<!-- Named after the heading, so table navigation says which table it's in. -->
			<table aria-labelledby={title ? headingId : undefined}>
				<thead>
					<tr>
						<th scope="col" class="name">{labelHeader}</th>
						{#each columns as col (col.key)}
							<th scope="col" aria-sort={col.key === activeKey ? (descending ? 'descending' : 'ascending') : undefined}>
								<!-- Named in full ("Points played", not "PP"); the sort order is on the header (aria-sort). -->
								<button
									type="button"
									onclick={() => sortBy(col.key)}
									aria-label={col.full ?? col.title}
									title={`Sort by ${col.full ?? col.title}`}
								>
									{col.title}
									{#if col.key === activeKey}<span aria-hidden="true">{descending ? '▼' : '▲'}</span>{/if}
								</button>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each sorted as row (rowKey(row))}
						<tr>
							<th scope="row" class="name">{rowLabel(row)}</th>
							{#each columns as col (col.key)}
								<td>{cell(col, row)}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.table-card {
		margin-bottom: var(--space-4);
		overflow: hidden;
	}
	h2 {
		margin: 0;
		padding: var(--space-3) var(--space-4);
		font-size: var(--text-md);
	}
	.scroll {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}
	table {
		border-collapse: separate;
		border-spacing: 0;
		width: 100%;
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}
	th,
	td {
		padding: 0.45rem 0.6rem;
		border-top: 1px solid var(--border);
		text-align: right;
		white-space: nowrap;
	}
	thead th {
		background: var(--surface-2);
		font-size: var(--text-xs);
		padding: 0;
	}
	thead th.name {
		padding: 0.45rem var(--space-3);
	}
	thead button {
		width: 100%;
		min-height: var(--tap, 2.75rem);
		padding: var(--space-2) 0.6rem;
		border: none;
		background: none;
		font-weight: var(--weight-bold);
		text-align: right;
		cursor: pointer;
		white-space: nowrap;
	}
	thead button span {
		font-size: var(--text-xs);
		color: var(--accent-text);
	}
	.name {
		position: sticky;
		left: 0;
		z-index: var(--z-raised);
		text-align: left;
		background: var(--surface);
		font-weight: var(--weight-semibold);
		max-width: 11rem;
		overflow: hidden;
		text-overflow: ellipsis;
		box-shadow: 1px 0 0 var(--border);
	}
	thead .name {
		background: var(--surface-2);
	}
	tbody tr:hover td,
	tbody tr:hover .name {
		background: var(--surface-hover);
	}
	.empty-row {
		padding: 0 var(--space-4) var(--space-4);
		margin: 0;
	}
</style>
