<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import FieldLabel from './FieldLabel.svelte';
	import FieldMessage from './FieldMessage.svelte';
	import type { FieldProps } from './forms.js';

	/**
	 * A labelled text input. `error` and `hint` are tied to the input (`aria-describedby`); an
	 * error is announced when it appears. `optional` adds "(optional)" (use both markers in a form that
	 * has both kinds of field). `required` adds "(required)" to the label and `aria-required` (not the
	 * native attribute, so the app's own messages show instead of the browser's). `readonly` shows the
	 * value as plain text, for people who can look but not change it. Other attributes go to the <input>.
	 */
	let {
		label,
		value = $bindable(''),
		error,
		hint,
		hideLabel = false,
		required = false,
		optional = false,
		class: className,
		...rest
	}: Omit<HTMLInputAttributes, 'class'> &
		FieldProps & {
			value?: string;
			/** Last resort: a class on the root element. */
			class?: string;
		} = $props();

	const id = $props.id();
	const messageId = `${id}-msg`;
</script>

<div class={['field', className]}>
	<FieldLabel {label} for={id} {hideLabel} {required} {optional} />
	<input
		{id}
		bind:value
		aria-required={required || undefined}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error || hint ? messageId : undefined}
		{...rest}
	/>
	<FieldMessage id={messageId} {error} {hint} />
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
</style>
