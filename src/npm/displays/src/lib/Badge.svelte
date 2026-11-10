<script lang="ts">
	import type { Snippet } from 'svelte';

	/** Small status pill, e.g. "Default", "Pending", "Editor". */
	let {
		tone = 'neutral',
		children
	}: {
		tone?: 'neutral' | 'accent' | 'warning' | 'danger';
		children: Snippet;
	} = $props();
</script>

<span class="badge {tone}">{@render children()}</span>

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
</style>
