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
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { getContext, setContext } from 'svelte';

	import { idUpdateDialogOpen } from '$lib/stores/idUpdatePaymentsDialogOpen';
	import { writable } from 'svelte/store';

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
		ticketValidated: number;
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

	let showOnlySuccess = writable(true);

	// Reactive statement to filter payments based on search term and switch state
	$: filteredPayments = Payments.filter((payment) => {
		const matchesSearchTerm =
			payment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.payment_status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.rut?.toLowerCase().includes(searchTerm.toLowerCase());

		const matchesSuccessFilter = $showOnlySuccess || payment.payment_status === 'success';

		return matchesSearchTerm && matchesSuccessFilter;
	});
</script>

<!-- HEADER -->
<div class="flex flex-col md:flex-row items-center py-4 md:gap-4 justify-between">
	<div class="flex flex-col md:flex-row md:items-center gap-4 items-left w-full">
		<h2 class="font-bold text-xl">Listado de compras</h2>
		<Input type="text" placeholder="Buscador..." class="w-full md:w-96" bind:value={searchTerm} />
		<div class="flex items-center space-x-2">
			<Switch id="rejected-payments" bind:checked={$showOnlySuccess} />
			<Label for="rejected-payments">Incluir pagos rechazados</Label>
		</div>
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
					class="p-6 w-full hover:bg-muted flex justify-between"
				>
					<div class="flex flex-col items-start">
						<span class=" md:text-xl text-left">
							{payment.customer_name}
						</span>
						<span class="text-xs mb-2 text-zinc-400 uppercase">
							{formatDateToChile(payment.date)}
						</span>
						<span class="text-sm">
							{payment.rut}
						</span>
						<span class="text-sm">
							{payment.customer_email}
						</span>
						<span class="text-sm">
							{payment.customer_phone}
						</span>
					</div>
					<div class="flex flex-col items-end gap-4">
						<Badge
							class={`${payment.payment_status === 'success' ? 'bg-yellow-400' : 'bg-red-400 hover:bg-red-500'}`}
						>
							{payment.payment_status}
						</Badge>
						{#if payment.ticketAmount === payment.ticketValidated}
							<Badge class="bg-green-400 hover:bg-green-500">validado</Badge>
						{/if}
						<div class="text-right text-xs md:text-base">
							<span class="flex gap-2 items-center">
								<Ticket class="h-4 md:h-10" />
								{payment.ticketValidated}/{payment.ticketAmount}
								{$page.data.eventFromSanityStudio.sell_type === 'batch' ? '' : payment.ticketsType}
							</span>
							<span class="flex gap-2 items-center">
								<CreditCard class="h-4 md:h-10" />
								{formatPriceToCLP(payment.price)}
							</span>
						</div>
					</div>
				</button>
			</li>
		{/each}
	</ul>
</div>
