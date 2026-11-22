<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Small status pill, e.g. "Default", "Pending", "Editor". `tone="count"` is the number beside a
	 * heading; give it `label` ("3 items") so assistive tech hears more than the bare number.
	 */
	let {
		tone = 'neutral',
		label,
		children
	}: {
		tone?: 'neutral' | 'accent' | 'warning' | 'danger' | 'count';
		/** What assistive tech reads instead of the visible text. */
		label?: string;
		children: Snippet;
	} = $props();
</script>

{#if label}
	<span class="badge {tone}"
		><span aria-hidden="true">{@render children()}</span><span class="visually-hidden">{label}</span></span
	>
{:else}
	<span class="badge {tone}">{@render children()}</span>
{/if}

<style>
	.badge {
		display: inline-block;
		flex: none;
		font-size: 0.75rem;
		font-weight: 700;
		line-height: 1.4;
		padding: 0.1rem 0.5rem;
		border-radius: 1rem;
		white-space: nowrap;
	}
	.neutral {
		background: var(--surface-2);
		color: var(--muted);
	}
	.accent {
		background: var(--accent-soft);
		color: var(--accent-text);
	}
	.warning {
		background: var(--warning-soft);
		color: var(--warning);
	}
	.danger {
		background: var(--danger-soft);
		color: var(--danger);
	}
	.count {
		min-width: 1.6rem;
		padding: 0 0.45rem;
		background: var(--surface-2);
		color: var(--muted);
		font-size: 0.8rem;
		font-weight: 600;
		line-height: 1.5rem;
		text-align: center;
	}
</style>
