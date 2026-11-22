<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	import IconButton from './IconButton.svelte';
	import type { IconName } from './icons.js';

	/**
	 * Something the person should know, in one look across apps: `warning` (needs attention),
	 * `danger` (something failed), `info` (good to know, e.g. "we sent you a link"). Optional
	 * `actions` (buttons) sit at the end, and `ondismiss` adds a ✕. With `href` the whole notice is
	 * a link. Use `role="alert"` for failures that appear while someone works, `role="status"` for
	 * news that should be read out without interrupting.
	 */
	let {
		tone = 'warning',
		icon,
		role,
		href,
		children,
		actions,
		ondismiss,
		dismissLabel = 'Dismiss'
	}: {
		tone?: 'warning' | 'danger' | 'info';
		/** Defaults to `alert` for warning and danger, none for info. */
		icon?: IconName | null;
		role?: 'status' | 'alert';
		href?: string;
		children: Snippet;
		actions?: Snippet;
		ondismiss?: () => void;
		dismissLabel?: string;
	} = $props();

	const iconName = $derived(icon === undefined ? (tone === 'info' ? null : 'alert') : icon);
</script>

{#snippet body()}
	{#if iconName}<span class="mark"><Icon name={iconName} /></span>{/if}
	<div class="text">{@render children()}</div>
{/snippet}

{#if href}
	<a class="notice-box {tone}" {href} {role}>{@render body()}</a>
{:else}
	<div class="notice-box {tone}" {role}>
		{@render body()}
		{#if actions}<div class="actions">{@render actions()}</div>{/if}
		{#if ondismiss}<IconButton icon="x" label={dismissLabel} onclick={ondismiss} />{/if}
	</div>
{/if}

<style>
	.notice-box {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.6rem;
		padding: 0.5rem 0.5rem 0.5rem 1rem;
		min-height: 3rem;
		border-radius: var(--radius);
		color: var(--text);
		text-decoration: none;
		line-height: 1.45;
	}
	.warning {
		background: var(--warning-soft);
		--mark: var(--warning);
	}
	.danger {
		background: var(--danger-soft);
		--mark: var(--danger);
	}
	.info {
		background: var(--accent-soft);
		--mark: var(--accent-text);
	}
	.mark {
		align-self: flex-start;
		margin-top: 0.3rem;
		color: var(--mark);
	}
	.text {
		flex: 1;
		min-width: min(12rem, 100%);
		padding: 0.25rem 0;
	}
	.text :global(p) {
		margin: 0;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-left: auto;
	}
	a.notice-box:hover {
		text-decoration: underline;
	}
	@media (forced-colors: active) {
		.notice-box {
			border: 1px solid CanvasText;
		}
	}
</style>
