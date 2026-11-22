<script lang="ts">
	import { Notice } from '@wells-nelson/displays';

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
	<div class="sync-banner">
		<Notice tone="danger" role="alert" ondismiss={() => (cloud.rejectedWrite = null)}>
			<p><strong>{rejectedTitle}</strong> {cloud.rejectedWrite}</p>
		</Notice>
	</div>
{/if}
{#if app.writeError}
	<div class="sync-banner">
		<Notice tone="danger" role="alert" ondismiss={() => (app.writeError = null)}>
			<p><strong>{writeErrorTitle}</strong> {app.writeError}.{writeErrorHint ? ` ${writeErrorHint}` : ''}</p>
		</Notice>
	</div>
{/if}

<style>
	.sync-banner {
		max-width: var(--content-w);
		margin: 1rem auto 0;
	}
</style>
