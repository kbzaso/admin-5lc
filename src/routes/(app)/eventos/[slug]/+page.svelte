<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;

	import Stat from '$lib/components/Stat.svelte';
	import DataTableEvent from '$lib/components/data-table/DataTableEvent.svelte';
	import DataTablePaymentChangeLog from '$lib/components/data-table/DataTablePaymentChangeLog.svelte';
	import EventDailyTicketsChart from '$lib/components/data-table/EventDailyTicketsChart.svelte';
	import PaymentFilterChips from '$lib/components/data-table/PaymentFilterChips.svelte';
	import * as Tabs from '$lib/components/ui/tabs';

	import { writable } from 'svelte/store';
	import supabaseClient from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	import { toast } from 'svelte-sonner';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	import { payments } from '$lib/stores/payments';
	import { isRejectedBucket } from '$lib/stores/paymentFilter';

	payments.set(data.eventFromSupabase?.Payment || []);

	// Non-success buys, split between explicit gateway rejections and attempts
	// that never completed (register / no status). Derived from the live
	// payments store so realtime inserts keep the card current.
	$: declinedBuys = $payments.filter((p) => p?.payment_status === 'rejected').length;
	$: incompleteBuys = $payments.filter(
		(p) => isRejectedBucket(p) && p?.payment_status !== 'rejected'
	).length;

	const totalMoneyRaised = writable(data.totalMoneyRaised?._sum.price ?? 0);
	// Re-sincroniza el total con el valor del servidor cada vez que se invalida
	// la data (p. ej. tras eliminar o actualizar un pago con un form action).
	// Entre invalidaciones, los handlers de realtime lo ajustan de forma local.
	$: totalMoneyRaised.set(data.totalMoneyRaised?._sum.price ?? 0);

	const currentSlug = $page.params.slug;
	onMount(() => {

		// Create a function to handle inserts
		const handleInserts = (payload: any) => {
			if (payload.new.productId !== currentSlug) return;
			// Already added optimistically (e.g. by the "Agregar pago" form) —
			// avoid double-counting the total and duplicating the row.
			if ($payments.some((p) => p?.id === payload.new.id)) return;
			// ACTUALIZA EL MONTO TOTAL RECAUDADO
			totalMoneyRaised.update((current) => payload.new.price + $totalMoneyRaised);

			payments.update((current) => [payload.new, ...current]);
			toast.success(`Se registrado el pago de ${payload.new.customer_name}`, {});
		};

		// Create a function to handle updates
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const handleUpdates = (payload: any) => {
			// payload.old solo trae todas las columnas con REPLICA IDENTITY FULL;
			// si falta productId, asumimos que el pago no cambió de evento.
			const oldProductId = payload.old.productId ?? payload.new.productId;
			const wasHere = oldProductId === currentSlug;
			const isHere = payload.new.productId === currentSlug;
			if (!wasHere && !isHere) return;

			// El pago se movió a otro evento (cambio de evento): sale de esta lista.
			if (wasHere && !isHere) {
				totalMoneyRaised.update((current) => current - payload.old.price);
				payments.update((current) => current.filter((payment) => payment?.id !== payload.new.id));
				const targetId = payload.new.productId;
				// Los destinos de un cambio siempre son eventos futuros, así que el
				// nombre suele estar en futureEvents; si no, mostramos el texto genérico.
				const targetName = data.futureEvents?.find((e) => e.id === targetId)?.name;
				toast.info(
					targetName
						? `El pago de ${payload.new.customer_name} se movió a «${targetName}»`
						: `El pago de ${payload.new.customer_name} se movió a otro evento`,
					{
						duration: 8000,
						action: {
							label: 'Ver evento',
							onClick: () => goto(`/eventos/${targetId}`)
						}
					}
				);
				return;
			}

			// El pago llegó desde otro evento (cambio de evento): entra a esta lista.
			// Los pagos movidos llevan changeEvent=true, así que no suman al total.
			if (!wasHere && isHere) {
				payments.update((current) => [
					payload.new,
					...current.filter((payment) => payment?.id !== payload.new.id)
				]);
				// Esta rama solo se alcanza cuando payload.old trae productId (ver
				// arriba), así que el origen siempre está disponible.
				const originId = payload.old.productId;
				toast.info(`Llegó el pago de ${payload.new.customer_name} desde otro evento`, {
					duration: 8000,
					action: {
						label: 'Ver origen',
						onClick: () => goto(`/eventos/${originId}`)
					}
				});
				return;
			}

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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const handleDeletes = (payload: any) => {
			// En DELETE, payload.old solo trae el id (salvo REPLICA IDENTITY FULL),
			// así que ubicamos el pago en la lista en vez de leer payload.old.productId.
			// Si no está, es de otro evento o ya se quitó de forma optimista al
			// eliminarlo desde esta misma pestaña.
			const existing = $payments.find((payment) => payment?.id === payload.old.id);
			if (!existing) return;
			// ACTUALIZA EL MONTO TOTAL RECAUDADO
			totalMoneyRaised.update((current) => current - (payload.old.price ?? existing.price ?? 0));
			payments.update((current) => current.filter((payment) => payment?.id !== payload.old.id));
			toast.warning(
				`Se ha eliminado el pago de ${payload.old.customer_name ?? existing.customer_name}`,
				{}
			);
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
				system_payments: data.eventFromSupabase.buysSumObject?.system_payments || { amount: 0 },
				refund_payments: data.eventFromSupabase.buysSumObject?.refund_payments || { amount: 0 },
				change_payments: data.eventFromSupabase.buysSumObject?.change_payments || { amount: 0 }
			}}
			ubicationSumObject={data.eventFromSupabase.ubicationSumObject ?? {}}
			{declinedBuys}
			{incompleteBuys}
		/>
	{/if}
	<Tabs.Root value="entradas" class="w-full">
		<Tabs.List>
			<Tabs.Trigger value="entradas">Entradas</Tabs.Trigger>
			<Tabs.Trigger value="historial">Historial de cambios</Tabs.Trigger>
		</Tabs.List>
		<Tabs.Content value="entradas" class="flex flex-col gap-4">
			{#if $page.data.user.admin}
				<EventDailyTicketsChart payments={$payments} />
			{/if}
			<PaymentFilterChips payments={$payments} />
			<DataTableEvent Payments={$payments} />
		</Tabs.Content>
		<Tabs.Content value="historial">
			<DataTablePaymentChangeLog changeLog={data.paymentChangeLog} />
		</Tabs.Content>
	</Tabs.Root>
</div>
