<script lang="ts">
	import { Button } from '@wells-nelson/displays';
	import { Segmented, Toggle } from '@wells-nelson/interactions';
	import {
		AccountPanel,
		ContainerEditModal,
		LocalItemsPrompt,
		ShareModal,
		type ContainerLocation,
		type Role
	} from '@wells-nelson/interactions/account';
	import { MockCloud } from '../mock-cloud.svelte';
	import Panel from '../Panel.svelte';

	const cloud = new MockCloud();
	const nouns = { singular: 'project', plural: 'projects' };
	const projects = [
		{ id: 'pr1', name: 'Website refresh' },
		{ id: 'pr2', name: 'Spring fundraiser' },
		{ id: 'pr3', name: 'Team offsite' }
	];
	const nameOf = (id: string) => projects.find((p) => p.id === id)?.name ?? 'Deleted project';

	let roles = $state(true);
	let role = $state<Role>('owner');
	let location = $state<ContainerLocation>('cloud');
	let emailLink = $state(true);
	let isDefault = $state(false);
	let modal = $state<'share' | 'edit' | 'prompt' | null>(null);
	let containerName = $state('Website refresh');

	const pendingProject = $derived(cloud.pendingIds.includes('pr1'));
	const returnUrl = () => `${window.location.origin}${window.location.pathname}#/account`;
</script>

<Panel title="Mock sync state" note="Every switch feeds the components below through the same interfaces data-storage implements.">
	<div class="grid">
		<Toggle label="Cloud configured" bind:checked={cloud.configured} />
		<Toggle label="Signed in" bind:checked={cloud.signedIn} />
		<Toggle label="Online" bind:checked={cloud.online} />
		<Toggle label="Syncing" bind:checked={cloud.active} />
		<Toggle label="Session expired" bind:checked={cloud.sessionExpired} />
		<Toggle
			label="“Website refresh” has unsynced changes"
			checked={pendingProject}
			onchange={(on) => (cloud.pendingIds = on ? ['pr1'] : [])}
		/>
		<Toggle label="Email sign-in link" bind:checked={emailLink} />
		<Toggle label="Fail the next call" bind:checked={cloud.failNext} />
	</div>
	<div class="row">
		<Button onclick={() => (cloud.error = cloud.error ? null : 'Mock: replication timed out')}>
			{cloud.error ? 'Clear' : 'Set'} sync error
		</Button>
	</div>
</Panel>

<Panel title="AccountPanel" note="The profile page body. Its state follows the switches above.">
	<AccountPanel {cloud} account={cloud} {nouns} appName="Demo" {returnUrl} pendingName={nameOf} {emailLink} />
</Panel>

<Panel title="Sharing and editing a container">
	<div class="grid">
		<Toggle label="Roles (viewer / editor / owner)" bind:checked={roles} />
		<Toggle label="Default container" bind:checked={isDefault} />
	</div>
	<Segmented
		label="Where the project lives"
		bind:value={location}
		options={[
			{ value: 'local', label: 'Local only' },
			{ value: 'cloud', label: 'Cloud' }
		]}
	/>
	{#if roles}
		<Segmented
			label="My role"
			bind:value={role}
			options={[
				{ value: 'viewer', label: 'Viewer' },
				{ value: 'editor', label: 'Editor' },
				{ value: 'owner', label: 'Owner' }
			]}
		/>
	{/if}
	<p class="muted small">
		Members: {cloud.members.map((m) => `${m.email} (${roles ? m.role : 'member'}${m.active ? '' : ', pending'})`).join(', ')}
	</p>
	<div class="row">
		<Button icon="share" onclick={() => (modal = 'share')}>ShareModal</Button>
		<Button icon="pencil" onclick={() => (modal = 'edit')}>ContainerEditModal</Button>
		<Button icon="cloud" onclick={() => (modal = 'prompt')}>LocalItemsPrompt</Button>
	</div>
</Panel>

<Panel title="Calls" note="What the components asked the sync layer to do, newest first.">
	<pre>{cloud.log.join('\n') || 'Nothing yet.'}</pre>
</Panel>

{#if modal === 'share'}
	<ShareModal
		containerId="pr1"
		name={containerName}
		{location}
		{role}
		{roles}
		{cloud}
		members={cloud}
		{nouns}
		appName="Demo"
		signInHref="#/account"
		onmakecloud={async () => {
			await cloud.action('makeCloud(pr1)')();
			location = 'cloud';
		}}
		onclose={() => (modal = null)}
	/>
{:else if modal === 'edit'}
	<ContainerEditModal
		containerId="pr1"
		name={containerName}
		{location}
		{role}
		{roles}
		{cloud}
		members={cloud}
		{nouns}
		signInHref="#/account"
		contentsLabel="all its tasks and notes"
		{isDefault}
		ondefaultchange={(on) => ((isDefault = on), cloud.note(`default → ${on}`))}
		onrename={(n) => ((containerName = n), cloud.note(`rename → ${n}`))}
		onmakecloud={async () => {
			await cloud.action('makeCloud(pr1)')();
			location = 'cloud';
		}}
		onmakelocal={async () => {
			await cloud.action('makeLocal(pr1)')();
			location = 'local';
		}}
		ondelete={cloud.action('deleteContainer(pr1)')}
		onleave={cloud.action('leaveContainer(pr1)')}
		onclose={() => (modal = null)}
	/>
{:else if modal === 'prompt'}
	<LocalItemsPrompt
		items={projects}
		{nouns}
		onmakecloud={(id) => cloud.action(`makeCloud(${id})`)()}
		onprompted={(ids) => ((modal = null), cloud.note(`markPrompted(${ids.join(', ')})`))}
	/>
{/if}

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
		gap: 0.5rem 1rem;
	}
	.small {
		margin: 0;
		font-size: 0.85rem;
	}
</style>
