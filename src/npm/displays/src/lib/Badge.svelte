<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Small status pill, e.g. "Default", "Pending", "Editor". `tone="count"` is the number beside a
	 * heading; give it `label` ("3 items") so assistive tech hears more than the bare number.
	 */
	let {
		tone = 'neutral',
		label,
		children,
		class: className
	}: {
		tone?: 'neutral' | 'accent' | 'warning' | 'danger' | 'success' | 'count';
		/** What assistive tech reads instead of the visible text. */
		label?: string;
		children: Snippet;
		/** Last resort: a class on the root element. */
		class?: string;
	} = $props();
</script>

{#if label}
	<span class={['badge', tone, className]}
		><span aria-hidden="true">{@render children()}</span><span class="visually-hidden">{label}</span></span
	>
{:else}
	<span class={['badge', tone, className]}>{@render children()}</span>
{/if}

<style>
	.badge {
		display: inline-block;
		flex: none;
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		line-height: 1.4;
		padding: 0.1rem var(--space-2);
		border-radius: 1rem;
		white-space: nowrap;
		/* A long status is cut short rather than pushing its row wider. */
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		vertical-align: middle;
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
	.success {
		background: var(--success-soft);
		color: var(--success);
	}
	.count {
		min-width: 1.6rem;
		padding: 0 0.45rem;
		background: var(--surface-2);
		color: var(--muted);
		font-size: var(--text-xs);
		font-weight: var(--weight-semibold);
		line-height: 1.5rem;
		text-align: center;
	}
</style>
