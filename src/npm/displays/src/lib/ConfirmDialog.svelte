<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';
	import Modal from './Modal.svelte';

	/**
	 * Asks before doing something. Opens with focus on Cancel. Give `message` as text, or
	 * `children` for richer content (a list, a link). When `onconfirm` throws, the dialog stays open
	 * and shows the error's message, so the action can be tried again or cancelled.
	 */
	let {
		open = $bindable(false),
		title,
		message,
		children,
		confirmLabel = 'Confirm',
		busyLabel,
		danger = false,
		onconfirm
	}: {
		open?: boolean;
		title: string;
		message?: string;
		children?: Snippet;
		confirmLabel?: string;
		/** The confirm button's label while `onconfirm` runs, e.g. "Deleting…". */
		busyLabel?: string;
		danger?: boolean;
		onconfirm: () => void | Promise<void>;
	} = $props();

	let busy = $state(false);
	let error = $state<string | null>(null);

	// Each time it opens, it starts without the last attempt's error.
	$effect.pre(() => {
		if (open) error = null;
	});

	async function confirm() {
		busy = true;
		error = null;
		try {
			await onconfirm();
			open = false;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			busy = false;
		}
	}
</script>

<Modal bind:open {title} size="sm">
	{#if children}
		{@render children()}
	{:else if message}
		<p class="message">{message}</p>
	{/if}
	{#if error}<p class="error-text" role="alert">{error}</p>{/if}
	{#snippet footer()}
		<Button onclick={() => (open = false)}>Cancel</Button>
		<Button variant={danger ? 'danger' : 'primary'} onclick={confirm} {busy}>
			{busy && busyLabel ? busyLabel : confirmLabel}
		</Button>
	{/snippet}
</Modal>

<style>
	.message {
		margin: 0;
		line-height: 1.5;
		white-space: pre-line;
	}
</style>
