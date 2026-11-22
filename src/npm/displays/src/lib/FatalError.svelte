<script lang="ts">
	import Button from './Button.svelte';

	/** Full-page error for when the app can't start, e.g. the local database couldn't be opened. */
	let {
		error,
		title = 'Something went wrong',
		message = "The local database couldn't be opened:",
		hint = 'Private browsing modes sometimes block storage. Try a normal window.',
		retryLabel = 'Try again'
	}: {
		error: string;
		title?: string;
		message?: string;
		hint?: string;
		/** Label of the button that reloads the page; empty for none. */
		retryLabel?: string;
	} = $props();
</script>

<main class="page">
	<h1 class="page-title">{title}</h1>
	<p>{message} {error}</p>
	{#if hint}<p class="muted">{hint}</p>{/if}
	{#if retryLabel}
		<Button variant="primary" icon="refresh" onclick={() => location.reload()}>{retryLabel}</Button>
	{/if}
</main>
