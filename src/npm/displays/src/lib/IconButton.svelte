<script lang="ts">
	import Icon from './Icon.svelte';
	import type { IconName } from './icons.js';

	let {
		icon,
		label,
		href,
		onclick,
		active = false,
		size = 22,
		disabled = false,
		showLabel = false
	}: {
		icon: IconName;
		label: string;
		href?: string;
		onclick?: (e: MouseEvent) => void;
		active?: boolean;
		size?: number;
		disabled?: boolean;
		/**
		 * Show the label to the right of the icon. In `AppHeader`'s nav, its `labels` option can
		 * limit this to the active button.
		 */
		showLabel?: boolean;
	} = $props();
</script>

{#snippet content()}
	<Icon name={icon} {size} />
	{#if showLabel}<span class="text" aria-hidden="true">{label}</span>{/if}
{/snippet}

{#if href}
	<a
		class="icon-btn"
		class:active
		class:labeled={showLabel}
		{href}
		aria-label={label}
		title={showLabel ? undefined : label}
		aria-current={active ? 'page' : undefined}
	>
		{@render content()}
	</a>
{:else}
	<button
		type="button"
		class="icon-btn"
		class:active
		class:labeled={showLabel}
		aria-label={label}
		title={showLabel ? undefined : label}
		{onclick}
		{disabled}
	>
		{@render content()}
	</button>
{/if}

<style>
	.icon-btn {
		display: inline-grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		flex: none;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: inherit;
		cursor: pointer;
		text-decoration: none;
	}
	.labeled {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		width: auto;
		padding: 0 0.85rem 0 0.6rem;
		border-radius: 1.25rem;
	}
	.text {
		font-size: 0.92rem;
		font-weight: 600;
		white-space: nowrap;
	}
	.icon-btn:hover:not(:disabled) {
		background: var(--surface-hover);
	}
	.icon-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.active {
		color: var(--accent-text);
		background: var(--accent-soft);
	}
</style>
