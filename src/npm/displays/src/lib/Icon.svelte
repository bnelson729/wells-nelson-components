<script lang="ts">
	import { iconMarkup, type IconName } from './icons.js';

	let { name, size = 20, label }: { name: IconName; size?: number; label?: string } = $props();
</script>

<svg
	class="icon"
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
>
	{@html iconMarkup(name)}
</svg>

<style>
	.icon {
		flex: none;
		display: block;
	}
</style>
