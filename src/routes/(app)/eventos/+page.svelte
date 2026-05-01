<script lang="ts">
	import type { PageData } from './$types';
	import DataTableEvents from '$lib/components/data-table/DataTableEvents.svelte';
	export let data: PageData;

	$: ({ events } = data);
</script>

<DataTableEvents Events={events} />	
