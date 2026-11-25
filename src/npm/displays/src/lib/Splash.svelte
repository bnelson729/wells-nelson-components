<script lang="ts">
	/** Startup placeholder shown while the local database opens. */
	let { text, label = 'Loading' }: { text: string; /** Read out by assistive tech. */ label?: string } = $props();
</script>

<div class="splash" role="status">
	<span aria-hidden="true">{text}</span>
	<span class="visually-hidden">{label}</span>
</div>

<style>
	.splash {
		display: grid;
		place-items: center;
		min-height: 100dvh;
		font-size: 2.5rem;
		font-weight: var(--weight-heavy);
		color: var(--accent-text);
	}
</style>
