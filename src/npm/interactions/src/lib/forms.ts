import { tick } from 'svelte';

/**
 * After a submit that failed validation: once the error messages are rendered, move focus to the
 * first field marked `aria-invalid="true"` inside `root`, so keyboard and screen-reader users land
 * on what needs fixing (and hear its message, which `TextField` ties to the field).
 */
export async function focusFirstInvalid(root: ParentNode | null | undefined = globalThis.document) {
	await tick();
	root?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
