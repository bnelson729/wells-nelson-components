<script lang="ts">
	import { Modal } from '@wells-nelson/displays';
	import type { Overlay } from '../lib/overlay.svelte.js';

	let { overlay, seen }: { overlay: Overlay<{ id: string; name: string }>; seen: string[] } = $props();
</script>

<Modal bind:open={overlay.isOpen} onclosed={overlay.closed} title="Edit task">
	{#if overlay.value}
		{#key overlay.value.id}
			<!-- Reads the value while it renders: a cleared value would throw here. -->
			<p>{(seen.push(overlay.value.name), overlay.value.name)}</p>
		{/key}
	{/if}
</Modal>
