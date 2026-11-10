<script lang="ts">
	import { Icon } from '@wells-nelson/displays';

	let { placeholder, label, onadd }: { placeholder: string; label: string; onadd: (name: string) => void } =
		$props();

	let value = $state('');
	let input: HTMLInputElement | undefined = $state();

	function submit(e: SubmitEvent) {
		e.preventDefault();
		const name = value.trim();
		if (!name) return;
		onadd(name);
		value = '';
		// Ready for the next one, whether Enter or the plus button was used.
		input?.focus();
	}
</script>

<form class="add-row" onsubmit={submit}>
	<input type="text" bind:this={input} bind:value {placeholder} aria-label={label} enterkeyhint="done" />
	<button type="submit" aria-label={label} title={label} disabled={!value.trim()}>
		<Icon name="plus" />
	</button>
</form>

<style>
	.add-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.4rem 0.4rem 0.9rem;
		background: var(--surface);
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius);
	}
	input {
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		padding: 0.4rem 0;
		box-shadow: none;
	}
	input:focus {
		outline: none;
		box-shadow: none;
	}
	.add-row:focus-within {
		border-style: solid;
		border-color: var(--accent);
	}
	button {
		display: grid;
		place-items: center;
		width: 2.4rem;
		height: 2.4rem;
		border: none;
		border-radius: 50%;
		background: var(--accent);
		color: var(--on-accent);
		cursor: pointer;
	}
	button:disabled {
		background: var(--border-strong);
		cursor: not-allowed;
	}
</style>
