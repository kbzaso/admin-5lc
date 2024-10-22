<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;
	import Stat from '$lib/components/Stat.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import DataTableEvent from '$lib/components/data-table/DataTableEvent.svelte';

	import { writable } from 'svelte/store';
	import supabaseClient from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';

	let payments = writable(data.eventFromSupabase?.Payment || []);

	onMount(() => {
		// Create a function to handle inserts
		const handleInserts = (payload) => {
			payments.update((current) => [payload.new, ...current]);
			(() => toast.success('Se registrado un pago con exito', {}))();
		};

		// Listen to inserts
		const subscription = supabaseClient
			.channel('Payment')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'Payment' }, handleInserts)
			.subscribe();
	});
</script>

<Navbar />
<div class="flex flex-col gap-4 mb-6 mt-4">
	<h1 class="text-2xl font-bold">{data.eventFromSupabase?.name}</h1>
	<Stat
		totalMoneyRaised={data.totalMoneyRaised._sum.price || 0}
		ticketsSold={data.ticketsSold._sum.ticketAmount || 0}
		studioTicketsAvailable={data.studioTicketsAvailable}
		eventFromSanityStudio={data.eventFromSanityStudio}
		sellType={data.eventFromSanityStudio.sell_type}
	/>
	<DataTableEvent Payments={$payments} sellType={data.eventFromSanityStudio.sell_type} />
</div>
