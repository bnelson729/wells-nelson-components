<script lang="ts">
	import IconButton from '../lib/IconButton.svelte';
	import ListRow from '../lib/ListRow.svelte';
</script>

<ul class="lines">
	<ListRow data-testid="row">
		<span class="line-text"><span class="line-name">Write the plan</span></span>
		<IconButton icon="pencil" label="Edit" />
		<IconButton icon="trash" label="Delete" size="lg" tone="danger" />
	</ListRow>
</ul>
