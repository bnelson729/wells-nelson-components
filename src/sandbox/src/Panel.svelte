<script lang="ts">
	import type { Snippet } from 'svelte';

	/** A titled card on a sandbox page. */
	let { title, note, children }: { title: string; note?: string; children: Snippet } = $props();
</script>

<section class="card panel">
	<h2>{title}</h2>
	{#if note}<p class="muted note">{note}</p>{/if}
	<div class="body">{@render children()}</div>
</section>

<style>
	.panel {
		padding: 1rem;
		margin-bottom: 1rem;
	}
	h2 {
		margin: 0 0 0.25rem;
		font-size: 1.05rem;
	}
	.note {
		margin: 0 0 0.75rem;
		font-size: 0.9rem;
	}
	.body {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.body :global(.row) {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	.body :global(pre) {
		margin: 0;
		padding: 0.75rem;
		max-height: 22rem;
		overflow: auto;
		font-size: 0.8rem;
		background: var(--surface-2);
		border-radius: var(--radius);
	}
</style>
