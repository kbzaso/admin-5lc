<script lang="ts">
	import type { PageData } from './$types';
	import * as Tabs from '$lib/components/ui/tabs';
	export let data: PageData;
	import Stat from '$lib/components/Stat.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import DataTableEvent from '$lib/components/data-table/DataTableEvent.svelte';

</script>

<Navbar />

<div class="flex flex-col gap-4 mb-6 mt-4">
	<Tabs.Root value="stats">
		<Tabs.List>
			<Tabs.Trigger value="stats">Resumen</Tabs.Trigger>
			<Tabs.Trigger value="buyers">Compradores</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="stats">
			<Stat
				totalMoneyRaised={data.totalMoneyRaised._sum.price || 0}
				ticketsSold={data.ticketsSold._sum.ticketAmount || 0}
				studioTicketsAvailable={data.studioTicketsAvailable}
				eventFromSanityStudio={data.eventFromSanityStudio}
				sellType={data.eventFromSanityStudio.sell_type}
			/>
		</Tabs.Content>
		<Tabs.Content value="buyers">
			<DataTableEvent Payments={data.eventFromSupabase?.Payment} sellType={data.eventFromSanityStudio.sell_type} />
		</Tabs.Content>
	</Tabs.Root>
</div>


