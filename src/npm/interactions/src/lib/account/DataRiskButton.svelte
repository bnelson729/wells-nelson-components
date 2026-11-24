<script lang="ts">
	import { Button, IconButton, Modal } from '@wells-nelson/displays';
	import { installHint } from './storage-risk.js';
	import type { Nouns } from './types.js';

	/**
	 * A warning sign for a local-only container on a browser that deletes site data after 7 days
	 * without a visit (`deviceMayClearData()`). Tapping it explains the risk and the ways to keep the
	 * data: install the app, sign in and make the container cloud-enabled, or use another browser.
	 * Show it next to the container's local-only mark, only when `deviceMayClearData()` is true.
	 */
	let {
		name,
		nouns,
		appName,
		signedIn = false,
		cloudConfigured = true,
		signInHref,
		profileHref
	}: {
		/** The container's name, e.g. "Launch". */
		name: string;
		nouns: Nouns;
		/** The app's full name, e.g. "Task Planner". */
		appName: string;
		signedIn?: boolean;
		/** False when this build can't sign in (no Supabase settings): sign-in isn't offered. */
		cloudConfigured?: boolean;
		/** Where to sign in (the Profile). */
		signInHref?: string;
		/** Where backups are made (the Profile). */
		profileHref?: string;
	} = $props();

	let open = $state(false);
</script>

<span class="data-risk">
	<IconButton icon="alert" label={`“${name}” may be deleted from this device`} onclick={() => (open = true)} />
</span>

<Modal bind:open title={`“${name}” could be deleted`} size="sm" onclose={() => (open = false)}>
	<p>
		This browser deletes a website's data when you haven't opened it for 7 days. This {nouns.singular} is only on this device,
		so it would be lost.
	</p>
	<p>To keep it, do one of these:</p>
	<ul>
		<li>
			<strong>Install {appName}.</strong>
			{installHint()} Installed apps keep their data.
		</li>
		{#if cloudConfigured}
			<li>
				{#if signedIn}
					<strong>Make it cloud-enabled.</strong> Use the pencil next to it, so it syncs to your account.
				{:else}
					<strong>Sign in</strong>, then make it cloud-enabled, so it syncs to your account.
				{/if}
			</li>
		{/if}
		<li>
			<strong>Use a different browser</strong>, such as Chrome or Firefox on a computer or an Android phone. On an
			iPhone or iPad, every browser may delete data this way, so installing is safer.
		</li>
	</ul>
	{#if profileHref}
		<p class="muted">You can also export a backup from the <a href={profileHref}>Profile</a> now and then.</p>
	{/if}
	{#snippet footer()}
		{#if cloudConfigured && !signedIn && signInHref}
			<Button href={signInHref}>Sign in</Button>
		{/if}
		<Button variant="primary" onclick={() => (open = false)}>Got it</Button>
	{/snippet}
</Modal>

<style>
	.data-risk {
		display: contents;
		color: var(--warning);
	}
	.data-risk :global(button) {
		color: var(--warning);
	}
	p {
		margin: 0 0 0.75rem;
		line-height: 1.5;
	}
	ul {
		margin: 0 0 0.75rem;
		padding-left: 1.2rem;
		line-height: 1.5;
	}
	li + li {
		margin-top: 0.4rem;
	}
</style>
