<script lang="ts">
	import type { Snippet } from 'svelte';

	/** A small heading between the lines of a `.lines` list, naming the group below it. */
	let { children, class: className }: { children: Snippet; class?: string } = $props();
</script>

<li class={['line-heading', className]}>{@render children()}</li>
