<script lang="ts">
	import {
		Badge,
		Button,
		Chip,
		IconButton,
		ListHeading,
		ListRow,
		Notice,
		PageHeader,
		SortableTable,
		type ButtonVariant,
		type Tone
	} from '@wells-nelson/displays';
	import {
		ActiveList,
		Checkbox,
		CollapsibleSection,
		Combobox,
		SelectField,
		Segmented,
		TextField,
		Toggle
	} from '@wells-nelson/interactions';
	import Panel from '../Panel.svelte';
	import { shell } from '../state.svelte';

	/**
	 * Every component in each of its states, side by side: default, disabled, busy, error, read-only,
	 * empty and long content. The visual tests screenshot this page in each palette, light and dark,
	 * and in forced colors; the accessibility test runs axe over it. Keep it free of anything that
	 * changes between runs (times, random ids in text, animations).
	 */
	const variants: ButtonVariant[] = ['solid', 'outline', 'ghost'];
	const tones: Tone[] = ['neutral', 'accent', 'danger', 'warning', 'success'];
	const LONG = 'A rather long name that keeps going well past the edge of a phone screen';
	let choice = $state<'a' | 'b'>('a');
	let sort = $state(1);
</script>

<p class="muted">
	Every component in each state. Palette: <strong>{shell.palette}</strong> (change it on the Displays page, or open
	<code>#/states?palette=green</code>).
</p>

<Panel title="Button: variant × tone">
	<div class="grid" style:--cols={tones.length}>
		{#each variants as variant (variant)}
			{#each tones as tone (tone)}
				<Button {variant} {tone}>{variant} {tone}</Button>
			{/each}
		{/each}
	</div>
	<div class="row">
		<Button variant="solid" tone="accent" disabled>Disabled</Button>
		<Button variant="solid" tone="accent" busy>Saving…</Button>
		<Button variant="outline" href="#/states" disabled>Disabled link</Button>
		<Button size="lg" icon="plus">Large</Button>
	</div>
	<Button block icon="pencil">{LONG}</Button>
</Panel>

<Panel title="IconButton">
	<div class="row">
		<IconButton icon="pencil" label="Small" size="sm" />
		<IconButton icon="pencil" label="Medium" size="md" />
		<IconButton icon="pencil" label="Large" size="lg" />
		<IconButton icon="pencil" label="Muted" tone="muted" />
		<IconButton icon="trash" label="Danger" tone="danger" />
		<IconButton icon="search" label="Pressed" pressed />
		<IconButton icon="home" label="Current page" href="#/states" current />
		<IconButton icon="x" label="Disabled" disabled />
		<IconButton icon="home" label="With label" href="#/states" showLabel />
	</div>
</Panel>

<Panel title="Badge, Chip, Notice">
	<div class="row">
		{#each ['neutral', 'accent', 'warning', 'danger', 'success'] as const as tone (tone)}
			<Badge {tone}>{tone}</Badge>
		{/each}
		<Badge tone="count" label="12 items">12</Badge>
		<Badge>{LONG}</Badge>
	</div>
	<div class="row">
		<Chip>Action</Chip>
		<Chip pressed>On</Chip>
		<Chip tone="accent">Accent</Chip>
		<Chip dashed>+ Add</Chip>
		<Chip disabled>Disabled</Chip>
		<Chip>{LONG}</Chip>
	</div>
	{#each ['warning', 'danger', 'info', 'success'] as const as tone (tone)}
		<Notice {tone}>A {tone} notice. {tone === 'info' ? LONG : ''}</Notice>
	{/each}
</Panel>

<Panel title="Fields">
	<TextField label="Default" value="Some text" />
	<TextField label="With hint" hint="What it's for." optional />
	<TextField label="With error" value="x" error="At least 3 characters." required />
	<TextField label="Disabled" value="Can't change" disabled />
	<TextField label="Read-only" value="Shown as plain text" readonly />
	<SelectField
		label="Select"
		bind:value={sort}
		options={[
			{ value: 1, label: 'First' },
			{ value: 2, label: 'Second' }
		]}
		hint="A short, fixed list."
	/>
	<SelectField label="Select with error" value={1} options={[{ value: 1, label: 'First' }]} error="Pick another." />
	<Combobox label="Combobox" options={[{ id: '1', label: 'One' }]} hint="Type to filter or create." />
	<Combobox label="Combobox with error" options={[]} error="Choose one." />
	<Segmented
		label="Segmented"
		bind:value={choice}
		options={[
			{ value: 'a', label: 'A' },
			{ value: 'b', label: 'B' }
		]}
	/>
	<Segmented
		label="Segmented small"
		size="sm"
		bind:value={choice}
		options={[
			{ value: 'a', label: 'A' },
			{ value: 'b', label: 'B' }
		]}
	/>
	<Segmented label="Segmented disabled" disabled value="a" options={[{ value: 'a', label: 'A' }]} />
	<div class="row">
		<Checkbox label="Unchecked" />
		<Checkbox label="Checked" checked />
		<Checkbox label="Muted" checked tone="muted" />
		<Checkbox label="Disabled" disabled />
		<Checkbox label="With error" error="Tick this." />
	</div>
	<Checkbox label="With a description" description="Second line" />
	<div class="row">
		<Toggle label="Off" />
		<Toggle label="On" checked />
		<Toggle label="Disabled" disabled />
	</div>
</Panel>

<Panel title="Rows and sections">
	<PageHeader title="Page header" back={{ href: '#/states', label: 'Back to Displays' }}>
		{#snippet actions()}<Button icon="plus">New thing</Button>{/snippet}
	</PageHeader>
	<PageHeader title={LONG} level={2}>
		{#snippet actions()}<Button icon="plus">New</Button>{/snippet}
	</PageHeader>
	<ul class="lines">
		<ListHeading>A group</ListHeading>
		<ListRow>
			<Checkbox label="Done" hideLabel />
			<span class="line-text"><span class="line-name">A line</span><span class="line-subtext">Its details</span></span>
			<IconButton icon="pencil" label="Edit a line" />
		</ListRow>
		<ListRow>
			<Checkbox label={LONG} hideLabel checked tone="muted" />
			<span class="line-text"><span class="line-name">{LONG}</span></span>
			<IconButton icon="pencil" label="Edit the long line" />
		</ListRow>
		<li class="line" style:padding="0"><Checkbox label="A whole row that ticks" description="block" block /></li>
	</ul>
	<CollapsibleSection title="Section" count={1} onadd={() => {}} onedit={() => {}}>
		<ListRow><span class="line-text"><span class="line-name">Row</span></span></ListRow>
	</CollapsibleSection>
	<CollapsibleSection title="Empty section" count={0} layout="lines" emphasis="subtle">
		{#snippet empty()}Nothing here yet.{/snippet}
		<li></li>
	</CollapsibleSection>
	<CollapsibleSection title="Collapsed section" count={2} expanded={false}>
		<li></li>
	</CollapsibleSection>
	<ActiveList items={[]} noun="People" label={() => ''} onopen={() => {}} onactivechange={() => {}} />
	<SortableTable title="Empty table" rows={[]} columns={[]} rowKey={() => ''} rowLabel={() => ''} />
</Panel>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
		gap: var(--space-2);
	}
</style>
