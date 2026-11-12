<script lang="ts">
	import Icon from './Icon.svelte';
	import type { TabItem } from './types.js';

	/**
	 * Fixed bottom navigation for phones: one tab per top-level destination, icon over label.
	 * Use it instead of `AppHeader` on phones (`phoneLayout` says when). While mounted it sets
	 * `--header-h: 0px` on <html>, so pages start at the top, and `--footer-offset`, which
	 * `SearchBar`, `UndoButton` and other fixed bottom UI use to sit above it; it leaves a spacer
	 * of its height at the end of the page.
	 */
	let { items, label = 'Main' }: { items: TabItem[]; label?: string } = $props();

	$effect(() => {
		const root = document.documentElement.style;
		root.setProperty('--footer-offset', 'calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px))');
		root.setProperty('--header-h', '0px');
		return () => {
			root.removeProperty('--footer-offset');
			root.removeProperty('--header-h');
		};
	});
</script>

{#snippet content(item: TabItem)}
	<span class="icon">
		{#if item.imageUrl}
			<img src={item.imageUrl} alt="" referrerpolicy="no-referrer" />
		{:else}
			<Icon name={item.icon} size={24} />
		{/if}
		{#if item.dot}
			<span class="dot" title={item.dotLabel}></span>
		{/if}
	</span>
	<span class="label">{item.label}</span>
	{#if item.dot && item.dotLabel}<span class="visually-hidden">({item.dotLabel})</span>{/if}
{/snippet}

<div class="spacer" aria-hidden="true"></div>
<nav class="tab-bar" aria-label={label}>
	{#each items as item (item.label)}
		{#if item.href}
			<a class="tab" class:active={item.active} href={item.href} aria-current={item.active ? 'page' : undefined}>
				{@render content(item)}
			</a>
		{:else}
			<span class="tab disabled" aria-disabled="true">{@render content(item)}</span>
		{/if}
	{/each}
</nav>

<style>
	.spacer {
		height: calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px));
	}
	.tab-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 50;
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		padding-bottom: env(safe-area-inset-bottom, 0px);
		background: var(--surface);
		border-top: 1px solid var(--border);
	}
	.tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15rem;
		height: var(--tabbar-h);
		color: var(--muted);
		font-size: 0.72rem;
		font-weight: 600;
		text-decoration: none;
		-webkit-touch-callout: none;
		user-select: none;
	}
	.icon {
		position: relative;
		display: grid;
		place-items: center;
		width: 3.5rem;
		height: 1.9rem;
		border-radius: 1rem;
		transition: background-color 0.15s;
	}
	.active {
		color: var(--accent-text);
	}
	.active .icon {
		background: var(--accent-soft);
	}
	.disabled {
		opacity: 0.4;
	}
	img {
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 50%;
	}
	.dot {
		position: absolute;
		top: 0.1rem;
		right: 0.95rem;
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		background: var(--warning);
		border: 2px solid var(--surface);
	}
</style>
