<script lang="ts" generics="T extends string | number | boolean">
	/** A row of mutually exclusive options (radio group styled as joined buttons). */
	let {
		label,
		options,
		value = $bindable(),
		disabled = false,
		onchange
	}: {
		label: string;
		options: { value: T; label: string }[];
		value: T;
		disabled?: boolean;
		onchange?: (value: T) => void;
	} = $props();

	const id = $props.id();
</script>

<fieldset class="segmented" {disabled}>
	<legend>{label}</legend>
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
</fieldset>

<style>
	.segmented {
		border: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	legend {
		font-weight: 600;
		font-size: 0.9rem;
		padding: 0;
		margin-bottom: 0.35rem;
	}
	.options {
		display: flex;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		overflow: hidden;
	}
	label {
		position: relative;
		flex: 1;
		display: grid;
		place-items: center;
		min-height: 2.5rem;
		padding: 0 0.5rem;
		text-align: center;
		cursor: pointer;
		background: var(--surface);
		font-weight: 500;
	}
	label + label {
		border-left: 1px solid var(--border-strong);
	}
	label.selected {
		background: var(--accent);
		color: var(--on-accent);
		font-weight: 700;
	}
	input {
		position: absolute;
		inset: 0;
		opacity: 0;
		margin: 0;
		cursor: pointer;
	}
	label:has(input:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: -3px;
	}
	fieldset:disabled label {
		opacity: 0.55;
		cursor: not-allowed;
	}
</style>
