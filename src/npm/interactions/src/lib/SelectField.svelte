<script lang="ts" generics="T extends string | number">
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import FieldLabel from './FieldLabel.svelte';
	import FieldMessage from './FieldMessage.svelte';
	import type { FieldProps } from './forms.js';

	/**
	 * A labelled dropdown: one choice from a short, fixed list (a sort order, where something goes).
	 * For a few options always on screen use `Segmented`; for a long list or one you can add to, use
	 * `Combobox`. Other attributes go to the <select>.
	 */
	let {
		label,
		options,
		value = $bindable(),
		hideLabel = false,
		hint,
		error,
		required = false,
		optional = false,
		disabled = false,
		onchange,
		class: className,
		...rest
	}: Omit<HTMLSelectAttributes, 'value' | 'onchange' | 'class'> &
		FieldProps & {
			options: readonly { value: T; label: string; disabled?: boolean }[];
			value: T;
			/** After the person picks an option. */
			onchange?: (value: T) => void;
			/** Last resort: a class on the root element. */
			class?: string;
		} = $props();

	const id = $props.id();
	const messageId = `${id}-msg`;
</script>

<div class={['field', className]}>
	<FieldLabel {label} for={id} {hideLabel} {required} {optional} />
	<!-- Option values are strings in the DOM; the picked one maps back to its typed value. -->
	<select
		{id}
		{disabled}
		value={String(value)}
		aria-required={required || undefined}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error || hint ? messageId : undefined}
		onchange={(e) => {
			const picked = e.currentTarget.value;
			const option = options.find((o) => String(o.value) === picked);
			if (!option) return;
			value = option.value;
			onchange?.(option.value);
		}}
		{...rest}
	>
		{#each options as option (option.value)}
			<option value={String(option.value)} disabled={option.disabled}>{option.label}</option>
		{/each}
	</select>
	<FieldMessage id={messageId} {error} {hint} />
</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	select {
		width: 100%;
	}
	select[aria-invalid='true'] {
		border-color: var(--danger);
	}
</style>
