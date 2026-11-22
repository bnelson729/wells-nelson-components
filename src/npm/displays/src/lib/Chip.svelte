<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	/**
	 * A pill-shaped button. With `pressed` it switches on and off (a filter, one of several
	 * choices); without, it's an action, e.g. applying a saved preset. Other attributes, and
	 * attachments (`{@attach fromAction(longpress, …)}`), go to the <button>. Set `--chip-h` to change
	 * its height (default `--tap`).
	 */
	let {
		pressed,
		tone = 'neutral',
		dashed = false,
		children,
		type = 'button',
		...rest
	}: HTMLButtonAttributes & {
		/** On or off (`aria-pressed`); on is drawn filled with the accent. Leave out for an action. */
		pressed?: boolean;
		/** `accent`: tinted, for actions that stand out (saved presets). */
		tone?: 'neutral' | 'accent';
		/** A dashed outline, for "add another" chips. */
		dashed?: boolean;
		children: Snippet;
	} = $props();
</script>

<button {type} class="chip {tone}" class:dashed aria-pressed={pressed} {...rest}>{@render children()}</button>

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		min-height: var(--chip-h, var(--tap, 2.75rem));
		min-width: var(--chip-h, var(--tap, 2.75rem));
		padding: 0 1rem;
		border: 1px solid var(--control-border);
		border-radius: 999px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		-webkit-touch-callout: none;
		user-select: none;
	}
	.chip:not(:disabled):hover {
		background: var(--surface-hover);
	}
	.accent {
		border-color: var(--accent);
		background: var(--accent-soft);
		color: var(--accent-text);
	}
	.accent:not(:disabled):hover {
		background: var(--accent-soft);
		border-color: var(--accent-strong);
	}
	.dashed {
		border-style: dashed;
		background: transparent;
		padding: 0 0.6rem;
	}
	.chip[aria-pressed='true'] {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
	}
	.chip:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	@media (forced-colors: active) {
		.chip[aria-pressed='true'] {
			background: Highlight;
			color: HighlightText;
		}
	}
</style>
