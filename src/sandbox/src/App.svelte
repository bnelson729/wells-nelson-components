<script lang="ts">
	import { AppHeader, IconButton, phoneLayout, TabBar, type IconName } from '@wells-nelson/displays';
	import greenPalette from '@wells-nelson/displays/palettes/green.css?inline';
	import purplePalette from '@wells-nelson/displays/palettes/purple.css?inline';
	import type { Component } from 'svelte';
	import Account from './pages/Account.svelte';
	import BuildTools from './pages/BuildTools.svelte';
	import DataStorage from './pages/DataStorage.svelte';
	import Displays from './pages/Displays.svelte';
	import Interactions from './pages/Interactions.svelte';
	import States from './pages/States.svelte';
	import { shell } from './state.svelte';

	const pages: { id: string; label: string; icon: IconName; component: Component }[] = [
		{ id: 'displays', label: 'Displays', icon: 'layout', component: Displays },
		{ id: 'interactions', label: 'Interactions', icon: 'cursor', component: Interactions },
		{ id: 'states', label: 'States', icon: 'grid', component: States },
		{ id: 'account', label: 'Account and sharing', icon: 'users', component: Account },
		{ id: 'data-storage', label: 'Data storage', icon: 'database', component: DataStorage },
		{ id: 'build-tools', label: 'Build tools', icon: 'tool', component: BuildTools }
	];

	// "#/states?palette=green": a page, and optionally the palette to show it in (used by the visual tests).
	const fromHash = () => location.hash.replace(/^#\/?/, '').split('?')[0] || 'displays';
	const hashPalette = new URLSearchParams(location.hash.split('?')[1] ?? '').get('palette');
	if (hashPalette === 'green' || hashPalette === 'purple' || hashPalette === 'blue') shell.palette = hashPalette;
	let route = $state(fromHash());
	const page = $derived(pages.find((p) => p.id === route) ?? pages[0]);

	const AVATAR =
		'data:image/svg+xml,' +
		encodeURIComponent(
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#c46b2f"/><text x="20" y="26" font-family="sans-serif" font-size="16" font-weight="700" fill="#fff" text-anchor="middle">AB</text></svg>'
		);

	const showTabBar = $derived(shell.tabBar === 'on' || (shell.tabBar === 'auto' && phoneLayout.current));

	// The palette is switched by adding / removing its stylesheet (blue is the theme's own).
	const paletteCss = { blue: '', green: greenPalette, purple: purplePalette };
	$effect(() => {
		const css = paletteCss[shell.palette];
		if (!css) return;
		const style = document.createElement('style');
		style.textContent = css;
		document.head.append(style);
		return () => style.remove();
	});
</script>

<svelte:window onhashchange={() => (route = fromHash())} />
<svelte:head><title>{page.label} · Sandbox</title></svelte:head>

{#if !showTabBar}
	<AppHeader
		brandHref="#/displays"
		brandLabel="Sandbox home"
		profileHref="#/account"
		profileCurrent={route === 'account'}
		avatarUrl={shell.avatar ? AVATAR : null}
		unsynced={shell.unsynced}
		hideOnScroll={shell.hideOnScroll}
		width={shell.wide ? '64rem' : undefined}
		labels={shell.labels === 'current' ? 'current' : 'always'}
		profileShowLabel={shell.profileLabel}
		profileLabel="Account"
	>
		{#snippet brand()}WN{/snippet}
		{#snippet nav()}
			{#each pages.filter((p) => p.id !== 'account') as p (p.id)}
				<IconButton
					icon={p.icon}
					label={p.label.split(' ')[0]}
					href={`#/${p.id}`}
					current={route === p.id}
					showLabel={shell.labels !== 'none'}
				/>
			{/each}
		{/snippet}
	</AppHeader>
{:else}
	<TabBar
		items={pages.map((p) => ({
			label: p.label.split(' ')[0],
			icon: p.icon,
			href: `#/${p.id}`,
			current: route === p.id,
			imageUrl: p.id === 'account' && shell.avatar ? AVATAR : null,
			dot: p.id === 'account' && shell.unsynced,
			dotLabel: 'Unsynced changes'
		}))}
	/>
{/if}

<main class="page main">
	<h1 class="page-title">{page.label}</h1>
	{#key page.id}
		<page.component />
	{/key}
</main>

<style>
	.main {
		padding-top: calc(var(--header-h) + env(safe-area-inset-top, 0px) + 1rem);
		padding-bottom: 6rem;
	}
</style>
