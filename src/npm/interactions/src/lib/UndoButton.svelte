<script lang="ts">
	import { Icon } from '@wells-nelson/displays';
	import type { UndoStack } from './undo.svelte.js';

	/**
	 * Floating Undo button, bottom left (above a `SearchBar` and any `TabBar`), shown while
	 * `stack.visible`. It sits in a status region, so what it would undo ("Got Milk. Undo") is read
	 * out when it appears, and it stays up while hovered or focused.
	 */
	let { stack, label = 'Undo' }: { stack: UndoStack; label?: string } = $props();
</script>

<div class="region" role="status">
	{#if stack.visible}
		<button
			type="button"
			class="undo"
			onclick={() => stack.undo()}
			onpointerenter={() => stack.pause()}
			onpointerleave={() => stack.resume()}
			onfocus={() => stack.pause()}
			onblur={() => stack.resume()}
		>
			{#if stack.message}<span class="what">{stack.message}<span class="visually-hidden">.</span></span>{/if}
			<Icon name="undo" size={18} />
			{label}
		</button>
	{/if}
</div>

<style>
	.undo {
		position: fixed;
		left: max(1rem, calc(50vw - var(--content-w) / 2 + 1rem));
		bottom: calc(4.75rem + max(env(safe-area-inset-bottom, 0px), var(--footer-offset, 0px)));
		z-index: var(--z-floating);
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		max-width: calc(100vw - 2rem);
		min-height: var(--tap, 2.75rem);
		padding: 0 var(--space-4);
		border: none;
		border-radius: 2rem;
		background: var(--text);
		color: var(--bg);
		font-weight: var(--weight-semibold);
		box-shadow: var(--shadow-lg);
		cursor: pointer;
		animation: pop var(--duration-fast) ease-out;
	}
	.what {
		min-width: 0;
		max-width: 14rem;
		margin-right: 0.35rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: var(--weight-regular);
	}
	@keyframes pop {
		from {
			transform: translateY(0.5rem);
			opacity: 0;
		}
	}
</style>
