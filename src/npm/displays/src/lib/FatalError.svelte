<script lang="ts">
	import Button from './Button.svelte';

	/**
	 * Full-page error for when the app can't start, e.g. its storage couldn't be opened. The
	 * browser's own error text sits behind "Details".
	 */
	let {
		error,
		title = "This app can't start",
		message = "This app couldn't open its storage on this device.",
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
	<p>{message}</p>
	{#if hint}<p class="muted">{hint}</p>{/if}
	{#if error}
		<details class="muted">
			<summary>Details</summary>
			<p>{error}</p>
		</details>
	{/if}
	{#if retryLabel}
		<Button variant="solid" tone="accent" icon="refresh" onclick={() => location.reload()}>{retryLabel}</Button>
	{/if}
</main>
