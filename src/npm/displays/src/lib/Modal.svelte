<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconButton from './IconButton.svelte';

	let {
		open = $bindable(false),
		title,
		children,
		footer,
		onclose,
		size = 'md',
		dismissible = true
	}: {
		open?: boolean;
		title: string;
		children: Snippet;
		footer?: Snippet;
		onclose?: () => void;
		/** sm: confirmations; md: forms (default); lg: near full width and height, for dense pickers. */
		size?: 'sm' | 'md' | 'lg';
		/**
		 * Whether a click or tap outside closes it. Even when true, it stops closing that way once
		 * something inside has been typed in or changed, so work isn't lost by accident. Escape, ✕ and
		 * the footer's buttons always close.
		 */
		dismissible?: boolean;
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	/** Something inside was typed in or changed since it opened. */
	let edited = false;
	/** The current press started on the backdrop (not inside, e.g. selecting text in a field). */
	let pressedOnBackdrop = false;

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			edited = false;
			dialog.showModal();
			focusFirst(dialog);
		} else if (!open && dialog.open) dialog.close();
	});

	/**
	 * Start where the work is: an `autofocus` element, else (with a mouse or keyboard) the first
	 * field, else the first footer button, which for a confirmation is Cancel. On touch screens a
	 * field isn't focused unasked, so the on-screen keyboard doesn't cover the form.
	 */
	function focusFirst(d: HTMLDialogElement) {
		const usable = (el: Element | null) => (el && !el.matches(':disabled') ? (el as HTMLElement) : null);
		const fine = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
		const target =
			usable(d.querySelector('[autofocus]')) ??
			(fine ? usable(d.querySelector('.body :is(input:not([type=hidden]), select, textarea)')) : null) ??
			usable(d.querySelector('footer :is(button, a[href])'));
		target?.focus();
	}

	function handleClose() {
		if (open) {
			open = false;
			onclose?.();
		}
	}

	function onBackdrop(e: MouseEvent) {
		const outside = pressedOnBackdrop && e.target === dialog;
		pressedOnBackdrop = false;
		if (outside && dismissible && !edited) dialog?.close();
	}
</script>

<dialog
	bind:this={dialog}
	class="modal {size}"
	onclose={handleClose}
	onpointerdown={(e) => (pressedOnBackdrop = e.target === dialog)}
	onclick={onBackdrop}
	oninput={() => (edited = true)}
	onchange={() => (edited = true)}
	aria-label={title}
>
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
