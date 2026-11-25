<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import FieldMessage from './FieldMessage.svelte';
	import type { FieldProps } from './forms.js';

	/**
	 * An on/off switch (`role="switch"`) for a setting that applies right away. For a choice saved with
	 * a form, or one of several, use `Checkbox`. Other attributes go to the <input>.
	 */
	let {
		checked = $bindable(false),
		label,
		hint,
		error,
		disabled = false,
		onchange,
		class: className,
		...rest
	}: Omit<HTMLInputAttributes, 'type' | 'checked' | 'onchange' | 'class'> &
		Omit<FieldProps, 'hideLabel' | 'required' | 'optional'> & {
			checked?: boolean;
			onchange?: (checked: boolean) => void;
			/** Last resort: a class on the root element. */
			class?: string;
		} = $props();

	const id = $props.id();
	const messageId = `${id}-msg`;
</script>

<div class={['toggle-field', className]}>
	<label class={['toggle', disabled && 'disabled']}>
		<span class="text">{label}</span>
		<input
			type="checkbox"
			role="switch"
			bind:checked
			{disabled}
			onchange={() => onchange?.(checked)}
			aria-describedby={error || hint ? messageId : undefined}
			aria-invalid={error ? 'true' : undefined}
			{...rest}
		/>
		<span class="track" aria-hidden="true"><span class="thumb"></span></span>
	</label>
	<FieldMessage id={messageId} {error} {hint} />
</div>

<style>
	.toggle-field {
		display: inline-flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.toggle {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		min-height: var(--tap, 2.75rem);
		cursor: pointer;
		user-select: none;
	}
	.disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
	.track {
		position: relative;
		flex: none;
		width: 2.6rem;
		height: 1.5rem;
		border-radius: var(--radius-full);
		background: var(--control-border);
		transition: background-color var(--duration-fast);
	}
	.thumb {
		position: absolute;
		top: 0.15rem;
		left: 0.15rem;
		width: 1.2rem;
		height: 1.2rem;
		border-radius: var(--radius-full);
		background: var(--on-control);
		box-shadow: var(--shadow);
		transition: transform var(--duration-fast);
	}
	input:checked + .track {
		background: var(--accent);
	}
	input:checked + .track .thumb {
		transform: translateX(1.1rem);
	}
	input:focus-visible + .track {
		outline: 2px solid var(--focus, var(--accent));
		outline-offset: 2px;
	}
	/* Forced colors drop backgrounds: draw the track's outline and fill the "on" state. */
	@media (forced-colors: active) {
		.track {
			border: 1px solid CanvasText;
		}
		.thumb {
			background: CanvasText;
			top: calc(0.15rem - 1px);
			left: calc(0.15rem - 1px);
		}
		input:checked + .track {
			background: Highlight;
			border-color: Highlight;
		}
		input:checked + .track .thumb {
			background: HighlightText;
		}
	}
</style>
