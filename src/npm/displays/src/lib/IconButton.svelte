<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { getIconButtonDefaults, ICON_BUTTON_PX, type IconButtonSize, type IconButtonTone } from './context.js';
	import { deprecated } from './deprecate.js';
	import Icon from './Icon.svelte';
	import type { IconName } from './icons.js';

	/**
	 * A round icon-only button (or link, with `href`), always `--tap` (44px) square; `label` names it
	 * for assistive tech and shows as its tooltip. `pressed` makes it an on/off switch
	 * (`aria-pressed`), `current` marks a link to the current page (`aria-current`). Its size and tone
	 * come from where it sits (`ListRow` rows: small and muted) unless set.
	 */
	let {
		icon,
		label,
		href,
		onclick,
		current = false,
		pressed,
		size,
		tone,
		disabled = false,
		showLabel = false,
		class: className,
		...rest
	}: Omit<HTMLAttributes<HTMLElement>, 'onclick' | 'class'> & {
		icon: IconName;
		label: string;
		href?: string;
		onclick?: (e: MouseEvent) => void;
		/** On a link: this is the current page (`aria-current="page"`), drawn highlighted. */
		current?: boolean;
		/** On a button that switches something on and off: whether it's on (`aria-pressed`), drawn highlighted. */
		pressed?: boolean;
		/**
		 * The icon: `sm` 18px (rows of content), `md` 20px (section headers), `lg` 22px (app header,
		 * navigation rows; the default outside a row). A number (px) still works but is deprecated.
		 */
		size?: IconButtonSize | number;
		/** `muted` for actions that step back (on rows); `neutral` (default) takes the color around it. */
		tone?: IconButtonTone;
		disabled?: boolean;
		/**
		 * Show the label to the right of the icon. In `AppHeader`'s nav, its `labels` option can
		 * limit this to the current one.
		 */
		showLabel?: boolean;
		/** Last resort: a class on the root element. Ask for an option before styling it from outside. */
		class?: string;
	} = $props();

	const defaults = getIconButtonDefaults();

	const px = $derived.by(() => {
		const s = size ?? defaults.size ?? 'lg';
		if (typeof s === 'number') {
			deprecated('IconButton size={number}', 'size="sm" | "md" | "lg" (18, 20, 22px)');
			return s;
		}
		return ICON_BUTTON_PX[s];
	});
	const toneClass = $derived(`tone-${tone ?? defaults.tone ?? 'neutral'}`);
</script>

{#snippet content()}
	<Icon name={icon} size={px} />
	{#if showLabel}<span class="text" aria-hidden="true">{label}</span>{/if}
{/snippet}

{#if href}
	<a
		class={['icon-btn', toneClass, current && 'current', showLabel && 'labeled', className]}
		{href}
		aria-label={label}
		title={showLabel ? undefined : label}
		aria-current={current ? 'page' : undefined}
		{...rest}
	>
		{@render content()}
	</a>
{:else}
	<button
		type="button"
		class={['icon-btn', toneClass, current && 'current', pressed && 'pressed', showLabel && 'labeled', className]}
		aria-label={label}
		aria-pressed={pressed}
		title={showLabel ? undefined : label}
		{onclick}
		{disabled}
		{...rest}
	>
		{@render content()}
	</button>
{/if}

<style>
	.icon-btn {
		display: inline-grid;
		place-items: center;
		width: var(--tap, 2.75rem);
		height: var(--tap, 2.75rem);
		flex: none;
		border: none;
		border-radius: var(--radius-full);
		background: transparent;
		color: inherit;
		cursor: pointer;
		text-decoration: none;
	}
	.tone-muted {
		color: var(--muted);
	}
	.tone-accent {
		color: var(--accent-text);
	}
	.tone-danger {
		color: var(--danger);
	}
	.labeled {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		width: auto;
		padding: 0 0.85rem 0 0.6rem;
		border-radius: calc(var(--tap, 2.75rem) / 2);
	}
	.text {
		font-size: var(--text-sm);
		font-weight: var(--weight-semibold);
		white-space: nowrap;
	}
	.icon-btn:hover:not(:disabled) {
		background: var(--surface-hover);
	}
	.icon-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.current,
	.pressed {
		color: var(--accent-text);
		background: var(--accent-soft);
	}
	/*
	 * Forced colors drop backgrounds, which is all that marks these states otherwise: an "on" button
	 * is filled with the highlight, the current page is ringed with it.
	 */
	@media (forced-colors: active) {
		.pressed {
			forced-color-adjust: none;
			background: Highlight;
			color: HighlightText;
		}
		.current {
			outline: 2px solid Highlight;
			outline-offset: -2px;
		}
	}
</style>
