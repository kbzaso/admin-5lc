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
	import { page } from '$app/stores';

	import { payments } from '$lib/stores/payments';

	payments.set(data.eventFromSupabase?.Payment || []);

	let totalMoneyRaised = writable(data.totalMoneyRaised?._sum.price ?? 0);

	const currentSlug = $page.params.slug;
	onMount(() => {

		// Create a function to handle inserts
		const handleInserts = (payload: any) => {
			if (payload.new.productId !== currentSlug) return;
			// ACTUALIZA EL MONTO TOTAL RECAUDADO
			totalMoneyRaised.update((current) => payload.new.price + $totalMoneyRaised);

			payments.update((current) => [payload.new, ...current]);
			toast.success(`Se registrado el pago de ${payload.new.customer_name}`, {});
		};

		// Create a function to handle updates
		const handleUpdates = (payload) => {
			if (payload.old.productId !== currentSlug) return;
			// ACTUALIZA EL MONTO TOTAL RECAUDADO
			totalMoneyRaised.update((current) => current + payload.new.price - payload.old.price);

			// ACTUALIZA EL PAGO
			payments.update((current) =>
				current.map((payment) => {
					if (payment.id === payload.new.id) {
						return {
							...payload.new,
							Comment: payment.Comment // Preserve existing comments
						};
					}
					return payment;
				})
			);

			// MANDA LA NOTIFICACIÓN
			toast.info(`Se actualizo el pago de ${payload.new.customer_name}`, {});
		};

		// Create a function to handle deletes
		const handleDeletes = (payload) => {
			if (payload.old.productId !== currentSlug) return;
			// ACTUALIZA EL MONTO TOTAL RECAUDADO
			totalMoneyRaised.update((current) => $totalMoneyRaised - payload.old.price);
			payments.update((current) => current.filter((payment) => payment?.id !== payload.old.id));
			toast.warning(`Se ha eliminado el pago de ${payload.old.customer_name}`, {});
		};

		// Listen to inserts, updates, and deletes
		const subscription = supabaseClient
			.channel('Payment')
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'Payment' },
				handleInserts
			)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'Payment' },
				handleUpdates
			)
			.on(
				'postgres_changes',
				{ event: 'DELETE', schema: 'public', table: 'Payment' },
				handleDeletes
			)
			.subscribe();

		// Cleanup subscription on component unmount
		return () => {
			supabaseClient.removeChannel(subscription);
		};
	});
</script>

<svelte:head>
	<title>{data.eventFromSupabase?.name} | Eventos</title>
</svelte:head>

<div class="flex flex-col gap-4 mb-6 mt-4">
	<h1 class="text-2xl font-bold">{data.eventFromSupabase?.name}</h1>
	{#if $page.data.user.admin}
		<Stat
			totalMoneyRaised={$totalMoneyRaised}
			ticketsSold={data.ticketsSold._sum.ticketAmount || 0}
			studioTicketsAvailable={data.studioTicketsAvailable}
			buysSumObject={{
				firsts_tickets: data.eventFromSupabase.buysSumObject?.firsts_tickets || { amount: 0 },
				seconds_tickets: data.eventFromSupabase.buysSumObject?.seconds_tickets || { amount: 0 },
				thirds_tickets: data.eventFromSupabase.buysSumObject?.thirds_tickets || { amount: 0 },
				system_payments: data.eventFromSupabase.buysSumObject?.system_payments || { amount: 0 }
			}}
		/>
	{/if}
	<DataTableEvent Payments={$payments} sellType={data.eventFromSanityStudio?.sell_type} />
</div>
