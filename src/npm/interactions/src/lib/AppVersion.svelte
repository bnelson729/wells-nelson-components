<script lang="ts">
	import { Button } from '@wells-nelson/displays';

	/**
	 * The running version, with an Update button once a newer deploy is out. Feed it the app's
	 * update signal (in SvelteKit: `updated.current` from `$app/state`, with `updated.check` as
	 * `oncheck`). Without an update, `oncheck` adds a "Check for updates" button. `links` adds a
	 * line of links under it, such as the privacy policy and terms (opened in a new tab).
	 */
	let {
		version,
		updateAvailable = false,
		onupdate = () => location.reload(),
		oncheck,
		links = []
	}: {
		version: string;
		updateAvailable?: boolean;
		/** Load the new version. Defaults to reloading the page. */
		onupdate?: () => void;
		/** Look for a new version now; resolves true when there is one. */
		oncheck?: () => Promise<boolean>;
		/** Links under the version: [{ label: 'Privacy policy', href }, { label: 'Terms of service', href }]. */
		links?: { label: string; href: string }[];
	} = $props();

	let checking = $state(false);
	let found = $state(false);
	let offline = $state(false);
	let status = $state<'latest' | 'failed' | null>(null);
	const available = $derived(updateAvailable || found);

	async function check() {
		if (!oncheck) return;
		checking = true;
		status = null;
		try {
			found = await oncheck();
			if (!found) status = 'latest';
		} catch {
			status = 'failed';
			offline = typeof navigator !== 'undefined' && navigator.onLine === false;
		} finally {
			checking = false;
		}
	}
</script>

<section class="app-version" aria-label="Version">
	<p class="line">
		Version {version}{#if available}<span class="new"> · A new version is available.</span>{/if}
	</p>
	{#if available}
		<Button variant="solid" tone="accent" icon="refresh" onclick={() => onupdate()}>Update now</Button>
	{:else if oncheck}
		<Button variant="ghost" tone="accent" icon="refresh" onclick={check} disabled={checking}>
			{checking ? 'Checking…' : 'Check for updates'}
		</Button>
		{#if status === 'latest'}
			<p class="status" role="status">You have the latest version.</p>
		{:else if status === 'failed'}
			<p class="status" role="status">
				{offline
					? "You're offline. Check for updates once you're back online."
					: "Couldn't check for updates. Try again later."}
			</p>
		{/if}
	{/if}
	{#if links.length}
		<p class="links">
			{#each links as link, i (link.href)}{#if i > 0}<span aria-hidden="true">{' · '}</span>{/if}<a
					href={link.href}
					target="_blank"
					rel="noopener">{link.label}<span class="visually-hidden">{' (opens in a new tab)'}</span></a
				>{/each}
		</p>
	{/if}
</section>

<style>
	.app-version {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		text-align: center;
	}
	.line,
	.status {
		margin: 0;
		color: var(--muted);
		font-size: var(--text-sm);
	}
	.links {
		margin: var(--space-1) 0 0;
		font-size: var(--text-sm);
		color: var(--muted);
	}
	.new {
		color: var(--text);
		font-weight: var(--weight-semibold);
	}
</style>
