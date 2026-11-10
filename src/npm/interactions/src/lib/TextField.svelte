<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		label,
		value = $bindable(''),
		error,
		hint,
		...rest
	}: HTMLInputAttributes & { label: string; value?: string; error?: string | null; hint?: string } = $props();

	const id = $props.id();
</script>

<div class="field">
	<label for={id}>{label}</label>
	<input {id} bind:value aria-invalid={error ? 'true' : undefined} {...rest} />
	{#if error}<p class="error">{error}</p>{:else if hint}<p class="hint">{hint}</p>{/if}
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	label {
		font-weight: 600;
		font-size: 0.9rem;
	}
	.error,
	.hint {
		margin: 0;
		font-size: 0.85rem;
	}
	.error {
		color: var(--danger);
	}
	.hint {
		color: var(--muted);
	}
</style>
