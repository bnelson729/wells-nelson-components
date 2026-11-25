<script lang="ts" module>
	export type ComboChoice = { id: string } | { newName: string } | null;
	export interface ComboOption {
		id: string;
		label: string;
	}

	export function sameName(a: string, b: string) {
		return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
	}
</script>

<script lang="ts">
	import { tick, untrack } from 'svelte';
	import FieldLabel from './FieldLabel.svelte';
	import FieldMessage from './FieldMessage.svelte';
	import type { FieldProps } from './forms.js';

	/**
	 * Dropdown with type-to-filter. Typing text that doesn't exactly match an option (ignoring
	 * case and surrounding spaces) offers to create a new entry with that name. Inside something
	 * that scrolls (e.g. a `Modal`), opening it near the end adds room below so the options aren't
	 * cut off.
	 */
	let {
		label,
		options,
		choice = $bindable(null),
		placeholder = 'Select or type to create…',
		createLabel = 'Create',
		error,
		hint,
		hideLabel = false,
		required = false,
		optional = false,
		disabled = false,
		onchange,
		class: className
	}: FieldProps & {
		options: ComboOption[];
		choice?: ComboChoice;
		placeholder?: string;
		createLabel?: string;
		/** After the choice changes, by picking an option or typing: an id, a new name, or null. */
		onchange?: (choice: ComboChoice) => void;
		/** Last resort: a class on the root element. */
		class?: string;
	} = $props();

	/** Set the choice and say so, when it really changed. */
	function setChoice(next: ComboChoice) {
		if (sameChoice(choice, next)) return;
		choice = next;
		onchange?.(next);
	}

	function sameChoice(a: ComboChoice, b: ComboChoice) {
		if (!a || !b) return !a && !b;
		if ('id' in a) return 'id' in b && a.id === b.id;
		return 'newName' in b && sameName(a.newName, b.newName);
	}

	const id = $props.id();
	const listId = `${id}-list`;
	const messageId = `${id}-msg`;
	const optionId = (i: number) => `${id}-opt-${i}`;

	function labelFor(c: ComboChoice) {
		if (!c) return '';
		if ('newName' in c) return c.newName;
		return options.find((o) => o.id === c.id)?.label ?? '';
	}

	let text = $state(labelFor(choice));
	let open = $state(false);
	let highlighted = $state(0);
	let filtering = $state(false);

	const query = $derived(text.trim());
	const filtered = $derived(
		filtering && query
			? options.filter((o) => o.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
			: options
	);
	const exact = $derived(options.find((o) => sameName(o.label, query)));
	const canCreate = $derived(query.length > 0 && !exact);
	const rows = $derived<Array<{ kind: 'option'; option: ComboOption } | { kind: 'create' }>>([
		...filtered.map((option) => ({ kind: 'option' as const, option })),
		...(canCreate ? [{ kind: 'create' as const }] : [])
	]);

	/**
	 * A choice set from outside (e.g. the app filling in a likely option) shows in the box. Typing
	 * keeps the choice in step with the text, so the text only changes when the two disagree.
	 */
	$effect.pre(() => {
		const c = choice;
		untrack(() => {
			const typed: ComboChoice = exact ? { id: exact.id } : query ? { newName: query } : null;
			if (!sameChoice(c, typed)) text = labelFor(c);
		});
	});

	function select(row: (typeof rows)[number]) {
		if (row.kind === 'option') {
			setChoice({ id: row.option.id });
			text = row.option.label;
		} else {
			setChoice({ newName: query });
			text = query;
		}
		open = false;
		filtering = false;
	}

	function onInput() {
		open = true;
		filtering = true;
		highlighted = 0;
		// Keep the choice in step with what's typed.
		setChoice(exact ? { id: exact.id } : query ? { newName: query } : null);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			open = true;
			highlighted = Math.min(highlighted + 1, rows.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlighted = Math.max(highlighted - 1, 0);
		} else if (e.key === 'Enter' && open && rows[highlighted]) {
			e.preventDefault();
			select(rows[highlighted]);
		} else if (e.key === 'Escape' && open) {
			e.preventDefault();
			e.stopPropagation();
			open = false;
		}
	}

	let combo: HTMLDivElement | undefined = $state();
	let list: HTMLUListElement | undefined = $state();
	/** Extra space below the field while open, so the options fit inside a scrolling container. */
	let reserve = $state(0);

	/** The nearest ancestor that scrolls, e.g. a modal's body; null when it's the page itself. */
	function scrollParent(el: HTMLElement): HTMLElement | null {
		for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
			const { overflowY } = getComputedStyle(p);
			if (overflowY === 'auto' || overflowY === 'scroll') return p;
		}
		return null;
	}

	$effect(() => {
		void rows.length;
		if (!open || !list || !combo) {
			reserve = 0;
			return;
		}
		const scroller = scrollParent(combo);
		const last = scroller?.lastElementChild;
		if (!scroller || !last) return;
		// Where the container's content ends without our extra space, and how far the options reach.
		const padding = parseFloat(getComputedStyle(scroller).paddingBottom) || 0;
		const contentEnd = last.getBoundingClientRect().bottom + padding - untrack(() => reserve);
		const needed = Math.ceil(list.getBoundingClientRect().bottom + 8 - contentEnd);
		reserve = Math.max(0, needed);
		void tick().then(() => list?.scrollIntoView?.({ block: 'nearest' }));
	});

	let blurTimer: ReturnType<typeof setTimeout> | undefined;
	// Don't let a pending blur timer run after the component is gone (e.g. its modal closed).
	$effect(() => () => clearTimeout(blurTimer));

	function onBlur() {
		// Let a click on an option land before closing.
		clearTimeout(blurTimer);
		blurTimer = setTimeout(() => {
			open = false;
			filtering = false;
			text = labelFor(choice);
		}, 150);
	}
