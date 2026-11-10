<script lang="ts">
	/** Full-page error for when the app can't start, e.g. the local database couldn't be opened. */
	let {
		error,
		title = 'Something went wrong',
		message = "The local database couldn't be opened:",
		hint = 'Private browsing modes sometimes block storage. Try a normal window.'
	}: {
		error: string;
		title?: string;
		message?: string;
		hint?: string;
	} = $props();
</script>

<main class="page">
	<h1 class="page-title">{title}</h1>
	<p>{message} {error}</p>
	{#if hint}<p class="muted">{hint}</p>{/if}
</main>
