<script lang="ts">
	import { Button, ErrorMessage, Modal } from '@wells-nelson/displays';
	import { untrack, type Snippet } from 'svelte';
	import { focusFirstInvalid } from './forms.js';
	import TextField from './TextField.svelte';

	/**
	 * Create something by name (a list, a project, an invited email): one field, Cancel and the
	 * create button. Opened by a "+ New …" button next to the page or section title. `children` adds
	 * the thing's other choices under the field (e.g. a checkbox).
	 *
	 * Blank values are refused ("Add a name."), as is anything `validate` turns down. `onsubmit`
	 * may be async: the button shows `busyLabel` while it runs, and if it throws the error shows
	 * here and the modal stays open to try again. Keep it mounted and drive `bind:open` (e.g. from an
	 * `Overlay`); each time it opens, the field starts again from `value`.
	 */
	let {
		open = $bindable(false),
		title,
		label,
		value = '',
		type = 'text',
		hint,
		submitLabel = 'Create',
		busyLabel = 'Saving…',
		errorAction = 'save it',
		validate,
		onsubmit,
		onclose,
		onclosed,
		children
	}: {
		open?: boolean;
		/** The modal's title, e.g. "New list". */
		title: string;
		/** The field's label, e.g. "List name". */
		label: string;
		/** What the field starts with each time it opens. */
		value?: string;
		type?: 'text' | 'email';
		hint?: string;
		submitLabel?: string;
		busyLabel?: string;
		/** What failed, for the error sentence: "add the admin" → "Couldn't add the admin. …". */
		errorAction?: string;
		/** An error sentence for a value that can't be used, or null when it's fine. */
		validate?: (value: string) => string | null;
		/** Gets the trimmed value. The modal closes once it's done (resolves). */
		onsubmit: (value: string) => void | Promise<void>;
		/** The person closed it without creating anything. */
		onclose?: () => void;
		/** It has finished closing, by any route (see `Modal`). */
		onclosed?: () => void;
		children?: Snippet;
	} = $props();

	let text = $state('');
	let submitted = $state(false);
	let busy = $state(false);
	let error = $state<unknown>(null);
	const uid = $props.id();
	const formId = `${uid}-form`;

	const fieldError = $derived.by(() => {
		if (!submitted) return null;
		if (!text.trim()) return type === 'email' ? 'Add an email address.' : 'Add a name.';
		return validate?.(text.trim()) ?? null;
	});

	// Each time it opens, it starts from `value`, without the last attempt's errors.
	$effect.pre(() => {
		if (!open) return;
		untrack(() => {
			text = value;
			submitted = false;
			error = null;
		});
	});

	function cancel() {
		open = false;
		onclose?.();
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitted = true;
		if (fieldError) {
			void focusFirstInvalid(e.currentTarget as HTMLFormElement);
			return;
		}
		busy = true;
		error = null;
		try {
			await onsubmit(text.trim());
			open = false;
		} catch (err) {
			error = err;
		} finally {
			busy = false;
		}
	}
</script>

<Modal bind:open {title} size="sm" {onclose} {onclosed}>
	<form id={formId} class="form" onsubmit={submit} novalidate>
		<!-- svelte-ignore a11y_autofocus -->
		<TextField
			{label}
			{type}
			{hint}
			required
			bind:value={text}
			error={fieldError}
			autofocus
			autocomplete={type === 'email' ? 'email' : 'off'}
			enterkeyhint="done"
		/>
		{@render children?.()}
	</form>
	<ErrorMessage {error} action={errorAction} />

	{#snippet footer()}
		<Button onclick={cancel} disabled={busy}>Cancel</Button>
		<Button variant="solid" tone="accent" type="submit" form={formId} {busy}>{busy ? busyLabel : submitLabel}</Button>
	{/snippet}
</Modal>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
</style>