</script>

<div class={['combo', className]} bind:this={combo}>
	<FieldLabel {label} for={id} {hideLabel} {required} {optional} />
	<div class="control">
		<input
			{id}
			type="text"
			role="combobox"
			aria-required={required || undefined}
			autocomplete="off"
			aria-expanded={open && rows.length > 0}
			aria-controls={listId}
			aria-autocomplete="list"
			aria-activedescendant={open && rows[highlighted] ? optionId(highlighted) : undefined}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error || hint ? messageId : undefined}
			{disabled}
			{placeholder}
			bind:value={text}
			oninput={onInput}
			onfocus={() => (open = true)}
			onclick={() => (open = true)}
			onblur={onBlur}
			onkeydown={onKeydown}
		/>
		{#if open && rows.length > 0}
			<ul id={listId} role="listbox" class="options" bind:this={list}>
				{#each rows as row, i (row.kind === 'option' ? row.option.id : '__create')}
					<li
						id={optionId(i)}
						role="option"
						aria-selected={row.kind === 'option' && !!choice && 'id' in choice && choice.id === row.option.id}
						class:highlighted={i === highlighted}
						class:create={row.kind === 'create'}
						onmousedown={(e) => {
							e.preventDefault();
							select(row);
						}}
						onmouseenter={() => (highlighted = i)}
					>
						{#if row.kind === 'option'}{row.option.label}{:else}{createLabel} “{query}”{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
	<FieldMessage id={messageId} {error} {hint} />
	{#if reserve > 0}<div class="reserve" style:height="{reserve}px" aria-hidden="true"></div>{/if}
</div>

<style>
	.combo {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.control {
		position: relative;
	}
	.reserve {
		flex: none;
	}
	.options {
		position: absolute;
		z-index: var(--z-dropdown);
		top: 100%;
		left: 0;
		right: 0;
		margin: var(--space-1) 0 0;
		padding: var(--space-1);
		list-style: none;
		max-height: 14rem;
		overflow-y: auto;
		background: var(--surface);
		border: 1px solid var(--control-border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-lg);
	}
	li {
		padding: 0.55rem var(--space-3);
		border-radius: calc(var(--radius) - 2px);
		cursor: pointer;
	}
	li.highlighted {
		background: var(--surface-hover);
	}
	li[aria-selected='true'] {
		font-weight: var(--weight-semibold);
	}
	li.create {
		color: var(--accent-text);
		font-weight: var(--weight-semibold);
	}
</style>
