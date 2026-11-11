<script lang="ts">
	import { Button } from '@wells-nelson/displays';
	import { Segmented, Toggle } from '@wells-nelson/interactions';
	import {
		AccountPanel,
		ContainerEditModal,
		DeviceDataCard,
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
	let sample = $state(false);
	const localOnlyReason = $derived(sample ? 'This is the built-in sample project. It stays on this device.' : undefined);
	let modal = $state<'share' | 'edit' | 'prompt' | null>(null);
	let containerName = $state('Website refresh');

	const pendingProject = $derived(cloud.pendingIds.includes('pr1'));
	const returnUrl = () => `${window.location.origin}${window.location.pathname}#/account`;

	/** DeviceDataCard: the browser's answer to "keep this data?", and a log of exports / imports. */
	let keeps = $state<'yes' | 'no' | 'unknown'>('no');
	const persisted = $derived(keeps === 'yes' ? true : keeps === 'no' ? false : null);
	let dataLog = $state<string[]>([]);
	const log = (line: string) => (dataLog = [line, ...dataLog].slice(0, 5));
	async function mockExport(items: { id: string; location: ContainerLocation }[]) {
		log(`Exported ${items.map((i) => nameOf(i.id)).join(', ')}`);
		return { format: 'wells-nelson-containers', version: 1, app: 'demo', containers: items };
	}
	async function mockImport(data: unknown) {
		if (cloud.failNext) {
			cloud.failNext = false;
			throw new Error('Mock: this file is not a backup of this app.');
		}
		const count = (data as { containers?: unknown[] })?.containers?.length ?? 0;
		log(`Imported ${count} project(s)`);
		return Array.from({ length: count }, (_, i) => `new${i}`);
	}
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

<Panel title="DeviceDataCard" note="Storage status and backups on the profile. Export downloads a mock file; import it again (Fail the next call makes the import fail).">
	<Segmented
		label="Browser keeps the data"
		bind:value={keeps}
		options={[
			{ value: 'yes', label: 'Permanently' },
			{ value: 'no', label: 'May clear it' },
			{ value: 'unknown', label: "Doesn't say" }
		]}
	/>
	<DeviceDataCard
		{nouns}
		items={projects.map((p, i) => ({ ...p, location: i === 0 ? 'cloud' : 'local' }))}
		{persisted}
		onpersist={async () => ((keeps = 'yes'), true)}
		onexport={mockExport}
		onimport={mockImport}
		filename="demo"
	/>
	{#if dataLog.length}<p class="log">{dataLog.join(' · ')}</p>{/if}
</Panel>

<Panel title="Sharing and editing a container">
	<div class="grid">
		<Toggle label="Roles (viewer / editor / owner)" bind:checked={roles} />
		<Toggle label="Default container" bind:checked={isDefault} />
		<Toggle label="Must stay local-only (localOnlyReason)" bind:checked={sample} />
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
		{localOnlyReason}
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
		{localOnlyReason}
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
