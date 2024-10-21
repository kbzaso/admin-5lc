<script lang="ts">
	import { TANDAS_NAMES } from '$lib/consts';
	import Drawer from '../Drawer.svelte';
	import { Ticket } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';
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
				<button class="p-6 flex flex-col relative w-full hover:bg-muted">
					<span class="text-xl">
						{payment.customer_name}
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
					<span class="absolute right-10 text-primary font-bold text-4xl flex items-center gap-2">
						<Ticket />
						{payment.ticketAmount}
					</span>
					<Badge
						class={`absolute bottom-6 right-10 ${
							payment.payment_status === 'success'
								? 'bg-green-400 hover:bg-green-500'
								: 'bg-red-400 bg-red-500'
						}`}
					>
						{payment.payment_status}
					</Badge>
				</button>
			</li>
		{/each}
	</ul>
</div>
