<script lang="ts">
	import type { Snippet } from 'svelte';
	import FieldLabel from './FieldLabel.svelte';
	import FieldMessage from './FieldMessage.svelte';
	import type { FieldControl, FieldProps } from './forms.js';

	/**
	 * A label, hint and error around any control that has no field component of its own (a date and
	 * time input, a textarea, a native control). The control gets its id and ARIA attributes from
	 * the snippet's argument:
	 *
	 *   <Field label="Starts" hint="Local time." {error}>
	 *     {#snippet children(control)}<input type="datetime-local" {...control} bind:value={start} />{/snippet}
	 *   </Field>
	 */
	let {
		label,
		hideLabel = false,
		hint,
		error,
		required = false,
		optional = false,
		children,
		class: className
	}: Omit<FieldProps, 'disabled'> & {
		children: Snippet<[FieldControl]>;
		/** Last resort: a class on the root element. */
		class?: string;
	} = $props();

	const id = $props.id();
	const messageId = `${id}-msg`;
	const control = $derived<FieldControl>({
		id,
		'aria-describedby': error || hint ? messageId : undefined,
		'aria-invalid': error ? 'true' : undefined,
		'aria-required': required || undefined
	});
</script>

<div class={['field', className]}>
	<FieldLabel {label} for={id} {hideLabel} {required} {optional} />
	{@render children(control)}
	<FieldMessage id={messageId} {error} {hint} />
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
</style>
