<script lang="ts">
	import { Button, Icon } from '@wells-nelson/displays';
	import { capitalize, type AccountActions, type CloudStatus, type Nouns } from './types.js';

	/** Signed-in summary: who, connection, last sync, what's waiting to upload, force re-sync. */
	let {
		cloud,
		account,
		nouns,
		pending
	}: {
		cloud: CloudStatus;
		account: Pick<AccountActions, 'forceResync'>;
		nouns: Nouns;
		/** Containers with unsynced changes, already named by the app. */
		pending: { id: string; name: string }[];
	} = $props();

	let resyncing = $state(false);
	const user = $derived(cloud.user);
	const meta = $derived((user?.user_metadata ?? {}) as Record<string, string | undefined>);
	const displayName = $derived(meta.full_name ?? meta.name ?? user?.email);
	const lastSync = $derived(cloud.lastSync ? new Date(cloud.lastSync).toLocaleString() : 'Not yet');

	async function resync() {
		resyncing = true;
		try {
			await account.forceResync();
		} finally {
			setTimeout(() => (resyncing = false), 600);
		}
	}
</script>

<section class="card section">
	<div class="who">
		{#if meta.avatar_url}
			<img src={meta.avatar_url} alt="" referrerpolicy="no-referrer" />
		{/if}
		<div>
			<div class="name">{displayName}</div>
			<div class="muted small">{user?.email}</div>
		</div>
	</div>
</section>

<section class="card section">
	<h2>Sync</h2>
	<dl class="status">
		<dt>Connection</dt>
		<dd>{cloud.online ? (cloud.active ? 'Online · syncing…' : 'Online') : 'Offline'}</dd>
		<dt>Last synced</dt>
		<dd>{lastSync}</dd>
	</dl>
	{#if pending.length > 0}
		<div>
			<p class="small"><strong>{capitalize(nouns.plural)} with changes waiting to sync</strong></p>
			<ul class="pending">
				{#each pending as p (p.id)}
					<li><Icon name="cloud-pending" size={16} /> {p.name}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<p class="muted small">Everything is synced.</p>
	{/if}
	{#if cloud.error}<p class="error small">Last sync error: {cloud.error}</p>{/if}
	<Button icon="refresh" onclick={resync} disabled={!cloud.online || resyncing}>
		{resyncing ? 'Syncing…' : 'Force re-sync'}
	</Button>
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
	.who {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.who img {
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
	}
	.name {
		font-weight: 700;
		font-size: 1.1rem;
	}
	.status {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.3rem 1rem;
		margin: 0;
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
	}
	.pending {
		list-style: none;
		margin: 0.4rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.pending li {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.error {
		color: var(--danger);
	}
</style>
