<script lang="ts">
	/** Startup placeholder shown while the local database opens. */
	let { text }: { text: string } = $props();
</script>

<div class="splash" aria-busy="true">{text}</div>

<style>
	.splash {
		display: grid;
		place-items: center;
		min-height: 100dvh;
		font-size: 2.5rem;
		font-weight: 800;
		color: var(--accent-text);
	}
</style>
