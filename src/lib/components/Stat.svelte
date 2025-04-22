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
</script>

<section class="flex md:flex-row flex-col justify-between w-full">
	<div class="flex flex-col md:flex-row md:w-fit gap-4">
		<div class="card bg-base-300 grow border border-base-content/20">
			<div class="card-body">
				<div class="flex flex-row items-center justify-between space-y-0 pb-2">
					<span class="card-title">Entradas vendidas</span>
					<TicketPercent class="h-4 w-4 " />
				</div>
				<div>
					<div class="text-2xl font-bold">{ticketsSold}</div>
					<p class="text-xs">
						Quedan por vender {studioTicketsAvailable} unidades.
					</p>
				</div>
			</div>
		</div>
		<div class="card bg-base-300 grow border border-base-content/20">
			<div class="card-body">
				<div class="flex flex-row items-center justify-between space-y-0 pb-2">
					<span class="card-title">Monto generado</span>
					<DollarSign class="h-4 w-4 ml-2" />
				</div>
				<div>
					<div class="text-2xl font-bold">{formatPriceToCLP(totalMoneyRaised)}</div>
					<p class="text-xs">Sin descuentos aplicados.</p>
				</div>
			</div>
		</div>
		<div class="card bg-base-300 grow border border-base-content/20">
			<div class="card-body">
				<div class="flex flex-row items-center justify-between space-y-0 pb-2">
					<span class="card-title">Entradas validadas</span>
					<TicketCheck class="h-4 w-4 ml-2" />
				</div>
				<div>
					<div class="text-2xl font-bold">{$page.data.ticketValidated._sum.ticketValidated}</div>
					<p class="text-xs">
						No hicieron ingreso {ticketsSold - $page.data.ticketValidated._sum.ticketValidated} unidades.
					</p>
				</div>
			</div>
		</div>
		{#if $page.data.sell_type !== 'ubication'}
			<div class="card bg-base-300 grow border border-base-content/20">
				<div class="card-body">
					<div class="flex flex-row items-center justify-between space-y-0 pb-2">
						<span class="card-title">Resumen de venta</span>
						<TicketPercent class="h-4 w-4 ml-2" />
					</div>
					<div class="flex flex-col">
						{#each Object.entries(buysSumObject) as [key, value]}
							<div class="flex justify-between">
								<p class="text-sm">{traductions[key]}</p>
								<div class="text-md font-bold">{value.amount}</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
</section>
