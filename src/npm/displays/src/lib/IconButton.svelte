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
		disabled = false
	}: {
		icon: IconName;
		label: string;
		href?: string;
		onclick?: (e: MouseEvent) => void;
		active?: boolean;
		size?: number;
		disabled?: boolean;
	} = $props();
</script>

{#if href}
	<a class="icon-btn" class:active {href} aria-label={label} title={label} aria-current={active ? 'page' : undefined}>
		<Icon name={icon} {size} />
	</a>
{:else}
	<button type="button" class="icon-btn" class:active aria-label={label} title={label} {onclick} {disabled}>
		<Icon name={icon} {size} />
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
