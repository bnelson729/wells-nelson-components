<script lang="ts">
	import { Button, Modal } from '@wells-nelson/displays';
	import Checkbox from '../Checkbox.svelte';
	import { errorText, type Nouns } from './types.js';

	/**
	 * Shown after sign-in for local-only containers that were never offered before. Whatever isn't
	 * checked is never asked about again (the container's edit menu can still switch it).
	 */
	let {
		items,
		nouns,
		onmakecloud,
		onprompted
	}: {
		items: { id: string; name: string }[];
		nouns: Nouns;
		/** Make one container cloud-enabled. */
		onmakecloud: (id: string) => Promise<unknown>;
		/** Remember these were offered (checked or not) so they aren't asked about again. */
		onprompted: (ids: string[]) => void;
	} = $props();

	let open = $state(true);
	let selected = $state<Record<string, boolean>>({});
	let busy = $state(false);
	let error = $state<string | null>(null);

	async function submit() {
		busy = true;
		error = null;
		try {
			for (const item of items) if (selected[item.id]) await onmakecloud(item.id);
			onprompted(items.map((i) => i.id));
			open = false;
		} catch (err) {
			error = errorText(err);
		} finally {
			busy = false;
		}
	}

	function skip() {
		onprompted(items.map((i) => i.id));
		open = false;
	}
</script>

<Modal bind:open title={`Sync your local ${nouns.plural}?`} onclose={skip}>
	<p class="intro">
		These {nouns.plural} are only on this device. Check any you want cloud-enabled so they sync across your devices and
		can be shared.
	</p>
	<div class="items">
		{#each items as item (item.id)}
			<!-- Unchecked rows have no entry; bind:checked can't take undefined for a prop with a fallback. -->
			<Checkbox
				label={item.name}
				bind:checked={() => selected[item.id] ?? false, (on) => (selected[item.id] = on)}
			/>
		{/each}
	</div>
	{#if error}<p class="error">{error}</p>{/if}
	{#snippet footer()}
		<Button onclick={skip} disabled={busy}>Not now</Button>
		<Button variant="primary" onclick={submit} disabled={busy}>Make selected cloud-enabled</Button>
	{/snippet}
</Modal>

<style>
	.intro {
		margin: 0;
		line-height: 1.5;
	}
	.items {
		display: flex;
		flex-direction: column;
	}
	.error {
		color: var(--danger);
		margin: 0;
	}
</style>
