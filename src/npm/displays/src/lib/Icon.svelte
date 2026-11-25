<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	import { devWarn } from './deprecate.js';
	import { hasIcon, iconMarkup, type IconName } from './icons.js';

	/**
	 * A 24x24 stroke icon in the current text color. Decorative unless it has a `label`. `inline` sits it
	 * on a line of text (e.g. "Tap ✎ to edit") instead of as a block in a row or button. An unknown
	 * name renders an empty box and warns once in development.
	 */
	let {
		name,
		size = 20,
		label,
		inline = false,
		class: className,
		...rest
	}: Omit<SVGAttributes<SVGSVGElement>, 'name'> & {
		name: IconName;
		/** In px. Icons in text can be any size; buttons size their own (`IconButton size`). */
		size?: number;
		/** What it means, for an icon that carries meaning on its own (read out as an image). */
		label?: string;
		/** Aligned with the text around it, for an icon inside a sentence. */
		inline?: boolean;
		/** Last resort: a class on the <svg>. Ask for an option before styling it from outside. */
		class?: string;
	} = $props();

	$effect(() => {
		if (!hasIcon(name)) devWarn(`icon:${name}`, `No icon named "${name}". Register it with registerIcons().`);
	});
</script>

<svg
	class={['icon', inline && 'inline', className]}
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.9"
	stroke-linecap="round"
	stroke-linejoin="round"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	{...rest}
>
	{@html iconMarkup(name)}
</svg>

<style>
	.icon {
		flex: none;
		display: block;
	}
	.inline {
		display: inline-block;
		vertical-align: -0.2em;
	}
</style>
