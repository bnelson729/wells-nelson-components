<script lang="ts">
	/** A field's label with its "(required)" or "(optional)" marker. Renders a <legend> for a group. */
	let {
		label,
		id,
		for: htmlFor,
		hideLabel = false,
		required = false,
		optional = false,
		as = 'label'
	}: {
		label: string;
		id?: string;
		for?: string;
		hideLabel?: boolean;
		required?: boolean;
		optional?: boolean;
		as?: 'label' | 'legend';
	} = $props();
</script>

{#snippet text()}{label}{#if required}<span class="marker">{' (required)'}</span>{:else if optional}<span class="marker"
			>{' (optional)'}</span
		>{/if}{/snippet}

{#if as === 'legend'}
	<legend {id} class={['field-label', hideLabel && 'visually-hidden']}>{@render text()}</legend>
{:else}
	<label {id} for={htmlFor} class={['field-label', hideLabel && 'visually-hidden']}>{@render text()}</label>
{/if}

<style>
	.field-label {
		padding: 0;
		font-weight: var(--weight-semibold);
		font-size: var(--text-sm);
	}
	.marker {
		font-weight: var(--weight-regular);
		color: var(--muted);
	}
</style>
