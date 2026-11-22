<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import Icon from './Icon.svelte';
	import type { IconName } from './icons.js';

	let {
		variant = 'secondary',
		size = 'md',
		icon,
		block = false,
		href,
		rel,
		target,
		busy = false,
		disabled = false,
		children,
		type = 'button',
		...rest
	}: HTMLButtonAttributes & {
		/** `danger-ghost`: a quiet destructive action, e.g. "Delete game" under a form's fields. */
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'danger-ghost';
		/** `lg`: taller with larger text, for the main actions of a busy screen: `--control-h` tall when set, else 3rem. */
		size?: 'md' | 'lg';
		icon?: IconName;
		block?: boolean;
		/** Renders a link that looks like the button. */
		href?: string;
		/** With `href`: the link's `rel` and `target`. */
		rel?: string;
		target?: string;
		/** Working on it: disabled and marked busy for assistive tech. Change the label too if it helps ("Saving…"). */
		busy?: boolean;
		children?: Snippet;
	} = $props();
</script>

{#snippet content()}
	{#if icon}<Icon name={icon} size={size === 'lg' ? 20 : 18} />{/if}
	{@render children?.()}
{/snippet}

{#if href}
	<a {href} {rel} {target} class="btn {variant} {size}" class:block>
		{@render content()}
	</a>
{:else}
	<button
		{type}
		class="btn {variant} {size}"
		class:block
		class:busy
		disabled={disabled || busy}
		aria-busy={busy || undefined}
		{...rest}
	>
		{@render content()}
	</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		min-height: var(--tap, 2.75rem);
		padding: 0 1rem;
		border-radius: var(--radius);
		border: 1px solid transparent;
		font: inherit;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		transition:
			background-color 0.15s,
			border-color 0.15s,
			opacity 0.15s;
	}
	.lg {
		min-height: var(--control-h, 3rem);
		padding: 0.25rem 0.6rem;
		font-size: clamp(1rem, 1.9vh, 1.1rem);
		line-height: 1.2;
		text-align: center;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn.busy {
		cursor: progress;
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
		color: var(--on-danger, #fff);
	}
	.danger:not(:disabled):hover {
		filter: brightness(0.92);
	}
	.ghost {
		background: transparent;
		color: var(--accent-text);
	}
	.danger-ghost {
		background: transparent;
		color: var(--danger);
	}
	.ghost:not(:disabled):hover,
	.danger-ghost:not(:disabled):hover {
		background: var(--surface-hover);
	}
</style>
