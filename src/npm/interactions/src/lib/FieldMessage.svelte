<script lang="ts">
	/** A field's error (announced) or hint, under the control; `id` is what the control's aria-describedby names. */
	let { id, error, hint }: { id: string; error?: string | null; hint?: string } = $props();
</script>

{#if error}<p {id} class="field-message error" role="alert">{error}</p>
{:else if hint}<p {id} class="field-message hint">{hint}</p>{/if}

<style>
	.field-message {
		margin: 0;
		font-size: var(--text-sm);
	}
	.error {
		color: var(--danger);
	}
	.hint {
		color: var(--muted);
	}
</style>
