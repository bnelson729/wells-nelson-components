<script lang="ts">
	import { Button } from '@wells-nelson/displays';

	/**
	 * The running version, with an Update button once a newer deploy is out. Feed it the app's
	 * update signal (in SvelteKit: `updated.current` from `$app/state`, with `updated.check` as
	 * `oncheck`). Without an update, `oncheck` adds a "Check for updates" button.
	 */
	let {
		version,
		updateAvailable = false,
		onupdate = () => location.reload(),
		oncheck
	}: {
		version: string;
		updateAvailable?: boolean;
		/** Load the new version. Defaults to reloading the page. */
		onupdate?: () => void;
		/** Look for a new version now; resolves true when there is one. */
		oncheck?: () => Promise<boolean>;
	} = $props();

	let checking = $state(false);
	let found = $state(false);
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
		<Button variant="primary" icon="refresh" onclick={() => onupdate()}>Update</Button>
	{:else if oncheck}
		<Button variant="ghost" icon="refresh" onclick={check} disabled={checking}>
			{checking ? 'Checking…' : 'Check for updates'}
		</Button>
		{#if status === 'latest'}
			<p class="status" role="status">You have the latest version.</p>
		{:else if status === 'failed'}
			<p class="status" role="status">Couldn't check for updates. Try again when you're online.</p>
		{/if}
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
		font-size: 0.85rem;
	}
	.new {
		color: var(--text);
		font-weight: 600;
	}
</style>
