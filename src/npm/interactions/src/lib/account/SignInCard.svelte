<script lang="ts">
	import { Button, Icon } from '@wells-nelson/displays';
	import { EMAIL_PATTERN, errorText, type AccountActions, type CloudStatus } from './types.js';

	/**
	 * "Continue with Google" plus, optionally, "Email me a sign-in link". Shows the expired-session
	 * notice and the offline state.
	 */
	let {
		cloud,
		account,
		returnUrl,
		pitch,
		emailLink = true,
		googleLabel = 'Continue with Google'
	}: {
		cloud: CloudStatus;
		account: Pick<AccountActions, 'signInWithGoogle' | 'signInWithEmail'>;
		/** Absolute URL to come back to after signing in (usually the profile page). */
		returnUrl: () => string;
		/** Why to sign in, e.g. "Sign in to sync projects across your devices…". */
		pitch: string;
		emailLink?: boolean;
		googleLabel?: string;
	} = $props();

	let error = $state<string | null>(null);
	let busy = $state(false);
	let email = $state('');
	let linkSentTo = $state<string | null>(null);
	const emailValid = $derived(EMAIL_PATTERN.test(email.trim()));
	const inputId = $props.id();

	async function google() {
		error = null;
		busy = true;
		try {
			await account.signInWithGoogle(returnUrl());
		} catch (err) {
			error = errorText(err);
			busy = false;
		}
	}

	async function sendLink(e: SubmitEvent) {
		e.preventDefault();
		if (!emailValid) return;
		error = null;
		busy = true;
		try {
			await account.signInWithEmail(email, returnUrl());
			linkSentTo = email.trim();
		} catch (err) {
			error = errorText(err);
		} finally {
			busy = false;
		}
	}
</script>

<section class="card section">
	{#if cloud.sessionExpired}
		<div class="notice"><Icon name="alert" /> Your session expired. Sign in again to resume syncing.</div>
	{/if}
	<h2>Sign in</h2>
	<p class="muted">{pitch}</p>
	<Button variant="primary" onclick={google} disabled={busy || !cloud.online}>
		<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
			<path
				fill="#FFC107"
				d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
			/>
			<path
				fill="#FF3D00"
				d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
			/>
			<path
				fill="#4CAF50"
				d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
			/>
			<path
				fill="#1976D2"
				d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
			/>
		</svg>
		{googleLabel}
	</Button>

	{#if emailLink}
		<div class="or muted">or</div>

		{#if linkSentTo}
			<div class="sent">
				<Icon name="mail" />
				<p>
					Check your email for a sign-in link. We sent it to <strong>{linkSentTo}</strong>. Open it in this browser.
					<button type="button" class="link" onclick={() => (linkSentTo = null)}>Use a different email</button>
				</p>
			</div>
		{:else}
			<form class="email" onsubmit={sendLink}>
				<label for={inputId}>Email me a sign-in link</label>
				<div class="row">
					<input id={inputId} type="email" autocomplete="email" placeholder="name@example.com" bind:value={email} />
					<Button type="submit" disabled={!emailValid || busy || !cloud.online}>Send link</Button>
				</div>
			</form>
		{/if}
	{/if}
	{#if !cloud.online}<p class="muted small">You're offline. Connect to sign in.</p>{/if}
	{#if error}<p class="error">{error}</p>{/if}
</section>

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
	h2 {
		margin: 0;
		font-size: 1.05rem;
	}
	.small {
		font-size: 0.9rem;
	}
	.or {
		text-align: center;
		font-size: 0.9rem;
	}
	.email {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.email label {
		font-weight: 600;
		font-size: 0.9rem;
	}
	.row {
		display: flex;
		gap: 0.5rem;
	}
	.row input {
		flex: 1;
		min-width: 0;
	}
	.sent {
		display: flex;
		gap: 0.6rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius);
		background: var(--accent-soft);
	}
	.sent :global(.icon) {
		color: var(--accent-text);
		margin-top: 0.15rem;
	}
	.link {
		display: block;
		margin-top: 0.35rem;
		padding: 0;
		border: none;
		background: none;
		color: var(--accent-text);
		text-decoration: underline;
		cursor: pointer;
	}
	.error {
		color: var(--danger);
	}
</style>
