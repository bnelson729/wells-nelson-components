<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconButton from './IconButton.svelte';

	/**
	 * A dialog over the page (the native <dialog>: top layer, background inert, Escape closes). Keep it
	 * mounted and drive `bind:open`; for a modal about one thing (edit this task), hold that thing in
	 * an `Overlay` from @wells-nelson/interactions and pass `onclosed={overlay.closed}`, so it's
	 * kept until the dialog is gone.
	 */
	let {
		open = $bindable(false),
		title,
		children,
		footer,
		onclose,
		onclosed,
		size = 'md',
		dismissible = true,
		class: className
	}: {
		open?: boolean;
		title: string;
		children: Snippet;
		footer?: Snippet;
		/** The person closed it (✕, Escape or a click outside). Not called when `open` is set false in code. */
		onclose?: () => void;
		/** It has finished closing, by any route: clear what it was showing here. */
		onclosed?: () => void;
		/** sm: confirmations; md: forms (default); lg: near full width and height, for dense pickers. */
		size?: 'sm' | 'md' | 'lg';
		/**
		 * Whether a click or tap outside closes it. Even when true, it stops closing that way once
		 * something inside has been typed in or changed, so work isn't lost by accident. Escape, ✕ and
		 * the footer's buttons always close.
		 */
		dismissible?: boolean;
		/** Last resort: a class on the <dialog>. Ask for an option before styling it from outside. */
		class?: string;
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
		onclosed?.();
	}

	function onBackdrop(e: MouseEvent) {
		const outside = pressedOnBackdrop && e.target === dialog;
		pressedOnBackdrop = false;
		if (outside && dismissible && !edited) dialog?.close();
	}
</script>

<dialog
	bind:this={dialog}
	class={['modal', size, className]}
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
		/* --modal-max-w caps every size: a phone-sized app keeps its modals phone sized. */
		width: min(34rem, var(--modal-max-w, 100vw), calc(100vw - 2rem));
		max-height: min(46rem, calc(100dvh - 2rem));
		box-shadow: var(--shadow-lg);
	}
	.modal.lg {
		width: min(64rem, var(--modal-max-w, 100vw), calc(100vw - 2rem));
		max-height: calc(100dvh - 2rem);
	}
	.modal.sm {
		width: min(24rem, var(--modal-max-w, 100vw), calc(100vw - 2rem));
	}
	.modal::backdrop {
		background: var(--scrim);
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
		gap: var(--space-2);
		padding: var(--space-3) var(--space-3) var(--space-1) 1.25rem;
	}
	h2 {
		margin: 0;
		font-size: var(--text-lg);
	}
	.body {
		/*
		 * Sticky content (a CollapsibleSection's header) pins to the top edge of the body, flush under
		 * the modal's header: not below the app header, which the modal covers, and not below the
		 * body's top padding, which would leave a gap the content scrolls through.
		 */
		--header-offset: calc(-1 * var(--space-2));
		padding: var(--space-2) 1.25rem var(--space-4);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	footer {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		justify-content: flex-end;
		padding: var(--space-3) 1.25rem var(--space-4);
		border-top: 1px solid var(--border);
	}
</style>
