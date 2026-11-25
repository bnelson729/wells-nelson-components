<script lang="ts">
	import { Badge, Icon, IconButton, setIconButtonDefaults } from '@wells-nelson/displays';
	import { tick, type Snippet } from 'svelte';
	import { draggable, dropZone, type DragData, type DropZoneOptions } from './dnd.js';

	/**
	 * A card whose header (chevron, title, count, add and edit actions) stays pinned below the app
	 * header while you scroll through its rows. Collapsed sections hide rows with CSS rather than
	 * unmounting them, so a row being dragged stays attached to the page.
	 * Children are rendered inside a <ul> (`ListRow`s for `layout="lines"`); give draggable rows
	 * `data-dnd-item`. `IconButton`s in the rows are small and muted unless they say otherwise.
	 * The title is a heading (`headingLevel`, h2 by default) holding the button that collapses the
	 * section, so screen reader users can move between sections by heading. The chevron does the
	 * same for pointers and stays out of the tab order.
	 */
	let {
		title,
		count,
		countLabel = (n: number) => (n === 1 ? '1 item' : `${n} items`),
		expanded = $bindable(true),
		onexpandedchange,
		onedit,
		editLabel,
		onadd,
		addLabel,
		dragData,
		ondragstart,
		ondragend,
		drop,
		emphasis = 'default',
		layout = 'card',
		appHeaderSelector = '.app-header',
		headingLevel = 2,
		children,
		empty,
		class: className
	}: {
		title: string;
		count: number;
		countLabel?: (count: number) => string;
		/** Whether its rows show. Bind it, or pass it and save it in `onexpandedchange`. */
		expanded?: boolean;
		/** After the person expands or collapses it. */
		onexpandedchange?: (expanded: boolean) => void;
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
		emphasis?: 'default' | 'subtle';
		/**
		 * `card` (default): a rounded card. `lines`: fills its container edge to edge with no card,
		 * so sections and rows read like lines on paper. The pinned header needs an opaque
		 * background: set `--section-header-bg` to whatever it sits on (default `--bg`).
		 */
		layout?: 'card' | 'lines';
		/** The fixed app header, measured when scrolling a collapsed section back into view. */
		appHeaderSelector?: string;
		/** Level of the title's heading: 2 under a page's h1, 3 for sections inside another section. */
		headingLevel?: 2 | 3 | 4;
		children: Snippet;
		/** Shown while `count` is 0, in place of the rows (e.g. "Nothing here yet."). */
		empty?: Snippet;
		/** Last resort: a class on the root element. */
		class?: string;
	} = $props();

	setIconButtonDefaults({ size: 'sm', tone: 'muted' });

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
		const wasPinned = expanded && !!section && section.getBoundingClientRect().top < pinnedTop - 1;
		expanded = !expanded;
		onexpandedchange?.(expanded);
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
	class={['group', emphasis, layout, layout === 'card' && 'card', !expanded && 'collapsed', className]}
	data-dnd-item={dragData ? '' : undefined}
	use:dropZone={drop ?? noDrop}
>
	<div
		bind:this={header}
		class="group-header"
		use:draggable={{ data: dragData ?? noDrag, disabled: !dragData, onstart: ondragstart, onend: ondragend }}
	>
		<!-- A bigger target for pointers; keyboards and screen readers use the title's button. -->
		<button type="button" class="collapse" tabindex="-1" aria-hidden="true" onclick={toggle}>
			<span class="chev" class:collapsed={!expanded}><Icon name="chevron" size={20} /></span>
		</button>
		<!-- The name collapses the section; settings live behind the pencil. -->
		<svelte:element this={`h${headingLevel}`} class="heading">
			<button type="button" class="title" aria-expanded={expanded} onclick={toggle}>{title}</button>
		</svelte:element>
		<Badge tone="count" label={countLabel(count)}>{count}</Badge>
		{#if onadd}
			<IconButton icon="plus" label={addLabel ?? `Add to ${title}`} size="lg" tone="neutral" onclick={onadd} />
		{/if}
		{#if onedit}
			<IconButton icon="pencil" label={editLabel ?? `Edit ${title}`} size="md" tone="neutral" onclick={onedit} />
		{/if}
	</div>
	<ul class="items" hidden={!expanded}>
		{#if count === 0 && empty}<li class="empty-row">{@render empty()}</li>{:else}{@render children()}{/if}
	</ul>
</section>

<style>
	.group {
		position: relative;
	}
	.group-header {
		position: sticky;
		top: var(--header-offset, 0px);
		z-index: var(--z-sticky);
		display: flex;
		align-items: center;
		gap: 0.15rem;
		min-height: 3rem;
		padding: 0.15rem var(--space-1);
		background: var(--surface);
		transition: top var(--duration-normal) ease;
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
		width: var(--tap, 2.75rem);
		height: var(--tap, 2.75rem);
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
		transition: transform var(--duration-fast);
	}
	.chev.collapsed {
		transform: rotate(-90deg);
	}
	.heading {
		flex: 1;
		min-width: 0;
		margin: 0;
		font: inherit;
	}
	.title {
		width: 100%;
		padding: var(--space-2) var(--space-1);
		border: none;
		background: none;
		text-align: left;
		font-weight: var(--weight-bold);
		font-size: var(--text-md);
		cursor: pointer;
		overflow-wrap: anywhere;
	}
	.items {
		margin: 0;
		padding: 0;
	}
	.items:empty {
		display: none;
	}
	.empty-row {
		list-style: none;
		padding: var(--space-3) var(--space-4);
		border-top: 1px solid var(--border);
		color: var(--muted);
	}
</style>
