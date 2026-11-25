<script lang="ts" module>
	/** How loud a button is: `solid` (filled), `outline`, or `ghost` (text only). */
	export type ButtonVariant = 'solid' | 'outline' | 'ghost';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import Icon from './Icon.svelte';
	import type { IconName } from './icons.js';
	import type { Tone } from './types.js';

	/**
	 * A button, or a link drawn as one (`href`). `variant` says how loud it is and `tone` what it means:
	 * the main action of a form is `variant="solid" tone="accent"`, a quiet destructive one ("Delete
	 * task" under the fields) `variant="ghost" tone="danger"`. Default: outline, neutral.
	 *
	 * `busy` keeps the button focusable (focus doesn't jump to the page while it works) but ignores
	 * clicks and submits; `disabled` turns it off. A disabled or busy link isn't followed.
	 */
	let {
		variant = 'outline',
		tone = 'neutral',
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
		onclick,
		class: className,
		...rest
	}: HTMLButtonAttributes & {
		variant?: ButtonVariant;
		tone?: Tone;
		/** `lg`: taller with larger text, for the main actions of a busy screen: `--control-h` tall when set, else 3rem. */
		size?: 'md' | 'lg';
		icon?: IconName;
		block?: boolean;
		/** Renders a link that looks like the button. */
		href?: string;
		/** With `href`: the link's `rel` and `target`. */
		rel?: string;
		target?: string;
		/** Working on it: marked busy and unavailable for assistive tech, clicks ignored. Change the label too if it helps ("Saving…"). */
		busy?: boolean;
		children?: Snippet;
		/** Last resort: a class on the root element. Ask for an option before styling it from outside. */
		class?: string;
	} = $props();

	const classes = $derived(['btn', variant, `tone-${tone}`, size, block && 'block', busy && 'busy', className]);

	function click(e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		if (busy) {
			// Also stops a submit button from submitting its form again.
			e.preventDefault();
			return;
		}
		onclick?.(e);
	}
</script>

{#snippet content()}
	{#if icon}<Icon name={icon} size={size === 'lg' ? 20 : 18} />{/if}
	{@render children?.()}
{/snippet}

{#if href && !disabled && !busy}
	<a {href} {rel} {target} class={classes}>
		{@render content()}
	</a>
{:else if href}
	<!-- A link that can't be followed now: no href, so it can't be opened or focused. -->
	<a class={classes} role="link" aria-disabled="true" aria-busy={busy || undefined}>
		{@render content()}
	</a>
{:else}
	<button
		{type}
		class={classes}
		{disabled}
		aria-disabled={busy || undefined}
		aria-busy={busy || undefined}
		onclick={click}
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
		padding: 0 var(--space-4);
		border-radius: var(--radius);
		border: 1px solid transparent;
		font: inherit;
		font-weight: var(--weight-semibold);
		text-align: center;
		text-decoration: none;
		overflow-wrap: anywhere;
		cursor: pointer;
		transition:
			background-color var(--duration-fast),
			border-color var(--duration-fast),
			opacity var(--duration-fast);
	}
	.lg {
		min-height: var(--control-h, 3rem);
		padding: var(--space-1) 0.6rem;
		font-size: clamp(1rem, 1.9vh, 1.1rem);
		line-height: var(--leading-tight);
	}
	.btn:disabled,
	.btn[aria-disabled='true'] {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn.busy {
		cursor: progress;
	}
	.block {
		width: 100%;
	}

	/* Tone: the colors each variant draws with. */
	.tone-neutral {
		--fill: var(--surface-2);
		--fill-hover: var(--surface-hover);
		--on-fill: var(--text);
		--tone-text: var(--text);
		--tone-line: var(--border-strong);
	}
	.tone-accent {
		--fill: var(--accent);
		--fill-hover: var(--accent-strong);
		--on-fill: var(--on-accent);
		--tone-text: var(--accent-text);
		--tone-line: var(--accent);
	}
	.tone-danger {
		--fill: var(--danger);
		--on-fill: var(--on-danger);
		--tone-text: var(--danger);
		--tone-line: var(--danger);
	}
	.tone-warning {
		--fill: var(--warning);
		--on-fill: var(--on-warning);
		--tone-text: var(--warning);
		--tone-line: var(--warning);
	}
	.tone-success {
		--fill: var(--success);
		--on-fill: var(--on-success);
		--tone-text: var(--success);
		--tone-line: var(--success);
	}

	/* Variant: how loud. */
	.solid {
		background: var(--fill);
		color: var(--on-fill);
	}
	.solid:not(:disabled, [aria-disabled='true']):hover {
		background: var(--fill-hover, var(--fill));
	}
	.solid:is(.tone-danger, .tone-warning, .tone-success):not(:disabled, [aria-disabled='true']):hover {
		filter: brightness(0.92);
	}
	.outline {
		background: var(--surface);
		border-color: var(--tone-line);
		color: var(--tone-text);
	}
	.ghost {
		background: transparent;
		color: var(--tone-text);
	}
	.outline:not(:disabled, [aria-disabled='true']):hover,
	.ghost:not(:disabled, [aria-disabled='true']):hover {
		background: var(--surface-hover);
	}
</style>
