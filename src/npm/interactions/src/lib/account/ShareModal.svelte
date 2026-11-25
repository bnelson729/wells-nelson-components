<script lang="ts">
	import { Badge, Button, ErrorMessage, IconButton, Modal, userError } from '@wells-nelson/displays';
	import { untrack } from 'svelte';
	import Segmented from '../Segmented.svelte';
	import {
		EMAIL_PATTERN,
		ROLE_OPTIONS,
		type CloudStatus,
		type ContainerLocation,
		type Member,
		type MembersApi,
		type Nouns,
		type Role
	} from './types.js';

	/**
	 * Who a container is shared with: invite by email, active / pending members, remove members.
	 * Offers sign-in or making the container cloud-enabled first. With `roles`, owners pick a role
	 * per member and the last owner can't be removed or demoted.
	 */
	let {
		containerId,
		name,
		location,
		ready = true,
		role = 'owner',
		roles = false,
		cloud,
		members: api,
		nouns,
		appName,
		signInHref,
		signInPitch,
		description,
		localOnlyReason,
		inviteHint,
		onmakecloud,
		onclose
	}: {
		containerId: string;
		name: string;
		/** Undefined once the container is gone (deleted, or moved under a new id); the modal closes. */
		location: ContainerLocation | undefined;
		/** False while the app is still loading its containers (don't treat "missing" as gone). */
		ready?: boolean;
		/** This user's role on the container (ignored without `roles`). */
		role?: Role;
		roles?: boolean;
		cloud: CloudStatus & { setRole?(containerId: string, role: Role): void };
		members: MembersApi;
		nouns: Nouns;
		appName: string;
		signInHref: string;
		signInPitch?: string;
		/** Who can do what, shown above the invite form. */
		description?: string;
		/**
		 * Why this container has to stay local-only (e.g. built-in sample data). The cloud option
		 * is replaced by this text while it is local.
		 */
		localOnlyReason?: string;
		/** Under the email field, e.g. which address to use when sign-in is Google only. */
		inviteHint?: string;
		onmakecloud: () => Promise<unknown>;
		onclose: () => void;
	} = $props();

	const isCloud = $derived(location === 'cloud');
	const isOwner = $derived(!roles || role === 'owner');
	const signedIn = $derived(!!cloud.user);
	const uploaded = $derived(isCloud && !cloud.hasPending(containerId));

	let open = $state(true);
	let list = $state<Member[] | null>(null);
	let error = $state<unknown>(null);
	let errorAction = $state('');
	/** The last address shared with, for the "Shared with …" status. */
	let sharedWith = $state<string | null>(null);
	const emailId = $props.id();
	let email = $state('');
	let inviteRole = $state<Role>('viewer');
	let busy = $state(false);

	const others = $derived((list ?? []).filter((m) => m.email !== cloud.email));
	/** With roles everyone is listed (including you, to show your role); without, only the others. */
	const shown = $derived(roles ? (list ?? []) : others);
	const ownerCount = $derived((list ?? []).filter((m) => m.role === 'owner').length);
	const emailValid = $derived(EMAIL_PATTERN.test(email.trim()));
	const isLastOwner = (m: Member) => roles && m.role === 'owner' && ownerCount <= 1;

	const pitch = $derived(signInPitch ?? `Sign in to share ${nouns.plural} with other people.`);
	const explainer = $derived(
		description ??
			(roles
				? `Viewers can see everything. Editors can also make changes. Owners can also rename or delete the ${nouns.singular} and manage sharing.`
				: `People you share with can do everything you can, including renaming and deleting the ${nouns.singular}.`)
	);

	function close() {
		open = false;
		onclose();
	}

	$effect(() => {
		if (ready && !location && !busy) close();
	});

	async function load() {
		if (!isCloud || !signedIn) return;
		if (!cloud.online) {
			error = userError("You're offline. Sharing details load once you're back online.");
			return;
		}
		try {
			error = null;
			list = await api.fetchMembers(containerId);
			const me = list.find((m) => m.email === cloud.email);
			if (roles && me?.role) cloud.setRole?.(containerId, me.role);
		} catch (err) {
			error = err;
			errorAction = "load who it's shared with";
		}
	}

	// Reload when connectivity or the location changes, not on whatever state `load` happens to read.
	$effect(() => {
		void cloud.online;
		void isCloud;
		void untrack(load);
	});

	async function act(fn: () => Promise<unknown>, action: string) {
		busy = true;
		error = null;
		sharedWith = null;
		try {
			await fn();
		} catch (err) {
			error = err;
			errorAction = action;
		} finally {
			busy = false;
			await load();
		}
	}

	function invite(e: SubmitEvent) {
		e.preventDefault();
		if (!emailValid) return;
		const address = email.trim();
		void act(async () => {
			await api.inviteMember(containerId, email, roles ? inviteRole : undefined);
			email = '';
			inviteRole = 'viewer';
			sharedWith = address;
		}, `share with ${address}`);
	}
</script>

