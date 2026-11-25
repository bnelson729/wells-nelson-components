import { tick } from 'svelte';

/**
 * The props every form control shares, wired the same way everywhere: `hint` and `error` are tied to
 * the control (`aria-describedby`), an error marks it `aria-invalid` and is announced when it
 * appears, `required` and `optional` mark the label.
 */
export interface FieldProps {
	/** What the control is for. Always given: `hideLabel` hides it from sight, never from assistive tech. */
	label: string;
	/** Keep the label for assistive tech only (when something else on screen says what it's for). */
	hideLabel?: boolean;
	/** Help under the control, e.g. what a choice changes. */
	hint?: string;
	/** What's wrong with the value; shown instead of the hint. */
	error?: string | null;
	/** Marks the label "(required)" and the control `aria-required`. */
	required?: boolean;
	/** Marks the label "(optional)", instead of a placeholder that disappears when typing. */
	optional?: boolean;
	disabled?: boolean;
}

/** What `Field` hands its control: put these on the input, select or other element. */
export interface FieldControl {
	id: string;
	'aria-describedby': string | undefined;
	'aria-invalid': 'true' | undefined;
	'aria-required': true | undefined;
}

/**
 * After a submit that failed validation: once the error messages are rendered, move focus to the
 * first field marked `aria-invalid="true"` inside `root`, so keyboard and screen-reader users land
 * on what needs fixing (and hear its message, which the field ties to it).
 */
export async function focusFirstInvalid(root: ParentNode | null | undefined = globalThis.document) {
	await tick();
	root?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
