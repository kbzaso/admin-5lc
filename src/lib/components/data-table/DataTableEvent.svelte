<script lang="ts">
	import { TANDAS_NAMES } from '$lib/consts';
	import DialogToAddPayments from '../DialogToAddPayments.svelte';
	import { Ticket, CreditCard } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { page } from '$app/stores';
	import { formatDateToChile } from '$lib';
	import DialogToUpdatePayments from '../DialogToUpdatePayments.svelte';
	import { formatPriceToCLP } from '$lib';
	import { getContext, setContext } from 'svelte';

	import { idUpdateDialogOpen } from '$lib/stores/idUpdatePaymentsDialogOpen';

	setContext('idUpdateDialogOpen', idUpdateDialogOpen);
	getContext('idUpdateDialogOpen');

	type Payment = {
		id: string;
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
		status: string;
		// status: 'pending' | 'processing' | 'success' | 'failed';
	};

	const traductions: { [key: string]: string } = {
		ringside_tickets: 'Ringside',
		general_tickets: 'General'
	};

	export let Payments: Payment[];

	let searchTerm = '';

	// Function to open the dialog for a specific payment
	function openDialog(paymentId: string) {
		idUpdateDialogOpen.set({
			open: true,
			id: paymentId
		});
	}

	// Reactive statement to filter payments based on search term
	$: filteredPayments = Payments.filter((payment) => {
		return (
			payment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.payment_status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.rut?.toLowerCase().includes(searchTerm.toLowerCase())
		);
	});
</script>

<div class="flex items-center py-4 justify-between">
	<div class="flex gap-4 items-center">
		<h2 class="font-bold text-xl">Asistentes</h2>
		<Input type="text" placeholder="Buscador..." class="w-72" bind:value={searchTerm} />
	</div>
	<DialogToAddPayments />
</div>

<div class="rounded-md border">
	<ul class="divide-y">
		{#each filteredPayments as payment, i}
			<DialogToUpdatePayments dialogOpen={$idUpdateDialogOpen.id === payment.id} {payment} />
			<li>
				<button
					on:click={() => openDialog(payment.id)}
					class="p-6 w-full hover:bg-muted flex justify-between h-full"
				>
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
								{$page.data.eventFromSanityStudio.sell_type === 'batch'
									? ''
									: traductions[payment.ticketsType]}
							</span>
							<span class="flex gap-2">
								<CreditCard />
								{formatPriceToCLP(payment.price)}
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
