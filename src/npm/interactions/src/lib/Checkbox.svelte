<script lang="ts">
	import { Icon } from '@wells-nelson/displays';

	let {
		checked = $bindable(false),
		label,
		hideLabel = false,
		onchange
	}: { checked?: boolean; label: string; hideLabel?: boolean; onchange?: (checked: boolean) => void } = $props();
</script>

<label class="checkbox" class:bare={hideLabel}>
	<input type="checkbox" bind:checked onchange={() => onchange?.(checked)} aria-label={hideLabel ? label : undefined} />
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
		min-height: 2.25rem;
	}
	.bare {
		min-width: 2.5rem;
		justify-content: center;
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
	.box {
		display: grid;
		place-items: center;
		width: 1.4rem;
		height: 1.4rem;
		border: 2px solid var(--border-strong);
		border-radius: 0.4rem;
		color: transparent;
		background: var(--surface);
		transition:
			background-color 0.15s,
			border-color 0.15s;
	}
	input:checked + .box {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
	}
	input:focus-visible + .box {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
</style>
