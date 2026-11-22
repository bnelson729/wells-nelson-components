<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';
	import Modal from './Modal.svelte';

	/**
	 * Asks before doing something. Opens with focus on Cancel. Give `message` as text, or
	 * `children` for richer content (a list, a link).
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

	async function confirm() {
		busy = true;
		try {
			await onconfirm();
			open = false;
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
