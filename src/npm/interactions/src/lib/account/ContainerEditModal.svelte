<script lang="ts">
	import { Button, ConfirmDialog, ErrorMessage, Icon, Modal } from '@wells-nelson/displays';
	import { untrack } from 'svelte';
	import TextField from '../TextField.svelte';
	import Toggle from '../Toggle.svelte';
	import {
		capitalize,
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
	let error = $state<unknown>(null);
	let errorAction = $state('');
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

	async function run(fn: () => Promise<unknown>, action: string) {
		busy = true;
		error = null;
		try {
			await fn();
		} catch (err) {
			error = err;
			errorAction = action;
		} finally {
			busy = false;
		}
	}

	const localMessage = $derived(
		`This disconnects “${currentName}” from the copies on your other devices` +
			(others.length > 0 ? " and from everyone it's shared with" : '') +
			". From then on, changes made here won't reach them and theirs won't reach you.\n\n" +
			(others.length > 0
				? `Because it's shared, the synced ${nouns.singular} stays for the others; you get a separate local-only copy and leave it.`
				: 'The copy in your account is deleted, so it also disappears from your other devices. This device keeps it.')
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
		}, `delete the ${nouns.singular}`);
	const doLeave = () =>
		run(async () => {
			await onleave();
			close();
		}, `leave the ${nouns.singular}`);
</script>

<Modal bind:open title={`Edit ${nouns.singular}`} {onclose}>
	<form id={`edit-${containerId}`} onsubmit={save}>
		{#if isOwner}
			<TextField label={`${Singular} name`} bind:value={name} enterkeyhint="done" />
		{:else}
			<p class="muted text-sm">
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
			<p class="muted text-sm"><Icon name="wifi-off" size={16} /> {localOnlyReason}</p>
		{:else if signedIn}
			<Toggle
				label="Cloud-enabled"
				bind:checked={cloudToggle}
				disabled={busy}
				onchange={(on) => (on ? run(onmakecloud, `make the ${nouns.singular} cloud-enabled`) : (confirmLocal = true))}
			/>
			<p class="muted text-sm">
				{#if isCloud}
					Synced to your account{cloud.hasPending(containerId) ? ' — changes waiting to sync' : ''}.
				{:else}
					Only on this device. Turn on to sync it to your account, so it's on your other devices and can be shared{cloud.online
						? ''
						: " (it syncs once you're back online)"}.
				{/if}
			</p>
		{:else}
			<p class="muted text-sm">
				<Icon name="wifi-off" size={16} /> Local-only. <a href={signInHref}>Sign in</a> to sync and share {nouns.plural}.
			</p>
		{/if}
	</section>

	<ErrorMessage {error} action={errorAction} />

	{#if leaveOnly}
		<Button
			variant="danger-ghost"
			onclick={() => (confirmLeave = true)}
			disabled={busy || !cloud.online}
			style="align-self:flex-start"
		>
			Leave {nouns.singular}
		</Button>
		{#if isOwner}
			<p class="muted text-sm">
				{roles ? 'Other owners remain' : "It's shared"}, so the {nouns.singular} stays for them.
			</p>
		{/if}
	{:else}
		<Button
			variant="danger-ghost"
			icon="trash"
			onclick={() => (confirmDelete = true)}
			disabled={busy || (isCloud && !cloud.online)}
			style="align-self:flex-start"
		>
			Delete {nouns.singular}
		</Button>
	{/if}
	{#if isCloud && !cloud.online}
		<p class="muted text-sm">
			You're offline. You can delete or leave a cloud-enabled {nouns.singular} once you're back online.
		</p>
	{/if}

	{#snippet footer()}
		<Button onclick={close}>Cancel</Button>
		<Button variant="primary" type="submit" form={`edit-${containerId}`}>Save</Button>
	{/snippet}
</Modal>

<ConfirmDialog
	bind:open={confirmLocal}
	title={`Make “${currentName}” local-only?`}
	message={localMessage}
	confirmLabel="Make local-only"
	busyLabel="Making local-only…"
	danger
	onconfirm={() => run(onmakelocal, `make the ${nouns.singular} local-only`)}
/>

<ConfirmDialog
	bind:open={confirmDelete}
	title={`Delete this ${nouns.singular}?`}
	message={`“${currentName}” and ${contentsLabel} will be deleted${others.length ? " for everyone it's shared with" : ''}. This can't be undone.`}
	confirmLabel={`Delete ${nouns.singular}`}
	busyLabel="Deleting…"
	danger
	onconfirm={doDelete}
/>

<ConfirmDialog
	bind:open={confirmLeave}
	title={`Leave this ${nouns.singular}?`}
	message={`“${currentName}” is shared, so it stays for the others. It will be removed from your account and this device.` +
		(roles ? ' Ask an owner to share it again if you need it back.' : '')}
	confirmLabel={`Leave ${nouns.singular}`}
	busyLabel="Leaving…"
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
	.text-sm {
		margin: 0;
		line-height: 1.45;
	}
	.text-sm :global(.icon) {
		display: inline;
		vertical-align: -3px;
	}
</style>
