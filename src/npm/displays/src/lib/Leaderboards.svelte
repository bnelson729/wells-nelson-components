<script lang="ts" generics="T">
	import type { Leaderboard } from './types.js';

	/** A sideways-scrolling row of "top N" cards. Pass rows already sorted and trimmed. */
	let {
		boards,
		rowKey,
		rowLabel,
		label = 'Leaderboards'
	}: {
		boards: Leaderboard<T>[];
		rowKey: (row: T) => string;
		rowLabel: (row: T) => string;
		/** Accessible name of the region. */
		label?: string;
	} = $props();
</script>

<div class="boards" role="region" aria-label={label}>
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
		gap: 0.75rem;
		overflow-x: auto;
		padding-bottom: 0.5rem;
		margin-bottom: 0.75rem;
		scroll-snap-type: x proximity;
	}
	.board {
		flex: 0 0 min(15rem, 80%);
		padding: 0.75rem 1rem;
		scroll-snap-align: start;
	}
	h2 {
		margin: 0 0 0.5rem;
		font-size: 0.95rem;
	}
	ol {
		margin: 0;
		padding-left: 1.3rem;
		font-size: 0.9rem;
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
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
</style>
