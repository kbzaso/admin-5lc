<script lang="ts">
	import type { PageData } from './$types';
	import * as Table from '$lib/components/ui/table';
	import Navbar from '$lib/components/Navbar.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import DataTableEvents from '$lib/components/data-table/DataTableEvents.svelte';
	export let data: PageData;

	$: ({ events } = data);

</script>

<Navbar />
<DataTableEvents Events={events} />
