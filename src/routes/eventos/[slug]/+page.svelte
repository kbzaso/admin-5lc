<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
	import Stat from '$lib/components/Stat.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import DataTableEvent from '$lib/components/data-table/DataTableEvent.svelte';
	import { onMount } from 'svelte';
</script>

<Navbar />

<div class="flex flex-col gap-4 mb-6 mt-4">
	<Stat
		totalMoneyRaised={data.totalMoneyRaised._sum.price || 0}
		ticketsSold={data.ticketsSold._sum.ticketAmount || 0}
		studioTicketsAvailable={data.studioTicketsAvailable}
		eventFromSanityStudio={data.eventFromSanityStudio}
		sellType={data.eventFromSanityStudio.sell_type}
	/>
	<DataTableEvent
		Payments={data.eventFromSupabase?.Payment}
		sellType={data.eventFromSanityStudio.sell_type}
	/>
</div>
