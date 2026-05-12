<script lang="ts">
	export let totalMoneyRaised: number;
	export let ticketsSold: number;
	export let studioTicketsAvailable: number;
	import * as Card from '$lib/components/ui/card/index.js';
	import { TicketPercent, DollarSign, TicketCheck } from 'lucide-svelte';
	import { formatPriceToCLP } from '$lib';
	import { page } from '$app/stores';
	import { IVA_RATE, PAYKU_RATE } from '$lib/consts';

	export let buysSumObject: Record<keyof typeof traductions, { amount: number }>;
	export let ubicationSumObject: Record<string, { amount: number }> = {};

	const traductions: Record<string, string> = {
		firsts_tickets: 'Preventa',
		seconds_tickets: 'Regular',
		thirds_tickets: 'Últimas entradas',
		system_payments: 'Sistema',
		refund_payments: 'Reembolso',
		change_payments: 'Cambio'
	};

	$: ticketsValidated = $page.data.ticketValidated._sum.ticketValidated ?? 0;

	// Deductions over the gross revenue: 19% IVA, plus Payku's 2.79% commission
	// with IVA charged on top of that commission (2.79% × 1.19).
	$: ivaDeduction = totalMoneyRaised * IVA_RATE;
	$: paykuDeduction = totalMoneyRaised * PAYKU_RATE * (1 + IVA_RATE);
	$: netMoneyRaised = totalMoneyRaised - ivaDeduction - paykuDeduction;
	const pctLabel = (rate: number) =>
		new Intl.NumberFormat('es-CL', { style: 'percent', maximumFractionDigits: 2 }).format(rate);

	type StatCard = {
		label: string;
		icon: typeof DollarSign;
		value: string | number;
		helper?: string;
		breakdown?: { label: string; amount: number }[];
		net?: number;
	};

	let stats: StatCard[];
	$: stats = [
		{
			label: 'Entradas vendidas',
			icon: TicketPercent,
			value: ticketsSold,
			helper: `Quedan por vender ${studioTicketsAvailable} unidades.`
		},
		{
			label: 'Monto generado',
			icon: DollarSign,
			value: formatPriceToCLP(totalMoneyRaised),
			breakdown: [
				{ label: `IVA (${pctLabel(IVA_RATE)})`, amount: -ivaDeduction },
				{ label: `Payku (${pctLabel(PAYKU_RATE)} + IVA)`, amount: -paykuDeduction }
			],
			net: netMoneyRaised
		},
		{
			label: 'Entradas validadas',
			icon: TicketCheck,
			value: ticketsValidated,
			helper: `No hicieron ingreso ${ticketsSold - ticketsValidated} unidades.`
		}
	];

	$: summary =
		$page.data.sell_type !== 'ubication'
			? Object.entries(buysSumObject).map(([key, v]) => [traductions[key], v.amount] as const)
			: Object.entries(ubicationSumObject).map(([key, v]) => [key, v.amount] as const);
</script>

<section class="w-full">
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
		{#each stats as stat}
			<Card.Root class="rounded-xl border-base-content/20 bg-base-300">
				<Card.Header class="flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">{stat.label}</Card.Title>
					<svelte:component
						this={stat.icon}
						class="h-4 w-4 text-muted-foreground"
						aria-hidden="true"
					/>
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{stat.value}</div>
					{#if stat.breakdown}
						<dl class="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
							{#each stat.breakdown as item}
								<div class="flex justify-between">
									<dt>{item.label}</dt>
									<dd>{formatPriceToCLP(item.amount)}</dd>
								</div>
							{/each}
							<div
								class="mt-1 flex justify-between border-t border-base-content/20 pt-1 font-semibold text-foreground"
							>
								<dt>Neto estimado</dt>
								<dd>{formatPriceToCLP(stat.net ?? 0)}</dd>
							</div>
						</dl>
					{:else}
						<p class="text-xs text-muted-foreground">{stat.helper}</p>
					{/if}
				</Card.Content>
			</Card.Root>
		{/each}

		<Card.Root class="rounded-xl border-base-content/20 bg-base-300">
			<Card.Header class="flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Resumen de venta</Card.Title>
				<TicketPercent class="h-4 w-4 text-muted-foreground" aria-hidden="true" />
			</Card.Header>
			<Card.Content>
				<dl class="flex flex-col gap-1">
					{#each summary as [label, amount]}
						<div class="flex justify-between">
							<dt class="text-sm">{label}</dt>
							<dd class="text-base font-bold">{amount}</dd>
						</div>
					{/each}
				</dl>
			</Card.Content>
		</Card.Root>
	</div>
</section>
