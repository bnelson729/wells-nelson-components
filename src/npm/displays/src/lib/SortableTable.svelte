<script lang="ts" generics="T">
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
		emptyText = 'Nothing recorded yet.'
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
	} = $props();

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

<section class="table-card card selectable">
	{#if title}<h2>{title}</h2>{/if}
	{#if rows.length === 0}
		<p class="muted empty-row">{emptyText}</p>
	{:else}
		<div class="scroll">
			<table>
				<thead>
					<tr>
						<th scope="col" class="name">{labelHeader}</th>
						{#each columns as col (col.key)}
							<th scope="col" aria-sort={col.key === activeKey ? (descending ? 'descending' : 'ascending') : undefined}>
								<button type="button" onclick={() => sortBy(col.key)} title={`Sort by ${col.full ?? col.title}`}>
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
		margin-bottom: 1rem;
		overflow: hidden;
	}
	h2 {
		margin: 0;
		padding: 0.75rem 1rem;
		font-size: 1rem;
	}
	.scroll {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}
	table {
		border-collapse: separate;
		border-spacing: 0;
		width: 100%;
		font-size: 0.9rem;
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
		font-size: 0.8rem;
		padding: 0;
	}
	thead th.name {
		padding: 0.45rem 0.75rem;
	}
	thead button {
		width: 100%;
		padding: 0.5rem 0.6rem;
		border: none;
		background: none;
		font-weight: 700;
		text-align: right;
		cursor: pointer;
		white-space: nowrap;
	}
	thead button span {
		font-size: 0.65rem;
		color: var(--accent-text);
	}
	.name {
		position: sticky;
		left: 0;
		z-index: 1;
		text-align: left;
		background: var(--surface);
		font-weight: 600;
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
		padding: 0 1rem 1rem;
		margin: 0;
	}
</style>