<Modal bind:open title={`Share “${name}”`} {onclose}>
	{#if localOnlyReason && !isCloud}
		<p>{localOnlyReason}</p>
	{:else if !cloud.configured}
		<p class="muted">Sharing isn't available because this version of {appName} can't sign in.</p>
	{:else if !signedIn}
		<p>{pitch}</p>
		<a href={signInHref} onclick={close}>Sign in to share</a>
	{:else if !isCloud}
		<p>Only cloud-enabled {nouns.plural} can be shared. This one is only on this device.</p>
		<Button
			variant="solid"
			tone="accent"
			icon="cloud"
			onclick={() => act(onmakecloud, `make the ${nouns.singular} cloud-enabled`)}
			disabled={busy}>Make cloud-enabled</Button
		>
	{:else}
		<p class="muted text-sm">{explainer}</p>

		{#if isOwner}
			{#if !uploaded}
				<p class="muted text-sm">Sharing is available once this {nouns.singular} has synced.</p>
			{:else}
				<label class="invite-label" for={emailId}>Email address to share with</label>
				<form class="invite" class:with-role={roles} onsubmit={invite}>
					<input
						id={emailId}
						type="email"
						placeholder="name@example.com"
						bind:value={email}
						aria-describedby={`${emailId}-hint`}
					/>
					{#if roles}
						<Segmented label="Role for the invite" bind:value={inviteRole} options={ROLE_OPTIONS} />
					{/if}
					<Button
						variant="solid"
						tone="accent"
						type="submit"
						icon="share"
						disabled={!emailValid || busy || !cloud.online}>Share</Button
					>
				</form>
				<p id={`${emailId}-hint`} class="muted text-sm">
					They'll see “{name}” the next time they sign in to {appName} with this email. We don't send them an email, so let
					them know.{inviteHint ? ` ${inviteHint}` : ''}
				</p>
				{#if sharedWith}<p class="text-sm" role="status">Shared with {sharedWith}.</p>{/if}
			{/if}
		{:else}
			<p class="muted text-sm">Only owners can change who this {nouns.singular} is shared with.</p>
		{/if}

		{#if shown.length > 0}
			<ul class="members">
				{#each shown as m (m.id)}
					{@const me = m.email === cloud.email}
					<li>
						<div class="who">
							<span class="email">{m.email}{me ? ' (you)' : ''}</span>
							{#if m.active === false}
								<Badge tone="warning">Pending</Badge>
							{:else if m.active && !roles}
								<Badge tone="accent">Active</Badge>
							{/if}
						</div>
						{#if roles && isOwner}
							<select
								aria-label={`Role for ${m.email}`}
								value={m.role}
								disabled={busy || !cloud.online || isLastOwner(m) || !api.setMemberRole}
								title={isLastOwner(m)
									? `A ${nouns.singular} needs at least one owner. Make someone else an owner first.`
									: undefined}
								onchange={(e) =>
									act(
										() => api.setMemberRole!(m.id, (e.currentTarget as HTMLSelectElement).value as Role),
										`change ${m.email}'s role`
									)}
							>
								{#each ROLE_OPTIONS as r (r.value)}<option value={r.value}>{r.label}</option>{/each}
							</select>
						{:else if roles}
							<span class="role">{ROLE_OPTIONS.find((r) => r.value === m.role)?.label}</span>
						{/if}
						{#if isOwner && !me}
							<IconButton
								icon="x"
								label={`Stop sharing with ${m.email}`}
								disabled={busy || !cloud.online || isLastOwner(m)}
								onclick={() => act(() => api.removeMember(m.id), `stop sharing with ${m.email}`)}
							/>
						{/if}
					</li>
				{/each}
			</ul>
			{#if roles && isOwner && ownerCount <= 1}
				<p class="muted text-sm">You're the only owner. To step down, make someone else an owner first.</p>
			{/if}
			{#if shown.some((m) => m.active === false)}
				<p class="muted text-sm">
					Pending means they haven't signed in to {appName} since you shared it; they get the {nouns.singular} the first time
					they do.
				</p>
			{/if}
		{:else if list}
			<p class="muted text-sm">Not shared with anyone yet.</p>
		{/if}
	{/if}
	<ErrorMessage {error} action={errorAction} />

	{#snippet footer()}
		<Button onclick={close}>Done</Button>
	{/snippet}
</Modal>

<style>
	p {
		margin: 0;
		line-height: 1.5;
	}
	.invite {
		display: flex;
		gap: var(--space-2);
	}
	.invite input {
		flex: 1;
		min-width: 0;
	}
	.invite.with-role {
		flex-direction: column;
		gap: 0.6rem;
	}
	.invite :global(legend) {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
	.invite-label {
		font-weight: var(--weight-semibold);
		font-size: var(--text-sm);
		margin-bottom: -0.25rem;
	}
	.members {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	.members li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-1) var(--space-1) 0.9rem;
		min-height: 3rem;
	}
	.members li + li {
		border-top: 1px solid var(--border);
	}
	.who {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-2);
	}
	.email {
		overflow-wrap: anywhere;
	}
	.role {
		color: var(--muted);
		padding-right: var(--space-3);
	}
</style>
