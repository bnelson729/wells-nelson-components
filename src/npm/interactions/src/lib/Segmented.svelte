<script lang="ts" generics="T extends string | number | boolean">
	import FieldMessage from './FieldMessage.svelte';
	import FieldLabel from './FieldLabel.svelte';
	import type { FieldProps } from './forms.js';

	/**
	 * A row of mutually exclusive options (a radio group drawn as joined buttons), for two to five
	 * short choices that should all be visible. `size="sm"` is a compact pair for inside a row or a
	 * dense form (with `hideLabel` when the row already says what it's for).
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
		size = 'md',
		onchange,
		class: className
	}: FieldProps & {
		options: readonly { value: T; label: string }[];
		/** The chosen option; null while none is (no radio is checked). */
		value: T | null;
		/** `sm`: compact, as wide as its options, for a choice inside a row. */
		size?: 'sm' | 'md';
		onchange?: (value: T) => void;
		/** Last resort: a class on the root element. */
		class?: string;
	} = $props();

	const id = $props.id();
	const messageId = `${id}-msg`;
	const labelId = `${id}-label`;
</script>

<fieldset
	class={['segmented', size, className]}
	{disabled}
	role="radiogroup"
	aria-labelledby={labelId}
	aria-describedby={error || hint ? messageId : undefined}
	aria-invalid={error ? 'true' : undefined}
	aria-required={required || undefined}
>
	<FieldLabel as="legend" id={labelId} {label} {hideLabel} {required} {optional} />
	<div class="options">
		{#each options as option, i (i)}
			<label class:selected={option.value === value}>
				<input
					type="radio"
					name={id}
					checked={option.value === value}
					onchange={() => {
						value = option.value;
						onchange?.(option.value);
					}}
				/>
				{option.label}
			</label>
		{/each}
	</div>
	<FieldMessage id={messageId} {error} {hint} />
</fieldset>

<style>
	.segmented {
		border: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}
	.segmented > :global(legend) {
		margin-bottom: 0.35rem;
	}
	.options {
		display: flex;
		border: 1px solid var(--control-border);
		border-radius: var(--radius);
		overflow: hidden;
	}
	.segmented[aria-invalid='true'] .options {
		border-color: var(--danger);
	}
	label {
		position: relative;
		flex: 1;
		display: grid;
		place-items: center;
		min-height: var(--tap, 2.75rem);
		padding: 0 var(--space-2);
		text-align: center;
		cursor: pointer;
		background: var(--surface);
		font-weight: var(--weight-medium);
	}
	label + label {
		border-left: 1px solid var(--control-border);
	}
	label.selected {
		background: var(--accent);
		color: var(--on-accent);
		font-weight: var(--weight-bold);
	}
	/* sm: as wide as its options, shorter, for inside a row (the hit area stays 44px tall). */
	.sm {
		display: inline-flex;
		width: fit-content;
	}
	.sm .options {
		display: inline-flex;
	}
	.sm label {
		flex: none;
		min-width: 2.75rem;
		padding: 0 var(--space-3);
		font-size: var(--text-sm);
	}
	input {
		position: absolute;
		inset: 0;
		opacity: 0;
		margin: 0;
		cursor: pointer;
	}
	label:has(input:focus-visible) {
		outline: 2px solid var(--focus, var(--accent));
		outline-offset: -3px;
	}
	fieldset:disabled label {
		opacity: 0.55;
		cursor: not-allowed;
	}
	/* Forced colors drop the fill that marks the chosen option: fill it with the highlight instead. */
	@media (forced-colors: active) {
		label.selected {
			forced-color-adjust: none;
			background: Highlight;
			color: HighlightText;
		}
	}
</style>
