<script lang="ts">
	import Field from '../lib/Field.svelte';

	let { error }: { error?: string } = $props();
	let value = $state('');
</script>

<Field label="Starts" {error}>
	{#snippet children(control)}<input type="datetime-local" {...control} bind:value />{/snippet}
</Field>
