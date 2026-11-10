<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	/**
	 * Fixed app header: brand on the left; dev-only tools, context nav and the profile avatar on
	 * the right. Keeps `--header-offset` on <html> up to date so sticky content can sit below it.
	 */
	let {
		brand,
		brandHref,
		brandLabel,
		nav,
		dev,
		profileHref,
		profileLabel = 'Profile',
		profileActive = false,
		avatarUrl,
		unsynced = false,
		unsyncedLabel = 'Unsynced changes',
		hideOnScroll = false,
		width = 'var(--content-w)'
	}: {
		/** Brand mark, rendered inside the home link. */
		brand: Snippet;
		brandHref: string;
		/** Accessible name of the home link, e.g. "Home — all projects". */
		brandLabel: string;
		/** Context navigation, usually `IconButton`s with `href`. */
		nav?: Snippet;
		/** Development-only tools; the app passes this only in dev builds. */
		dev?: Snippet;
		profileHref: string;
		profileLabel?: string;
		profileActive?: boolean;
		avatarUrl?: string | null;
		/** Shows a warning dot on the avatar. */
		unsynced?: boolean;
		unsyncedLabel?: string;
		/** Slide the header away while scrolling down; it comes back when scrolling up. */
		hideOnScroll?: boolean;
		/** Max width of the header content (CSS length), e.g. a wider value on dashboard screens. */
		width?: string;
	} = $props();

	let scrolledAway = $state(false);
	let lastY = 0;
	const hidden = $derived(hideOnScroll && scrolledAway);

	function onScroll() {
		if (!hideOnScroll) return;
		const y = Math.max(0, window.scrollY);
		if (Math.abs(y - lastY) < 4) return;
		scrolledAway = y > lastY && y > 56;
		lastY = y;
	}

	$effect(() => {
		document.documentElement.style.setProperty(
			'--header-offset',
			hidden ? '0px' : 'calc(var(--header-h) + env(safe-area-inset-top, 0px))'
		);
	});
</script>

<svelte:window onscroll={onScroll} />

<header class="app-header" class:hidden>
	<div class="inner" style:max-width={width}>
		<a class="brand" href={brandHref} aria-label={brandLabel}>{@render brand()}</a>
		<nav aria-label="Main">
			{@render dev?.()}
			{@render nav?.()}
			<a class="profile" href={profileHref} aria-label={profileLabel} title={profileLabel} class:active={profileActive}>
				{#if avatarUrl}
					<img src={avatarUrl} alt="" referrerpolicy="no-referrer" />
				{:else}
					<Icon name="user" size={22} />
				{/if}
				{#if unsynced}
					<span class="dot" title={unsyncedLabel}></span>
				{/if}
			</a>
		</nav>
	</div>
</header>

<style>
	header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 50;
		padding-top: env(safe-area-inset-top, 0px);
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		transition: transform 0.2s ease;
	}
	header.hidden {
		transform: translateY(-100%);
	}
	.inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: var(--header-h);
		margin: 0 auto;
		padding: 0 0.25rem 0 1rem;
	}
	.brand {
		font-weight: 800;
		font-size: 1.35rem;
		letter-spacing: 0.02em;
		color: var(--accent-text);
		text-decoration: none;
	}
	nav {
		display: flex;
		align-items: center;
	}
	.profile {
		position: relative;
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		color: inherit;
	}
	.profile:hover,
	.profile.active {
		background: var(--accent-soft);
	}
	.profile img {
		width: 1.9rem;
		height: 1.9rem;
		border-radius: 50%;
	}
	.dot {
		position: absolute;
		top: 0.35rem;
		right: 0.35rem;
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		background: var(--warning);
		border: 2px solid var(--surface);
	}
	@media (max-width: 22rem) {
		.inner {
			padding-left: 0.6rem;
		}
		.brand {
			font-size: 1.15rem;
		}
	}
</style>
