<script lang="ts">
	export let totalMoneyRaised: number;
	export let ticketsSold: number;
	export let studioTicketsAvailable: number;
	import * as Card from '$lib/components/ui/card/index.js';
	import { TicketPercent, DollarSign } from 'lucide-svelte';

	const stock = ticketsSold + studioTicketsAvailable;

	const totalMoneyFormatted = new Intl.NumberFormat('es-CL', {
		style: 'currency',
		currency: 'CLP'
	}).format(totalMoneyRaised);
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
			data-x-chunk-name="card-03"
			data-x-chunk-description="Una tarjeta que muestra el monto total generado por la venta de entradas."
		>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Monto generado</Card.Title>
				<DollarSign class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{totalMoneyRaised || 0}</div>
				<p class="text-xs text-muted-foreground">Sin descuentos aplicados.</p>
			</Card.Content>
		</Card.Root>
	</div>
</div>
