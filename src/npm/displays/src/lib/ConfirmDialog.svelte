<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';
	import ErrorMessage from './ErrorMessage.svelte';
	import Modal from './Modal.svelte';

	/**
	 * Asks before doing something. Opens with focus on Cancel. Give `message` as text, or
	 * `children` for richer content (a list, a link). `confirmLabel` names the action ("Delete
	 * store"), never a bare "OK". When `onconfirm` throws, the dialog stays open and says what went
	 * wrong (an `ErrorMessage`), so the action can be tried again or cancelled.
	 */
	let {
		open = $bindable(false),
		title,
		message,
		children,
		confirmLabel,
		busyLabel,
		errorAction,
		danger = false,
		onconfirm
	}: {
		open?: boolean;
		title: string;
		message?: string;
		children?: Snippet;
		/** The confirm button: the verb and its object, e.g. "Delete store". */
		confirmLabel: string;
		/** The confirm button's label while `onconfirm` runs, e.g. "Deleting…". */
		busyLabel?: string;
		/** What failed, for an error without a message of its own: "delete the store". */
		errorAction?: string;
		danger?: boolean;
		onconfirm: () => void | Promise<void>;
	} = $props();

	let busy = $state(false);
	let error = $state<unknown>(null);

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
			error = err;
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
	<ErrorMessage {error} action={errorAction} />
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
