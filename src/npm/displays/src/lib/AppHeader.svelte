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
		width = 'var(--content-w)',
		labels = 'always',
		profileShowLabel = false
	}: {
		/** Brand mark, rendered inside the home link. */
		brand: Snippet;
		brandHref: string;
		/** Accessible name of the home link, e.g. "Home — all projects". */
		brandLabel: string;
		/**
		 * Context navigation, usually `IconButton`s with `href`. Give them `showLabel` to show their
		 * label next to the icon (see `labels`).
		 */
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
		/**
		 * Which nav buttons with `showLabel` show their label: `always` all of them, `active` only the
		 * current one (the others show just the icon).
		 */
		labels?: 'always' | 'active';
		/** Show `profileLabel` next to the avatar, like a nav button with `showLabel`. */
		profileShowLabel?: boolean;
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
		<nav aria-label="Main" class="labels-{labels}">
			{@render dev?.()}
			{@render nav?.()}
			<a
				class="profile"
				class:labeled={profileShowLabel}
				href={profileHref}
				aria-label={profileLabel}
				title={profileShowLabel ? undefined : profileLabel}
				class:active={profileActive}
			>
				<span class="avatar">
					{#if avatarUrl}
						<img src={avatarUrl} alt="" referrerpolicy="no-referrer" />
					{:else}
						<Icon name="user" size={22} />
					{/if}
					{#if unsynced}
						<span class="dot" title={unsyncedLabel}></span>
					{/if}
				</span>
				{#if profileShowLabel}<span class="text" aria-hidden="true">{profileLabel}</span>{/if}
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
		gap: 0.1rem;
	}
	/* labels="active": labeled buttons other than the current one show just their icon. */
	.labels-active :global(.icon-btn.labeled:not(.active)) {
		width: 2.5rem;
		padding: 0;
		justify-content: center;
		border-radius: 50%;
	}
	.labels-active :global(.icon-btn.labeled:not(.active) .text),
	.labels-active .profile.labeled:not(.active) .text {
		display: none;
	}
	.profile {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		min-width: 2.5rem;
		height: 2.5rem;
		border-radius: 1.25rem;
		color: inherit;
		text-decoration: none;
	}
	.profile.labeled {
		padding: 0 0.85rem 0 0.3rem;
	}
	.labels-active .profile.labeled:not(.active) {
		padding: 0;
	}
	.avatar {
		position: relative;
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
	}
	.text {
		font-size: 0.92rem;
		font-weight: 600;
		white-space: nowrap;
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
