<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	/**
	 * A labelled text input. `error` and `hint` are tied to the input (`aria-describedby`); an
	 * error is announced when it appears. `optional` adds "(optional)" (use both
	 * markers in a form that has both kinds of field). `required` adds "(required)" to the label and `aria-required` (not the native attribute, so the
	 * app's own messages show instead of the browser's).
	 */
	let {
		label,
		value = $bindable(''),
		error,
		hint,
		hideLabel = false,
		required = false,
		optional = false,
		...rest
	}: HTMLInputAttributes & {
		label: string;
		value?: string;
		error?: string | null;
		hint?: string;
		/** Keep the label for assistive tech only (when something else on screen says what it's for). */
		hideLabel?: boolean;
		/** Marks the label "(optional)", instead of a placeholder that disappears when typing. */
		optional?: boolean;
	} = $props();

	const id = $props.id();
	const messageId = `${id}-msg`;
</script>

<div class="field">
	<label for={id} class:visually-hidden={hideLabel}
		>{label}{#if required}<span class="marker">{' (required)'}</span>{:else if optional}<span class="marker"
				>{' (optional)'}</span
			>{/if}</label
	>
	<input
		{id}
		bind:value
		aria-required={required || undefined}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error || hint ? messageId : undefined}
		{...rest}
	/>
	{#if error}<p id={messageId} class="error" role="alert">{error}</p>
	{:else if hint}<p id={messageId} class="hint">{hint}</p>{/if}
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
	.marker {
		font-weight: 400;
		color: var(--muted);
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
