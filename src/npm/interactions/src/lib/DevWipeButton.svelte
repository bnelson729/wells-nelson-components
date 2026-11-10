<script lang="ts">
	import { ConfirmDialog, IconButton } from '@wells-nelson/displays';

	/**
	 * Development-only "wipe everything" button (trash icon, danger color) with a confirmation.
	 * Pair it with `wipeAllData`; render it only in dev builds.
	 */
	let {
		onconfirm,
		message = 'Development only: deletes every database and setting in this browser, signs you out here, and reloads so the app starts from scratch.\n\nNothing is deleted on the server.',
		title = 'Wipe all data?',
		label = 'Wipe all local data (dev only)',
		confirmLabel = 'Wipe everything'
	}: {
		onconfirm: () => void | Promise<void>;
		message?: string;
		title?: string;
		label?: string;
		confirmLabel?: string;
	} = $props();

	let confirming = $state(false);
</script>

<span class="dev-wipe">
	<IconButton icon="trash" {label} onclick={() => (confirming = true)} />
</span>

<ConfirmDialog bind:open={confirming} {title} {message} {confirmLabel} danger {onconfirm} />

<style>
	.dev-wipe {
		display: inline-flex;
		color: var(--danger);
	}
</style>
