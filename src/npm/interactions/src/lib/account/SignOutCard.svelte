<script lang="ts">
	import { Button, ConfirmDialog } from '@wells-nelson/displays';
	import { errorText, type AccountActions, type CloudStatus, type Nouns } from './types.js';

	/** Sign out, with a warning listing anything that hasn't reached the cloud yet. */
	let {
		cloud,
		account,
		nouns,
		pending
	}: {
		cloud: CloudStatus;
		account: Pick<AccountActions, 'signOut'>;
		nouns: Nouns;
		pending: { id: string; name: string }[];
	} = $props();

	let busy = $state(false);
	let confirming = $state(false);
	let error = $state<string | null>(null);

	function request() {
		if (cloud.hasAnyPending) confirming = true;
		else void signOut();
	}

	async function signOut() {
		busy = true;
		error = null;
		try {
			await account.signOut();
		} catch (err) {
			error = errorText(err);
		} finally {
			busy = false;
		}
	}
</script>

<section class="card section">
	<p class="muted small">
		Signing out removes your cloud-enabled {nouns.plural} from this device. Local-only {nouns.plural} stay.
	</p>
	<Button onclick={request} disabled={busy}>Sign out</Button>
	{#if error}<p class="error">{error}</p>{/if}
</section>

<ConfirmDialog
	bind:open={confirming}
	title="Sign out with unsynced changes?"
	message={`These ${nouns.plural} have changes that haven't reached the cloud yet:\n${pending.map((p) => `• ${p.name}`).join('\n')}\n\nIf you sign out now those changes will be lost. Reconnect and use "Force re-sync" first to keep them.`}
	confirmLabel="Sign out anyway"
	danger
	onconfirm={signOut}
/>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		margin-bottom: 1rem;
	}
	.section p {
		margin: 0;
		line-height: 1.5;
	}
	.small {
		font-size: 0.9rem;
	}
	.error {
		color: var(--danger);
	}
</style>
