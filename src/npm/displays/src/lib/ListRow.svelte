<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLLiAttributes } from 'svelte/elements';
	import { setIconButtonDefaults } from './context.js';

	/**
	 * One line of a `.lines` list (lines on paper): a row on `--surface` with a hairline above. Put a
	 * `Checkbox` (or other control) first, then `.line-text` holding `.line-name` and an optional
	 * `.line-subtext`, then the row's actions. `IconButton`s inside are small and muted unless they say
	 * otherwise. Other attributes and attachments (e.g. drag and drop) go to the <li>.
	 */
	let {
		children,
		class: className,
		...rest
	}: HTMLLiAttributes & {
		children: Snippet;
		/** Last resort: a class on the <li>. Ask for an option before styling it from outside. */
		class?: string;
	} = $props();

	setIconButtonDefaults({ size: 'sm', tone: 'muted' });
</script>

<li class={['line', className]} {...rest}>{@render children()}</li>
