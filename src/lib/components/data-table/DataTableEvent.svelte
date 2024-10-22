<script lang="ts">
	import { TANDAS_NAMES } from '$lib/consts';
	import Drawer from '../Drawer.svelte';
	import { Ticket, DollarSign } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { page } from '$app/stores';
	import { formatDateToChile } from '$lib';
	export let sellType: string;

	type Payment = {
		date: string;
		customer_name: string;
		rut: string;
		customer_email: string;
		customer_phone: string;
		price: number;
		ticketAmount: number;
		ticketsType: string;
		payment_status: string;
		buys: {
			amount: number;
			status: string;
		}[];
		// status: 'pending' | 'processing' | 'success' | 'failed';
	};

	const traductions: { [key: string]: string } = {
		ringside_tickets: 'Ringside',
		general_tickets: 'General',
	}

	export let Payments: Payment[];

	$: payments = Payments;
</script>

<div class="flex items-center py-4 justify-between">
	<h2 class="font-bold text-xl">Asistentes</h2>
	<Drawer />
</div>
<div class="rounded-md border">
	<ul class="divide-y">
		{#each payments as payment, i}
			<li>
				<button class="p-6 w-full hover:bg-muted flex justify-between h-full">
					<div class="flex flex-col items-start">
						<span class="text-xl text-left truncate">
							{payment.customer_name}
						</span>
						<span class="text-xs mb-2 text-zinc-400 uppercase">
							{formatDateToChile(payment.date)}
						</span>
						<span>
							{payment.rut}
						</span>
						<span>
							{payment.customer_email}
						</span>
						<span>
							{payment.customer_phone}
						</span>
					</div>
					<div class="flex flex-col items-end gap-4">
						<div class="text-right">
							<span class="flex gap-2">
								<Ticket />
								{payment.ticketAmount}
								{$page.data.eventFromSanityStudio.sell_type === 'batch' ? '' : traductions[payment.ticketsType]}
							</span>
							<span class="flex gap-2">
								<DollarSign />
								{payment.price}
							</span>
						</div>
						<Badge
							class={`${
								payment.payment_status === 'success'
									? 'bg-green-400 hover:bg-green-500'
									: 'bg-red-400 hover:bg-red-500'
							}`}
						>
							{payment.payment_status}
						</Badge>
					</div>
				</button>
			</li>
		{/each}
	</ul>
</div>
