<script lang="ts" generics="T">
	import type { Leaderboard } from './types.js';

	/** A sideways-scrolling row of "top N" cards. Pass rows already sorted and trimmed. */
	let {
		boards,
		rowKey,
		rowLabel,
		label = 'Leaderboards',
		class: className
	}: {
		boards: Leaderboard<T>[];
		rowKey: (row: T) => string;
		rowLabel: (row: T) => string;
		/** Accessible name of the region. */
		label?: string;
		/** Last resort: a class on the root element. */
		class?: string;
	} = $props();
</script>

<!-- Focusable so the keyboard can scroll it sideways. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class={['boards', 'selectable', className]} role="region" aria-label={label} tabindex="0">
	{#each boards as board (board.title)}
		<section class="board card">
			<h2>{board.title}</h2>
			<ol>
				{#each board.rows as row (rowKey(row))}
					<li><span class="who">{rowLabel(row)}</span><span class="val">{board.value(row)}</span></li>
				{/each}
			</ol>
		</section>
	{/each}
</div>

<style>
	.boards {
		display: flex;
		gap: var(--space-3);
		overflow-x: auto;
		padding-bottom: var(--space-2);
		margin-bottom: var(--space-3);
		scroll-snap-type: x proximity;
	}
	.board {
		flex: 0 0 min(15rem, 80%);
		padding: var(--space-3) var(--space-4);
		scroll-snap-align: start;
	}
	h2 {
		margin: 0 0 var(--space-2);
		font-size: var(--text-sm);
	}
	ol {
		margin: 0;
		padding-left: 1.3rem;
		font-size: var(--text-sm);
	}
	li {
		position: relative;
		padding: 0.15rem 0;
	}
	li > span {
		display: inline-flex;
	}
	.who {
		max-width: calc(100% - 3.5rem);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.val {
		position: absolute;
		right: 0;
		font-weight: var(--weight-bold);
		font-variant-numeric: tabular-nums;
	}
</style>
