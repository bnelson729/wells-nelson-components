<script lang="ts">
	import { Button, ConfirmDialog, Icon, Modal } from '@wells-nelson/displays';
	import { untrack } from 'svelte';
	import TextField from '../TextField.svelte';
	import Toggle from '../Toggle.svelte';
	import {
		capitalize,
		errorText,
		type CloudStatus,
		type ContainerLocation,
		type Member,
		type MembersApi,
		type Nouns,
		type Role
	} from './types.js';

	/**
	 * The pencil menu of a container: rename, "open when the app starts", cloud-enabled toggle
	 * (with a disconnect warning), and delete or leave. A shared cloud container is left rather
	 * than deleted while other owners remain (without roles every member counts as an owner).
	 */
	let {
		containerId,
		name: currentName,
		location,
		ready = true,
		role = 'owner',
		roles = false,
		cloud,
		members: api,
		nouns,
		signInHref,
		contentsLabel = 'everything in it',
		localOnlyReason,
		isDefault,
		ondefaultchange,
		onrename,
		onmakecloud,
		onmakelocal,
		ondelete,
		onleave,
		onclose
	}: {
		containerId: string;
		name: string;
		/** Undefined once the container is gone (deleted, or moved under a new id); the modal closes. */
		location: ContainerLocation | undefined;
		ready?: boolean;
		role?: Role;
		roles?: boolean;
		cloud: CloudStatus;
		members: Pick<MembersApi, 'fetchMembers'>;
		nouns: Nouns;
		signInHref: string;
		/** What gets deleted along with it, e.g. "all its tasks and notes". */
		contentsLabel?: string;
		/**
		 * Why this container has to stay local-only (e.g. built-in sample data). The cloud option
		 * is replaced by this text while it is local.
		 */
		localOnlyReason?: string;
		isDefault: boolean;
		ondefaultchange: (isDefault: boolean) => void;
		onrename: (name: string) => void;
		onmakecloud: () => Promise<unknown>;
		onmakelocal: () => Promise<unknown>;
		ondelete: () => Promise<unknown>;
		onleave: () => Promise<unknown>;
		onclose: () => void;
	} = $props();

	const Singular = $derived(capitalize(nouns.singular));
	const isCloud = $derived(location === 'cloud');
	const isOwner = $derived(!roles || role === 'owner');
	const signedIn = $derived(!!cloud.user);

	let open = $state(true);
	// svelte-ignore state_referenced_locally
	let name = $state(currentName);
	let error = $state<string | null>(null);
	let busy = $state(false);

	function close() {
		open = false;
		onclose();
	}

	$effect(() => {
		if (ready && !location && !busy) close();
	});

	function save(e: SubmitEvent) {
		e.preventDefault();
		const next = name.trim();
		if (location && isOwner && next && next !== currentName) onrename(next);
		close();
	}

	// ------------------------------------------------ members (decides delete vs. leave)
	let list = $state<Member[] | null>(null);
	const others = $derived((list ?? []).filter((m) => m.email !== cloud.email));
	const otherOwners = $derived(others.filter((m) => !roles || m.role === 'owner').length);

	$effect(() => {
		if (!isCloud || !signedIn || !cloud.online) return;
		// Only the conditions above should re-run this, not state the API happens to read.
		untrack(
			() =>
				void api
					.fetchMembers(containerId)
					.then((m) => (list = m))
					.catch(() => (list = null))
		);
	});

	// ------------------------------------------------ cloud / local
	let confirmLocal = $state(false);
	let cloudToggle = $state(false);
	// Mirror the real state whenever no swap is pending (cancelled or failed swaps snap back).
	$effect(() => {
		if (!confirmLocal && !busy) cloudToggle = isCloud;
	});

	async function run(fn: () => Promise<unknown>) {
		busy = true;
		error = null;
		try {
			await fn();
		} catch (err) {
			error = errorText(err);
		} finally {
			busy = false;
		}
	}

	const localMessage = $derived(
		`This disconnects “${currentName}” from the copies on your other devices` +
			(others.length > 0 ? ' and from everyone it’s shared with' : '') +
			'. From then on, changes made here won’t reach them and theirs won’t reach you.\n\n' +
			(others.length > 0
				? `Because it’s shared, the cloud ${nouns.singular} stays for the others; you get a separate local-only copy and leave it.`
				: 'The cloud copy is deleted, so it also disappears from your other devices. This device keeps it.')
	);

	// ------------------------------------------------ delete / leave
	let confirmDelete = $state(false);
	let confirmLeave = $state(false);
	/** Non-owners can only leave; owners leave instead of deleting while other owners remain. */
	const leaveOnly = $derived(isCloud && (!isOwner || otherOwners > 0));

	const doDelete = () =>
		run(async () => {
			await ondelete();
			close();
		});
	const doLeave = () =>
		run(async () => {
			await onleave();
			close();
		});
