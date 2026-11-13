<script lang="ts">
	import { Icon, IconButton } from '@wells-nelson/displays';

	let {
		value = $bindable(''),
		placeholder = 'Search',
		clearLabel = 'Clear search'
	}: { value?: string; placeholder?: string; clearLabel?: string } = $props();
</script>

<div class="search-bar">
	<div class="inner">
		<Icon name="search" />
		<input type="search" bind:value {placeholder} aria-label={placeholder} enterkeyhint="search" />
		{#if value}
			<IconButton icon="x" label={clearLabel} size={18} onclick={() => (value = '')} />
		{/if}
	</div>
</div>
<div class="spacer" aria-hidden="true"></div>

<style>
	.search-bar {
		position: fixed;
		left: 0;
		right: 0;
		/* Above a bottom tab bar when there is one (--footer-offset includes the safe area then). */
		bottom: var(--footer-offset, 0px);
		z-index: 40;
		padding: 0.5rem 1rem calc(0.5rem + max(0px, env(safe-area-inset-bottom, 0px) - var(--footer-offset, 0px)));
		background: linear-gradient(to top, var(--bg) 70%, transparent);
	}
	.inner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		max-width: var(--content-w);
		margin: 0 auto;
		padding: 0 0.25rem 0 0.9rem;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: 2rem;
		box-shadow: var(--shadow);
		color: var(--muted);
	}
	.inner:focus-within {
		border-color: var(--accent);
	}
	input {
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		padding: 0.7rem 0;
		color: var(--text);
		box-shadow: none !important;
	}
	input::-webkit-search-cancel-button {
		display: none;
	}
	.spacer {
		height: calc(4.5rem + max(0px, env(safe-area-inset-bottom, 0px) - var(--footer-offset, 0px)));
	}
</style>
