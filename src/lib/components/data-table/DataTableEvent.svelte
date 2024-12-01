<script lang="ts">
	import { TANDAS_NAMES } from '$lib/consts';
	import DialogToAddPayments from '../SheetToAddPayments.svelte';
	import { Ticket, CreditCard } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { page } from '$app/stores';
	import { formatDateToChile } from '$lib';
	import DialogToUpdatePayments from '../SheetToUpdatePayments.svelte';
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
		client_id: string;
		buys: {
			amount: number;
			status: string;
		}[];
		status: string;
		// status: 'pending' | 'processing' | 'success' | 'failed';
	};

	const traductions: { [key: string]: string } = {
		success: 'Web',
		system: 'Sistema',
		register: 'Registro',
		rejected: 'Rechazado',
		refund: 'Reembolso',
		change: 'Cambio'
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

	let showRejected = writable(false);

	// Reactive statement to filter payments based on search term and switch state
	$: filteredPayments = Payments.filter((payment) => {
		const matchesSearchTerm =
			payment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.payment_status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.rut?.toLowerCase().includes(searchTerm.toLowerCase());

		const matchesSuccessFilter = $showRejected || payment.payment_status === 'success' || payment.payment_status === 'system' || payment.payment_status === 'refund' || payment.payment_status === 'change';

		if ($showRejected) {
			return (payment.payment_status === 'register' || payment.payment_status === 'rejected' || payment.payment_status === null) && matchesSearchTerm;
		}

		return matchesSearchTerm && matchesSuccessFilter;
	});

	// Function to determine the badge class based on payment status
	function getBadgeClass(paymentStatus: string): string {
		switch (paymentStatus) {
			case 'success':
				return 'bg-orange-300 text-orange-900 hover:bg-orange-400';
			case 'rejected':
				return 'bg-red-800 text-red-300 hover:bg-red-900';
			case 'system':
				return 'bg-blue-300 text-blue-900 hover:bg-blue-400';
			case 'register':
				return 'bg-gray-300 text-gray-900 hover:bg-gray-400';
			case 'refund':
				return 'bg-red-300 text-red-900 hover:bg-red-400';
			case 'change':
				return 'bg-yellow-300 text-yellow-900 hover:bg-yellow-400';
			default:
				return 'bg-gray-400';
		}
	}
</script>

<!-- HEADER -->
<div class="flex flex-col md:flex-row items-center py-4 md:gap-4 justify-between">
	<div class="flex flex-col md:flex-row md:items-center gap-4 items-left w-full">
		<Input type="text" placeholder="Buscador..." class="w-full md:w-96 border-primary" bind:value={searchTerm} />
		<div class="flex items-center space-x-2">
			<Switch id="rejected-payments" bind:checked={$showRejected} />
			<Label for="rejected-payments">Ver pagos rechazados</Label>
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
					class={`p-6 w-full hover:bg-muted flex justify-between ${payment.ticketAmount === payment.ticketValidated ? 'bg-green-500/10' : ''}`}
				>
					<div class="flex flex-col items-start">
						<span class="text-xs text-primary uppercase">
							{payment.client_id ? payment.client_id : ''}
						</span>
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
							class={getBadgeClass(payment.payment_status)}
						>
							{traductions[payment.payment_status]}
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
