<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconButton from './IconButton.svelte';

	let {
		open = $bindable(false),
		title,
		children,
		footer,
		onclose,
		size = 'md'
	}: {
		open?: boolean;
		title: string;
		children: Snippet;
		footer?: Snippet;
		onclose?: () => void;
		/** sm: confirmations; md: forms (default); lg: near full width and height, for dense pickers. */
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});

	function handleClose() {
		if (open) {
			open = false;
			onclose?.();
		}
	}

	function onBackdrop(e: MouseEvent) {
		if (e.target === dialog) dialog?.close();
	}
</script>

<dialog bind:this={dialog} class="modal {size}" onclose={handleClose} onclick={onBackdrop} aria-label={title}>
	{#if open}
		<div class="panel">
			<header>
				<h2>{title}</h2>
				<IconButton icon="x" label="Close" onclick={() => dialog?.close()} />
			</header>
			<div class="body">
				{@render children()}
			</div>
			{#if footer}
				<footer>{@render footer()}</footer>
			{/if}
		</div>
	{/if}
</dialog>

<style>
	.modal {
		padding: 0;
		border: none;
		border-radius: var(--radius-lg);
		background: var(--surface);
		color: var(--text);
		width: min(34rem, calc(100vw - 2rem));
		max-height: min(46rem, calc(100dvh - 2rem));
		box-shadow: var(--shadow-lg);
	}
	.modal.lg {
		width: min(64rem, calc(100vw - 2rem));
		max-height: calc(100dvh - 2rem);
	}
	.modal.sm {
		width: min(24rem, calc(100vw - 2rem));
	}
	.modal::backdrop {
		background: rgb(0 0 0 / 0.45);
	}
	.panel {
		display: flex;
		flex-direction: column;
		max-height: inherit;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.75rem 0.75rem 0.25rem 1.25rem;
	}
	h2 {
		margin: 0;
		font-size: 1.15rem;
	}
	.body {
		padding: 0.5rem 1.25rem 1rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	footer {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: flex-end;
		padding: 0.75rem 1.25rem 1rem;
		border-top: 1px solid var(--border);
	}
</style>
