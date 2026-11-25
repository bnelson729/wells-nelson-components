<script lang="ts">
	import { errorText, isUserFacing, rawErrorText } from './text.js';

	/**
	 * An error in plain words, in `--danger`, read out when it appears. A `userError` shows its own
	 * message; a known technical one (network, session…) is translated; anything else reads
	 * "Couldn't {action}. Try again in a moment." The original text sits behind "Details" for
	 * support, unless the shown sentence already is it.
	 */
	let {
		error,
		action,
		text,
		role = 'alert',
		class: className
	}: {
		/** An Error, a message string, or anything thrown. Nothing is shown while it's null or undefined. */
		error: unknown;
		/** What failed, for the fallback sentence: "save the line" → "Couldn't save the line. …". */
		action?: string;
		/** The sentence to show instead of the computed one (the raw text still goes in Details). */
		text?: string;
		role?: 'alert' | 'status';
		/** Last resort: a class on the root element. */
		class?: string;
	} = $props();

	const shown = $derived(error == null ? '' : (text ?? errorText(error, action)));
	const raw = $derived(error == null || isUserFacing(error) ? '' : rawErrorText(error));
</script>

{#if shown}
	<div class={['error-message', className]}>
		<p class="error-text" {role}>{shown}</p>
		{#if raw && raw !== shown}
			<details>
				<summary>Details</summary>
				<p class="raw">{raw}</p>
			</details>
		{/if}
	</div>
{/if}

<style>
	.error-message {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.error-message p {
		margin: 0;
	}
	details {
		font-size: var(--text-sm);
		color: var(--muted);
	}
	summary {
		cursor: pointer;
		width: fit-content;
	}
	.raw {
		overflow-wrap: anywhere;
		user-select: text;
		-webkit-user-select: text;
	}
</style>
