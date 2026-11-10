<script lang="ts">
	import { Icon } from '@wells-nelson/displays';
	import type { UndoStack } from './undo.svelte.js';

	/** Floating Undo button, bottom left (above a `SearchBar`), shown while `stack.visible`. */
	let { stack, label = 'Undo' }: { stack: UndoStack; label?: string } = $props();
</script>

{#if stack.visible}
	<button type="button" class="undo" onclick={() => stack.undo()}>
		<Icon name="undo" size={18} />
		{label}
	</button>
{/if}

<style>
	.undo {
		position: fixed;
		left: max(1rem, calc(50vw - var(--content-w) / 2 + 1rem));
		bottom: calc(4.75rem + env(safe-area-inset-bottom, 0px));
		z-index: 45;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.6rem 1rem;
		border: none;
		border-radius: 2rem;
		background: var(--text);
		color: var(--bg);
		font-weight: 600;
		box-shadow: var(--shadow-lg);
		cursor: pointer;
		animation: pop 0.15s ease-out;
	}
	@keyframes pop {
		from {
			transform: translateY(0.5rem);
			opacity: 0;
		}
	}
</style>
