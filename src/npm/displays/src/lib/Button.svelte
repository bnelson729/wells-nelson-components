<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import Icon from './Icon.svelte';
	import type { IconName } from './icons.js';

	let {
		variant = 'secondary',
		icon,
		block = false,
		children,
		type = 'button',
		...rest
	}: HTMLButtonAttributes & {
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
		icon?: IconName;
		block?: boolean;
		children?: Snippet;
	} = $props();
</script>

<button {type} class="btn {variant}" class:block {...rest}>
	{#if icon}<Icon name={icon} size={18} />{/if}
	{@render children?.()}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		min-height: 2.5rem;
		padding: 0 1rem;
		border-radius: var(--radius);
		border: 1px solid transparent;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 0.15s,
			border-color 0.15s,
			opacity 0.15s;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.block {
		width: 100%;
	}
	.primary {
		background: var(--accent);
		color: var(--on-accent);
	}
	.primary:not(:disabled):hover {
		background: var(--accent-strong);
	}
	.secondary {
		background: var(--surface);
		border-color: var(--border-strong);
		color: var(--text);
	}
	.secondary:not(:disabled):hover {
		background: var(--surface-hover);
	}
	.danger {
		background: var(--danger);
		color: #fff;
	}
	.danger:not(:disabled):hover {
		filter: brightness(0.92);
	}
	.ghost {
		background: transparent;
		color: var(--accent-text);
	}
	.ghost:not(:disabled):hover {
		background: var(--surface-hover);
	}
</style>
