<script lang="ts">
	import { Icon } from '@wells-nelson/displays';
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import FieldMessage from './FieldMessage.svelte';
	import type { FieldProps } from './forms.js';

	/**
	 * A tick box with its label; the whole control is one target. `description` adds a second, muted
	 * line; `children` replaces the label's text with richer content (keep `label` the same words, in
	 * plain text). `block` stretches it across its row, box in the row's first column, so a whole
	 * line of a list ticks it (pick lists). Other attributes go to the <input>.
	 */
	let {
		checked = $bindable(false),
		label,
		hideLabel = false,
		description,
		hint,
		error,
		required = false,
		disabled = false,
		tone = 'accent',
		block = false,
		onchange,
		children,
		class: className,
		...rest
	}: Omit<HTMLInputAttributes, 'type' | 'checked' | 'onchange' | 'class'> &
		Omit<FieldProps, 'optional'> & {
			checked?: boolean;
			/** A second line under the label, e.g. a thing's details. */
			description?: string;
			/** `muted`: a gray tick, for rows that are done and should step back (e.g. tasks already done). */
			tone?: 'accent' | 'muted';
			/** Fill the row: the box in a `--tap` wide first column, the text after it, hover on the whole row. */
			block?: boolean;
			onchange?: (checked: boolean) => void;
			/** Rich content in place of the label's text (the label stays its plain-text version). */
			children?: Snippet;
			/** Last resort: a class on the root element. */
			class?: string;
		} = $props();

	const id = $props.id();
	const messageId = `${id}-msg`;
	const descriptionId = `${id}-desc`;
	const describedBy = $derived(
		[description && !hideLabel ? descriptionId : null, error || hint ? messageId : null].filter(Boolean).join(' ') ||
			undefined
	);
</script>

<div class={['checkbox-field', block && 'block', className]}>
	<label class={['checkbox', tone, hideLabel && 'bare', disabled && 'disabled']}>
		<input
			type="checkbox"
			bind:checked
			{disabled}
			onchange={() => onchange?.(checked)}
			aria-label={hideLabel ? label : undefined}
			aria-describedby={describedBy}
			aria-invalid={error ? 'true' : undefined}
			aria-required={required || undefined}
			{...rest}
		/>
		<span class="box-cell" aria-hidden="true"><span class="box"><Icon name="check" size={16} /></span></span>
		{#if !hideLabel}
			<span class="text">
				<span class="name"
					>{#if children}{@render children()}{:else}{label}{/if}</span
				>
				<!-- Described (aria-describedby), not part of the name. -->
				{#if description}<span id={descriptionId} class="description" aria-hidden="true">{description}</span>{/if}
			</span>
		{/if}
	</label>
	<FieldMessage id={messageId} {error} {hint} />
</div>

<style>
	.checkbox-field {
		display: inline-flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.checkbox {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		cursor: pointer;
		min-height: var(--tap, 2.75rem);
		--tick: var(--accent);
	}
	.muted {
		--tick: var(--muted);
	}
	.bare {
		min-width: var(--tap, 2.75rem);
		justify-content: center;
	}
	.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.box-cell {
		display: grid;
		place-items: center;
		flex: none;
	}
	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.description {
		font-size: var(--text-sm);
		color: var(--muted);
		overflow-wrap: anywhere;
	}

	/* block: a whole line of a list, the box where a row's checkbox sits. */
	.block {
		display: flex;
		flex: 1;
		min-width: 0;
	}
	.block .checkbox {
		display: flex;
		gap: var(--space-1);
		width: 100%;
		min-height: 3rem;
	}
	.block .box-cell {
		width: var(--tap, 2.75rem);
	}
	.block .text {
		flex: 1;
		padding: 0.4rem var(--space-1);
	}
	.block .name {
		overflow-wrap: anywhere;
	}
	.block .checkbox:hover:not(.disabled) {
		background: var(--surface-hover);
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
		z-index: var(--z-raised);
	}
	input:disabled {
		cursor: not-allowed;
	}
	.box {
		display: grid;
		place-items: center;
		width: 1.4rem;
		height: 1.4rem;
		border: 2px solid var(--control-border);
		border-radius: var(--radius-sm);
		color: var(--on-accent);
		background: var(--surface);
		transition:
			background-color var(--duration-fast),
			border-color var(--duration-fast);
	}
	/* Hidden rather than transparent, so forced-colors mode can't paint the tick back in. */
	.box :global(svg) {
		visibility: hidden;
	}
	input:checked + .box-cell .box {
		background: var(--tick);
		border-color: var(--tick);
	}
	input:checked + .box-cell :global(svg) {
		visibility: visible;
	}
	input:focus-visible + .box-cell .box {
		outline: 2px solid var(--focus, var(--accent));
		outline-offset: 2px;
	}
	input[aria-invalid='true'] + .box-cell .box {
		border-color: var(--danger);
	}
	@media (forced-colors: active) {
		.box {
			border-color: CanvasText;
		}
		input:checked + .box-cell .box {
			background: Highlight;
			border-color: Highlight;
			color: HighlightText;
		}
	}
</style>
