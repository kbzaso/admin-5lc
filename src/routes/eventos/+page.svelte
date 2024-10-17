<script lang="ts">
	import type { PageData } from './$types';
	import Navbar from '$lib/components/Navbar.svelte';
	import DataTableEvents from '$lib/components/data-table/DataTableEvents.svelte';
	export let data: PageData;

	$: ({ events } = data);
</script>

<Navbar />
<DataTableEvents Events={events} />
