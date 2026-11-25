<script lang="ts">
	import { Button, ErrorMessage, Modal } from '@wells-nelson/displays';
	import type { Snippet } from 'svelte';
	import { focusFirstInvalid } from './forms.js';
	import TextField from './TextField.svelte';

	/**
	 * Create something by name (a list, a team, an invited email): one field, Cancel and the
	 * create button. Opened by a "+ New …" button next to the page or section title, or by an
	 * `AddRow`'s + while its field is empty. `children` adds the thing's other choices under the
	 * field (e.g. a checkbox).
	 *
	 * Blank values are refused ("Add a name."), as is anything `validate` turns down. `onsubmit`
	 * may be async: the button shows `busyLabel` while it runs, and if it throws the error shows
	 * here and the modal stays open to try again. Mount only while shown; the field starts from
	 * `value` once.
	 */
	let {
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
		children
	}: {
		/** The modal's title, e.g. "New list". */
		title: string;
		/** The field's label, e.g. "List name". */
		label: string;
		/** What the field starts with (e.g. what was typed in an `AddRow`). */
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
		onclose: () => void;
		children?: Snippet;
	} = $props();

	let open = $state(true);
	// svelte-ignore state_referenced_locally
	let text = $state(value);
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

	function close() {
		open = false;
		onclose();
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
			close();
		} catch (err) {
			error = err;
		} finally {
			busy = false;
		}
	}
</script>

<Modal bind:open {title} size="sm" {onclose}>
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
		<Button onclick={close} disabled={busy}>Cancel</Button>
		<Button variant="primary" type="submit" form={formId} {busy}>{busy ? busyLabel : submitLabel}</Button>
	{/snippet}
</Modal>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
