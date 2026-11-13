<script lang="ts">
	import { Icon, IconButton } from '@wells-nelson/displays';

	/**
	 * The two "your change didn't stick" banners every page can show, each dismissable: a write the
	 * server refused (`cloud.rejectedWrite`), and a write this device couldn't store
	 * (`app.writeError`). Pass the store's `app` and `cloud`.
	 */
	let {
		app,
		cloud,
		rejectedTitle = "Some changes couldn't be saved to the cloud.",
		writeErrorTitle = "A change couldn't be saved on this device.",
		writeErrorHint = 'If this keeps happening, the device may be out of storage: export a backup from the Profile.'
	}: {
		app: { writeError: string | null };
		cloud: { rejectedWrite: string | null };
		rejectedTitle?: string;
		writeErrorTitle?: string;
		/** Said after the error; empty for none. */
		writeErrorHint?: string;
	} = $props();
</script>

{#if cloud.rejectedWrite}
	<div class="sync-banner" role="alert">
		<Icon name="alert" />
		<p><strong>{rejectedTitle}</strong> {cloud.rejectedWrite}</p>
		<IconButton icon="x" label="Dismiss" onclick={() => (cloud.rejectedWrite = null)} />
	</div>
{/if}
{#if app.writeError}
	<div class="sync-banner" role="alert">
		<Icon name="alert" />
		<p><strong>{writeErrorTitle}</strong> {app.writeError}.{writeErrorHint ? ` ${writeErrorHint}` : ''}</p>
		<IconButton icon="x" label="Dismiss" onclick={() => (app.writeError = null)} />
	</div>
{/if}

<style>
	.sync-banner {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		max-width: var(--content-w);
		margin: 1rem auto 0;
		padding: 0.6rem 0.5rem 0.6rem 1rem;
		border-radius: var(--radius);
		background: var(--danger-soft);
		color: var(--text);
	}
	.sync-banner > :global(.icon) {
		color: var(--danger);
		margin-top: 0.15rem;
		flex: none;
	}
	p {
		flex: 1;
		margin: 0.15rem 0;
		line-height: 1.45;
	}
</style>