</script>

<Modal bind:open title={`Edit ${nouns.singular}`} {onclose}>
	<form id={`edit-${containerId}`} onsubmit={save}>
		{#if isOwner}
			<TextField label={`${Singular} name`} bind:value={name} enterkeyhint="done" />
		{:else}
			<p class="muted small">
				You're {role === 'editor' ? 'an editor' : 'a viewer'} on “{currentName}”. Only owners can rename it.
			</p>
		{/if}
	</form>

	<Toggle
		label={`Open this ${nouns.singular} when the app starts`}
		checked={isDefault}
		onchange={(on) => ondefaultchange(on)}
	/>

	<section class="group">
		<h3>Sync</h3>
		{#if localOnlyReason && !isCloud}
			<p class="muted small"><Icon name="wifi-off" size={16} /> {localOnlyReason}</p>
		{:else if signedIn}
			<Toggle
				label="Cloud-enabled"
				bind:checked={cloudToggle}
				disabled={busy}
				onchange={(on) => (on ? run(onmakecloud) : (confirmLocal = true))}
			/>
			<p class="muted small">
				{#if isCloud}
					Synced to your account{cloud.hasPending(containerId) ? ' — changes are waiting to upload' : ''}.
				{:else}
					Only on this device. Turn on to sync{cloud.online ? '' : ' (uploads once you are back online)'}.
				{/if}
			</p>
		{:else}
			<p class="muted small">
				<Icon name="wifi-off" size={16} /> Local-only. <a href={signInHref}>Sign in</a> to sync and share {nouns.plural}.
			</p>
		{/if}
	</section>

	{#if error}<p class="error">{error}</p>{/if}

	{#if leaveOnly}
		<Button
			variant="ghost"
			onclick={() => (confirmLeave = true)}
			disabled={busy || !cloud.online}
			style="align-self:flex-start;color:var(--danger)"
		>
			Leave {nouns.singular}
		</Button>
		{#if isOwner}
			<p class="muted small">
				{roles ? 'Other owners remain' : 'It’s shared'}, so the {nouns.singular} stays for them.
			</p>
		{/if}
	{:else}
		<Button
			variant="ghost"
			icon="trash"
			onclick={() => (confirmDelete = true)}
			disabled={busy || (isCloud && !cloud.online)}
			style="align-self:flex-start;color:var(--danger)"
		>
			Delete {nouns.singular}
		</Button>
	{/if}
	{#if isCloud && !cloud.online}
		<p class="muted small">Reconnect to delete or leave a cloud-enabled {nouns.singular}.</p>
	{/if}

	{#snippet footer()}
		<Button onclick={close}>Cancel</Button>
		<Button variant="primary" type="submit" form={`edit-${containerId}`}>Save</Button>
	{/snippet}
</Modal>

<ConfirmDialog
	bind:open={confirmLocal}
	title={`Disconnect this ${nouns.singular}?`}
	message={localMessage}
	confirmLabel="Make local-only"
	danger
	onconfirm={() => run(onmakelocal)}
/>

<ConfirmDialog
	bind:open={confirmDelete}
	title={`Delete this ${nouns.singular}?`}
	message={`“${currentName}” and ${contentsLabel} will be permanently deleted${others.length ? ' for everyone it is shared with' : ''}.`}
	confirmLabel={`Delete ${nouns.singular}`}
	danger
	onconfirm={doDelete}
/>

<ConfirmDialog
	bind:open={confirmLeave}
	title={`Leave this ${nouns.singular}?`}
	message={`“${currentName}” is shared, so it stays for the others. It will be removed from your account and this device.` +
		(roles ? ' Ask an owner to share it again if you need it back.' : '')}
	confirmLabel={`Leave ${nouns.singular}`}
	danger
	onconfirm={doLeave}
/>

<style>
	.group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	h3 {
		margin: 0;
		font-size: 0.95rem;
	}
	.small {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.45;
	}
	.small :global(.icon) {
		display: inline;
		vertical-align: -3px;
	}
	.error {
		margin: 0;
		color: var(--danger);
	}
</style>
