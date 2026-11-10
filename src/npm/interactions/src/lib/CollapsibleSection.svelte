<script lang="ts">
	import { Icon, IconButton } from '@wells-nelson/displays';
	import { tick, type Snippet } from 'svelte';
	import { draggable, dropZone, type DragData, type DropZoneOptions } from './dnd.js';

	/**
	 * A card whose header (chevron, title, count, add and edit actions) stays pinned below the app
	 * header while you scroll through its rows. Collapsed sections hide rows with CSS rather than
	 * unmounting them, so a row being dragged stays attached to the page.
	 * Children are rendered inside a <ul>; give draggable rows `data-dnd-item`.
	 */
	let {
		title,
		count,
		countLabel = (n: number) => `${n} items`,
		collapsed,
		ontogglecollapse,
		onedit,
		editLabel = 'Edit',
		onadd,
		addLabel = 'Add item',
		dragData,
		ondragstart,
		ondragend,
		drop,
		variant = 'default',
		appearance = 'card',
		appHeaderSelector = '.app-header',
		children
	}: {
		title: string;
		count: number;
		countLabel?: (count: number) => string;
		collapsed: boolean;
		ontogglecollapse: () => void;
		/** Opens the section's settings (pencil icon, right of the plus). */
		onedit?: () => void;
		editLabel?: string;
		onadd?: () => void;
		addLabel?: string;
		/** Set to make the whole section long-press draggable (reordering sections). */
		dragData?: DragData;
		ondragstart?: () => void;
		ondragend?: () => void;
		/** Accept dropped rows. */
		drop?: DropZoneOptions;
		/** `subtle` gives the header a muted background (e.g. an "unallocated" bucket). */
		variant?: 'default' | 'subtle';
		/**
		 * `card` (default): a rounded card. `lines`: fills its container edge to edge with no card,
		 * so sections and rows read like lines on paper. The pinned header needs an opaque
		 * background: set `--section-header-bg` to whatever it sits on (default `--bg`).
		 */
		appearance?: 'card' | 'lines';
		/** The fixed app header, measured when scrolling a collapsed section back into view. */
		appHeaderSelector?: string;
		children: Snippet;
	} = $props();

	const noDrop: DropZoneOptions = { accepts: () => false, ondrop: () => {} };
	const noDrag: DragData = { type: 'none', id: '' };

	let section: HTMLElement | undefined = $state();
	let header: HTMLElement | undefined = $state();

	/** Space left above a section scrolled back into view after collapsing. */
	const COLLAPSE_MARGIN = 12;

	/**
	 * Collapsing from the pinned header while scrolled down inside a long section would leave the
	 * page somewhere further down; scroll up so the collapsed section is in view near the top.
	 * Scrolling up brings an auto-hiding app header back, so the section lands below the header's
	 * full height plus a small margin, not where the pinned header happened to be.
	 */
	async function toggle() {
		const pinnedTop = header?.getBoundingClientRect().top ?? 0;
		const wasPinned = !collapsed && !!section && section.getBoundingClientRect().top < pinnedTop - 1;
		ontogglecollapse();
		if (!wasPinned) return;
		await tick();
		if (!section) return;
		const appHeader = document.querySelector(appHeaderSelector);
		const target = (appHeader?.getBoundingClientRect().height ?? 0) + COLLAPSE_MARGIN;
		window.scrollBy({ top: section.getBoundingClientRect().top - target });
	}
</script>

<section
	bind:this={section}
	class={['group', variant, appearance, appearance === 'card' && 'card', collapsed && 'collapsed']}
	data-dnd-item={dragData ? '' : undefined}
	use:dropZone={drop ?? noDrop}
>
	<div
		bind:this={header}
		class="group-header"
		use:draggable={{ data: dragData ?? noDrag, disabled: !dragData, onstart: ondragstart, onend: ondragend }}
	>
		<button
			type="button"
			class="collapse"
			aria-expanded={!collapsed}
			aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
			onclick={toggle}
		>
			<span class="chev" class:collapsed><Icon name="chevron" size={20} /></span>
		</button>
		<!-- The name toggles collapse too; settings live behind the pencil. -->
		<button type="button" class="title" aria-expanded={!collapsed} onclick={toggle}>{title}</button>
		<span class="count" aria-label={countLabel(count)}>{count}</span>
		{#if onadd}
			<IconButton icon="plus" label={addLabel} onclick={onadd} />
		{/if}
		{#if onedit}
			<IconButton icon="pencil" label={editLabel} size={20} onclick={onedit} />
		{/if}
	</div>
	<ul class="items" hidden={collapsed}>
		{@render children()}
	</ul>
</section>

<style>
	.group {
		position: relative;
	}
	.group-header {
		position: sticky;
		top: var(--header-offset, 0px);
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 0.15rem;
		min-height: 3rem;
		padding: 0.15rem 0.25rem;
		background: var(--surface);
		transition: top 0.2s ease;
		-webkit-touch-callout: none;
		user-select: none;
	}
	.subtle .group-header {
		background: var(--surface-2);
	}

	/*
	 * Card: the section can't clip its children (that would break the sticky header), so whatever
	 * sits at the bottom rounds its own corners to match the card's: the header while nothing is
	 * below it, otherwise the rows. Inner radius = card radius minus its 1px border.
	 */
	.card {
		--inner-radius: calc(var(--radius) - 1px);
	}
	.card .group-header {
		border-radius: var(--inner-radius) var(--inner-radius) 0 0;
	}
	.card.collapsed .group-header,
	.card .group-header:has(+ .items:empty) {
		border-radius: var(--inner-radius);
	}
	.card .items {
		overflow: hidden;
		border-radius: 0 0 var(--inner-radius) var(--inner-radius);
	}

	/* Lines: edge to edge, a rule under each section; rows bring their own rules. */
	.lines {
		width: 100%;
		border-bottom: 1px solid var(--border);
	}
	.lines .group-header {
		background: var(--section-header-bg, var(--bg));
	}
	.lines.subtle .group-header {
		background: var(--surface-2);
	}
	.collapse {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border: none;
		background: none;
		border-radius: 50%;
		cursor: pointer;
		color: var(--muted);
	}
	.collapse:hover {
		background: var(--surface-hover);
	}
	.chev {
		transition: transform 0.15s;
	}
	.chev.collapsed {
		transform: rotate(-90deg);
	}
	.title {
		flex: 1;
		min-width: 0;
		padding: 0.5rem 0.25rem;
		border: none;
		background: none;
		text-align: left;
		font-weight: 700;
		font-size: 1.02rem;
		cursor: pointer;
		overflow-wrap: anywhere;
	}
	.count {
		min-width: 1.6rem;
		padding: 0 0.45rem;
		border-radius: 1rem;
		background: var(--surface-2);
		color: var(--muted);
		font-size: 0.8rem;
		text-align: center;
		line-height: 1.5rem;
	}
	.items {
		margin: 0;
		padding: 0;
	}
	.items:empty {
		display: none;
	}
</style>
