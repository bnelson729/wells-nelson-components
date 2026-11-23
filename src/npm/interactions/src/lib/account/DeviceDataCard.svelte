<script lang="ts">
	import { Button, ErrorMessage, Icon, plural } from '@wells-nelson/displays';
	import { capitalize, type ContainerLocation, type Nouns } from './types.js';

	/**
	 * "Data on this device": whether the browser keeps the app's data for good, and a JSON backup
	 * (export every container or one, import a file as new local-only copies). The app supplies
	 * the export and import (e.g. `ops.exportContainers` / `ops.importContainers` from
	 * `@wells-nelson/data-storage`).
	 */
	let {
		nouns,
		items,
		persisted,
		onpersist,
		onexport,
		onimport,
		filename
	}: {
		nouns: Nouns;
		/** Every container on this device, named and sorted by the app. */
		items: { id: string; name: string; location: ContainerLocation }[];
		/** True: kept until the user clears it. False: the browser may evict it. Null: unknown. */
		persisted: boolean | null;
		/** Ask the browser again to keep the data (from a click, which some browsers require). */
		onpersist?: () => Promise<boolean | null>;
		/** Build the backup of these containers (JSON-ready). */
		onexport: (items: { id: string; location: ContainerLocation }[]) => Promise<unknown>;
		/** Add the containers of a parsed backup file; resolves with how many were added. */
		onimport: (data: unknown) => Promise<string[]>;
		/** File name start, e.g. 'my-app' → `my-app-backup-2026-11-11.json`. */
		filename: string;
	} = $props();

	let busy = $state(false);
	let message = $state<string | null>(null);
	let error = $state<{ err: unknown; action: string } | null>(null);
	let fileInput = $state<HTMLInputElement>();
	let asking = $state(false);

	/** iOS Safari outside the home screen: data is cleared after 7 days without a visit. */
	const iosBrowserTab =
		typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone === false;

	function slug(name: string) {
		return (
			name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '') || nouns.singular
		);
	}

	async function download(which: typeof items, label: string) {
		busy = true;
		message = null;
		error = null;
		try {
			const data = await onexport(which.map(({ id, location }) => ({ id, location })));
			const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${filename}-${label}-${new Date().toISOString().slice(0, 10)}.json`;
			document.body.append(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		} catch (err) {
			error = { err, action: 'export' };
		} finally {
			busy = false;
		}
	}

	async function importFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		busy = true;
		message = null;
		error = null;
		try {
			let data: unknown;
			try {
				data = JSON.parse(await file.text());
			} catch {
				throw Object.assign(new Error('This file is not a backup of this app.'), { userFacing: true });
			}
			const added = await onimport(data);
			message = `Added ${plural(added.length, nouns.singular, nouns.plural)} to this device.`;
		} catch (err) {
			error = { err, action: 'import the backup' };
		} finally {
			busy = false;
		}
	}

	async function persist() {
		if (!onpersist) return;
		asking = true;
		try {
			await onpersist();
		} finally {
			asking = false;
		}
	}
</script>

<section class="card card-section" aria-labelledby="device-data-title">
	<h2 id="device-data-title">Data on this device</h2>
	<p class="text-sm storage">
		<Icon name={persisted ? 'check' : 'alert'} size={18} />
		<span>
			{#if persisted}
				Stored permanently: the browser keeps it until you clear it.
			{:else if persisted === false}
				The browser may clear it when space runs low{iosBrowserTab ? ', or after 7 days without a visit' : ''}.
			{:else}
				This browser doesn't say whether it keeps the data for good.
			{/if}
		</span>
	</p>
	{#if !persisted && iosBrowserTab}
		<p class="muted text-sm">Add the app to your Home Screen (Share → Add to Home Screen) to keep it for good.</p>
	{/if}
	{#if persisted === false && onpersist}
		<Button icon="check" onclick={persist} disabled={asking}
			>{asking ? 'Asking the browser…' : 'Keep data on this device'}</Button
		>
	{/if}

	<p class="muted text-sm">
		A backup file holds every {nouns.singular} you choose. Importing one adds its {nouns.plural} as new
		{nouns.plural} on this device only; nothing is replaced.
	</p>
	<div class="actions">
		<Button icon="download" onclick={() => download(items, 'backup')} disabled={busy || items.length === 0}>
			Export all {nouns.plural}
		</Button>
		<Button icon="upload" onclick={() => fileInput?.click()} disabled={busy}>Import a backup</Button>
		<input bind:this={fileInput} type="file" accept="application/json,.json" hidden onchange={importFile} />
	</div>
	{#if items.length > 1}
		<details>
			<summary class="text-sm">Export one {nouns.singular}</summary>
			<ul class="items">
				{#each items as item (item.id)}
					<li>
						<span>{item.name}</span>
						<Button
							variant="ghost"
							icon="download"
							onclick={() => download([item], slug(item.name))}
							disabled={busy}
							aria-label={`Export ${item.name}`}
						>
							Export
						</Button>
					</li>
				{/each}
			</ul>
		</details>
	{/if}
	{#if message}
		<p class="text-sm" role="status">{message}</p>
	{/if}
	{#if error}<ErrorMessage error={error.err} action={error.action} />{/if}
	{#if items.length === 0}
		<p class="muted text-sm">No {nouns.plural} to export yet. {capitalize(nouns.plural)} you add will appear here.</p>
	{/if}
</section>

<style>
	.storage {
		display: flex;
		align-items: flex-start;
		gap: 0.4rem;
	}
	.storage :global(svg) {
		flex: none;
		margin-top: 0.15rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	summary {
		cursor: pointer;
		min-height: var(--tap, 2.75rem);
		display: flex;
		align-items: center;
	}
	.items {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.items li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		border-top: 1px solid var(--border);
	}
	.items li span {
		min-width: 0;
		overflow-wrap: anywhere;
	}
</style>
