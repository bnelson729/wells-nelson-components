<script lang="ts">
	import { Icon } from '@wells-nelson/displays';

	let {
		checked = $bindable(false),
		label,
		hideLabel = false,
		disabled = false,
		tone = 'accent',
		onchange
	}: {
		checked?: boolean;
		label: string;
		hideLabel?: boolean;
		disabled?: boolean;
		/** `muted`: a gray tick, for rows that are done and should step back (e.g. items already got). */
		tone?: 'accent' | 'muted';
		onchange?: (checked: boolean) => void;
	} = $props();
</script>

<label class="checkbox {tone}" class:bare={hideLabel} class:disabled>
	<input
		type="checkbox"
		bind:checked
		{disabled}
		onchange={() => onchange?.(checked)}
		aria-label={hideLabel ? label : undefined}
	/>
	<span class="box" aria-hidden="true"><Icon name="check" size={16} /></span>
	{#if !hideLabel}<span class="text">{label}</span>{/if}
</label>

<style>
	.checkbox {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		cursor: pointer;
		min-height: var(--tap, 2.75rem);
		--tick: var(--accent);
	}
	.muted {
		--tick: var(--muted);
	}
	.bare {
		min-width: var(--tap, 2.75rem);
		justify-content: center;
	}
	.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	/* The real input covers the whole control (invisible), so every tap lands on it. */
	input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		margin: 0;
		opacity: 0;
		cursor: pointer;
		z-index: 1;
	}
	input:disabled {
		cursor: not-allowed;
	}
	.box {
		display: grid;
		place-items: center;
		width: 1.4rem;
		height: 1.4rem;
		border: 2px solid var(--control-border);
		border-radius: 0.4rem;
		color: var(--on-accent);
		background: var(--surface);
		transition:
			background-color 0.15s,
			border-color 0.15s;
	}
	/* Hidden rather than transparent, so forced-colors mode can't paint the tick back in. */
	.box :global(svg) {
		visibility: hidden;
	}
	input:checked + .box {
		background: var(--tick);
		border-color: var(--tick);
	}
	input:checked + .box :global(svg) {
		visibility: visible;
	}
	input:focus-visible + .box {
		outline: 2px solid var(--focus, var(--accent));
		outline-offset: 2px;
	}
	@media (forced-colors: active) {
		.box {
			border-color: CanvasText;
		}
		input:checked + .box {
			background: Highlight;
			border-color: Highlight;
			color: HighlightText;
		}
	}
</style>
