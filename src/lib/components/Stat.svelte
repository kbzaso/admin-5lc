<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { PortableText } from '@portabletext/svelte';
	import { urlFor } from '$lib/sanity';
	import { onMount } from 'svelte';
	export let totalMoneyRaised: number;
	export let ticketsSold: number;
	export let studioTicketsAvailable: number;
	export let eventFromSanityStudio: any;
	import * as Card from '$lib/components/ui/card/index.js';
	import { TicketPercent, DollarSign, Percent } from 'lucide-svelte';
	import { page } from '$app/stores';

	const percentage = (ticketsSold / (ticketsSold + studioTicketsAvailable)) * 100;

	const stock = ticketsSold + studioTicketsAvailable;

	const totalMoneyFormatted = new Intl.NumberFormat('es-CL', {
		style: 'currency',
		currency: 'CLP'
	}).format(totalMoneyRaised);

	let countdown = '';
	let showCountdown = true;

	onMount(() => {
		const intervalId = setInterval(() => {
			const now = new Date();
			const eventDate = new Date(eventFromSanityStudio.date);
			const diff = eventDate.getTime() - now.getTime();

			if (diff <= 0) {
				showCountdown = false;
				clearInterval(intervalId);
			} else {
				const days = Math.floor(diff / (1000 * 60 * 60 * 24));
				const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
				const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
				const seconds = Math.floor((diff % (1000 * 60)) / 1000);

				countdown = `${days} días ${hours} horas ${minutes} minutos ${seconds} segundos`;
			}
		}, 1000);

		return () => clearInterval(intervalId); // cleanup on component unmount
	});
</script>

<div class="flex md:flex-row flex-col justify-between gap-2">
	<div class="flex flex-col md:flex-row md:w-fit gap-2">
		<Card.Root
			data-x-chunk-name="card-01"
			data-x-chunk-description="Una tarjeta que muestra la cantidad de entradas vendidas y las que quedan por vender."
		>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Entradas vendidas</Card.Title>
				<TicketPercent class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{ticketsSold}</div>
				<p class="text-xs text-muted-foreground">
					Quedan por vender {studioTicketsAvailable} unidades.
				</p>
			</Card.Content>
		</Card.Root>
		<Card.Root
			data-x-chunk-name="card-02"
			data-x-chunk-description="Una tarjeta que muestra el porcentaje de venta de entradas."
		>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Porcentaje de venta</Card.Title>
				<Percent class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{percentage.toFixed(2)}%</div>
				<p class="text-xs text-muted-foreground">De un total de {stock} entradas.</p>
			</Card.Content>
		</Card.Root>
		{#if !$page.data.validator}
			<Card.Root
				data-x-chunk-name="card-03"
				data-x-chunk-description="Una tarjeta que muestra el monto total generado por la venta de entradas."
			>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Monto generado</Card.Title>
					<DollarSign class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{totalMoneyFormatted}</div>
					<p class="text-xs text-muted-foreground">Sin descuentos aplicados.</p>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>
