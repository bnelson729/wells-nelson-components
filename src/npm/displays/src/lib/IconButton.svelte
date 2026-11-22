<script lang="ts">
	import Icon from './Icon.svelte';
	import type { IconName } from './icons.js';

	let {
		icon,
		label,
		href,
		onclick,
		active = false,
		pressed,
		size = 22,
		disabled = false,
		showLabel = false
	}: {
		icon: IconName;
		label: string;
		href?: string;
		onclick?: (e: MouseEvent) => void;
		/** On a link: this is the current page (`aria-current`), drawn highlighted. */
		active?: boolean;
		/** On a button that switches something on and off: whether it's on (`aria-pressed`), drawn highlighted. */
		pressed?: boolean;
		/** Icon size in px. The button itself is always `--tap` (44px) square. */
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
		class:active={active || pressed}
		class:labeled={showLabel}
		aria-label={label}
		aria-pressed={pressed}
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
		width: var(--tap, 2.75rem);
		height: var(--tap, 2.75rem);
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
		border-radius: calc(var(--tap, 2.75rem) / 2);
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
