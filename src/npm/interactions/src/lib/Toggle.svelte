<script lang="ts">
	let {
		checked = $bindable(false),
		label,
		disabled = false,
		onchange
	}: { checked?: boolean; label: string; disabled?: boolean; onchange?: (checked: boolean) => void } = $props();
</script>

<label class="toggle" class:disabled>
	<span class="text">{label}</span>
	<input type="checkbox" role="switch" bind:checked {disabled} onchange={() => onchange?.(checked)} />
	<span class="track" aria-hidden="true"><span class="thumb"></span></span>
</label>

<style>
	.toggle {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		min-height: var(--tap, 2.75rem);
		cursor: pointer;
		user-select: none;
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
	.track {
		position: relative;
		flex: none;
		width: 2.6rem;
		height: 1.5rem;
		border-radius: 1rem;
		background: var(--control-border);
		transition: background-color 0.15s;
	}
	.thumb {
		position: absolute;
		top: 0.15rem;
		left: 0.15rem;
		width: 1.2rem;
		height: 1.2rem;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.3);
		transition: transform 0.15s;
	}
	input:checked + .track {
		background: var(--accent);
	}
	input:checked + .track .thumb {
		transform: translateX(1.1rem);
	}
	input:focus-visible + .track {
		outline: 2px solid var(--focus, var(--accent));
		outline-offset: 2px;
	}
	/* Forced colors drop backgrounds: draw the track's outline and fill the "on" state. */
	@media (forced-colors: active) {
		.track {
			border: 1px solid CanvasText;
		}
		.thumb {
			background: CanvasText;
			top: calc(0.15rem - 1px);
			left: calc(0.15rem - 1px);
		}
		input:checked + .track {
			background: Highlight;
			border-color: Highlight;
		}
		input:checked + .track .thumb {
			background: HighlightText;
		}
	}
</style>
