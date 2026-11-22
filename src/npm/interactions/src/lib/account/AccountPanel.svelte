<script lang="ts">
	import SignInCard from './SignInCard.svelte';
	import SignOutCard from './SignOutCard.svelte';
	import SyncStatusCard from './SyncStatusCard.svelte';
	import { capitalize, type AccountActions, type CloudStatus, type Nouns } from './types.js';

	/**
	 * The whole profile page body: "not configured", sign-in, or the signed-in summary with sync
	 * status and sign-out. Use the cards directly for a different layout.
	 */
	let {
		cloud,
		account,
		nouns,
		appName,
		returnUrl,
		pendingName,
		emailLink = true,
		signInPitch
	}: {
		cloud: CloudStatus;
		account: AccountActions;
		nouns: Nouns;
		appName: string;
		returnUrl: () => string;
		/** Display name of a container with pending changes (it may already be deleted). */
		pendingName: (id: string) => string;
		emailLink?: boolean;
		signInPitch?: string;
	} = $props();

	const pending = $derived(cloud.pendingIds.map((id) => ({ id, name: pendingName(id) })));
	const pitch = $derived(
		signInPitch ??
			`Sign in to sync ${nouns.plural} across your devices and share them with others. ` +
				`${capitalize(nouns.plural)} you make while signed out stay local-only on this device.`
	);
</script>

{#if !cloud.configured}
	<section class="card card-section">
		<h2>Cloud sync isn't set up</h2>
		<p class="muted">
			This copy of {appName} runs local-only: every {nouns.singular} stays on this device, and signing in isn't available.
			Everything else works as usual.
		</p>
	</section>
{:else if !cloud.user || cloud.sessionExpired}
	<SignInCard {cloud} {account} {returnUrl} {pitch} {emailLink} />
{:else}
	<SyncStatusCard {cloud} {account} {nouns} {pending} />
	<SignOutCard {cloud} {account} {nouns} {pending} />
{/if}
