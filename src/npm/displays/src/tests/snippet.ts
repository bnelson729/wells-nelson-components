import { createRawSnippet } from 'svelte';

/** A snippet that renders plain text, for passing `children` in tests. */
export function text(value: string) {
	const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
	return createRawSnippet(() => ({ render: () => `<span>${escaped}</span>` }));
}
