<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { onMount } from 'svelte';
	export let totalMoneyRaised: number;
	export let ticketsSold: number;
	export let studioTicketsAvailable: number;
	export let eventFromSanityStudio: any;
	import * as Card from '$lib/components/ui/card/index.js';
	import { TicketPercent, DollarSign, Percent } from 'lucide-svelte';
	import { Progress } from '$lib/components/ui/progress';

	const percentage = (ticketsSold / (ticketsSold + studioTicketsAvailable)) * 100;

	const stock = ticketsSold + studioTicketsAvailable;

	const totalMoneyFormatted = new Intl.NumberFormat('es-CL', {
		style: 'currency',
		currency: 'CLP'
	}).format(totalMoneyRaised);

	onMount(() => {
		console.log(percentage.toFixed(0));
	});
</script>

<div class="flex md:flex-row flex-col justify-between">
	<div class="flex flex-col md:flex-row md:w-fit gap-4">
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
				<div class="mt-2">
					<Progress value={percentage.toFixed(0)} max={stock} />
				</div>
			</Card.Content>
		</Card.Root>
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
	</div>
</div>
