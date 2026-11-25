<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	/**
	 * A page's (or a card section's) title with its actions on the right: the "+ New …" button, a
	 * toggle, a link. The actions wrap under the title when there's no room. `back` adds a link above
	 * the title to the page this one belongs to ("Back to Projects").
	 */
	let {
		title,
		level = 1,
		id,
		back,
		actions,
		class: className
	}: {
		title: string;
		/** 1 for the page title (the default); 2 or 3 for a section inside the page, e.g. a card. */
		level?: 1 | 2 | 3;
		/** The heading's id, for `aria-labelledby` on the section it names. */
		id?: string;
		/** A link above the title, e.g. `{ href: '/projects', label: 'Back to Projects' }`. */
		back?: { href: string; label: string };
		/** Buttons and links on the right of the title. */
		actions?: Snippet;
		/** Last resort: a class on the root element. Ask for an option before styling it from outside. */
		class?: string;
	} = $props();
</script>

<div class={['page-header', `level-${level}`, className]}>
	{#if back}
		<a class="back" href={back.href}><Icon name="chevron-left" size={18} inline />{back.label}</a>
	{/if}
	<div class="title-row">
		<svelte:element this={`h${level}`} {id} class={level === 1 ? 'page-title' : 'title'}>{title}</svelte:element>
		{#if actions}<div class="actions">{@render actions()}</div>{/if}
	</div>
</div>

<style>
	.page-header {
		margin-bottom: var(--space-4);
	}
	.level-2,
	.level-3 {
		margin-bottom: 0;
	}
	.back {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		min-height: var(--tap, 2.75rem);
		margin-left: calc(-1 * var(--space-1));
		padding-right: var(--space-2);
		font-size: var(--text-sm);
		font-weight: var(--weight-semibold);
		text-decoration: none;
	}
	.back:hover {
		text-decoration: underline;
	}
	.title-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2) var(--space-4);
	}
	.title-row > :global(.page-title) {
		margin: 0;
	}
	.title {
		margin: 0;
		font-size: var(--text-lg);
	}
	.level-3 .title {
		font-size: var(--text-md);
	}
	.title,
	.title-row > :global(.page-title) {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1);
		margin-left: auto;
	}
</style>
