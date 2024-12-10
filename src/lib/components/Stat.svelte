<script lang="ts">
	export let totalMoneyRaised: number;
	export let ticketsSold: number;
	export let studioTicketsAvailable: number;
	import * as Card from '$lib/components/ui/card/index.js';
	import { TicketPercent, DollarSign, TicketCheck } from 'lucide-svelte';
	import { formatPriceToCLP } from '$lib';
	import { page } from '$app/stores';
	import { SELL_TYPE } from '$lib/consts';

	export let buysSumObject: Record<keyof typeof traductions, { amount: number }>;

	const traductions = {
		firsts_tickets: 'Preventa',
		seconds_tickets: 'Regular',
		thirds_tickets: 'Últimas entradas',
		system_payments: 'Sistema'
	};

	console.log($page.data);
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
				<div class="text-2xl font-bold">{formatPriceToCLP(totalMoneyRaised)}</div>
				<p class="text-xs text-muted-foreground">Sin descuentos aplicados.</p>
			</Card.Content>
		</Card.Root>
		<Card.Root
			data-x-chunk-name="card-03"
			data-x-chunk-description="Una tarjeta que muestra el monto total generado por la venta de entradas."
		>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Entradas validadas</Card.Title>
				<TicketCheck class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{$page.data.ticketValidated._sum.ticketValidated}</div>
				<p class="text-xs text-muted-foreground">
					No hicieron ingreso {ticketsSold - $page.data.ticketValidated._sum.ticketValidated} unidades.
				</p>
			</Card.Content>
		</Card.Root>
		{#if $page.data.sell_type !== 'ubication'}
			<Card.Root
				data-x-chunk-name="card-03"
				data-x-chunk-description="Una tarjeta que muestra el monto total generado por la venta de entradas."
			>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Resumen de venta</Card.Title>
					<TicketPercent class="h-4 w-4 ml-2 text-muted-foreground" />
				</Card.Header>
				<Card.Content class="flex flex-col">
					{#each Object.entries(buysSumObject) as [key, value]}
						<div class="flex justify-between">
							<p class="text-sm">{traductions[key]}</p>
							<div class="text-md font-bold">{value.amount}</div>
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>
