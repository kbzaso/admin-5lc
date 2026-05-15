<script lang="ts">
	import { TANDAS_NAMES } from '$lib/consts';
	import DialogToAddPayments from '../SheetToAddPayments.svelte';
	import { Ticket, MessageSquare } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { page } from '$app/stores';
	import { formatDateToChile } from '$lib';
	import DialogToUpdatePayments from '../SheetToUpdatePayments.svelte';
	import { formatPriceToCLP } from '$lib';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Table from '$lib/components/ui/table';
	import TableToolbar from '$lib/components/TableToolbar.svelte';
	import { getContext, setContext } from 'svelte';

	import { idUpdateDialogOpen } from '$lib/stores/idUpdatePaymentsDialogOpen';
	import { writable } from 'svelte/store';

	setContext('idUpdateDialogOpen', idUpdateDialogOpen);
	getContext('idUpdateDialogOpen');

	type Payment = {
		Comment: {
			createdAt: string;
			commentText: string;
			userId: string;
			id: string;
		}[];
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
		discount_code: string | null;
		refund: boolean;
		changeEvent: boolean;
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

	// Refund / change are boolean flags layered on top of the origin status
	// (success/system). Fall back to legacy payment_status values for rows
	// written before that split.
	const isRefund = (p: Payment) => p.refund || p.payment_status === 'refund';
	const isChange = (p: Payment) => p.changeEvent || p.payment_status === 'change';
	function originStatus(payment: Payment): string {
		// Legacy rows where the origin was overwritten with 'refund'/'change'
		// have already been backfilled to 'success', so this is safe.
		if (payment.payment_status === 'refund' || payment.payment_status === 'change') {
			return 'success';
		}
		return payment.payment_status;
	}
	// Combined value used for search/filter so users can still type 'refund' etc.
	function effectiveStatus(payment: Payment): string {
		if (isRefund(payment)) return 'refund';
		if (isChange(payment)) return 'change';
		return payment.payment_status;
	}

	export let Payments: Payment[];

	let searchTerm = '';

	let dialogOpen = false;
	let activePayment: Payment | undefined;

	function openDialog(paymentId: string) {
		activePayment = Payments.find((p) => p.id === paymentId);
		idUpdateDialogOpen.set({ open: true, id: paymentId });
		dialogOpen = true;
	}

	$: if (!dialogOpen) {
		idUpdateDialogOpen.set({ open: false, id: '' });
	}

	let showRejected = writable(false);

	// Reactive statement to filter payments based on search term and switch state
	$: filteredPayments = Payments.filter((payment) => {
		const status = effectiveStatus(payment);
		const matchesSearchTerm =
			payment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.rut?.toLowerCase().includes(searchTerm.toLowerCase());

		const matchesSuccessFilter =
			$showRejected ||
			status === 'success' ||
			status === 'system' ||
			status === 'refund' ||
			status === 'change';

		if ($showRejected) {
			return (
				(status === 'register' || status === 'rejected' || status === null) && matchesSearchTerm
			);
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
				return 'bg-cyan-300 text-cyan-900 hover:bg-cyan-400';
			default:
				return 'bg-gray-400';
		}
	}
</script>

<!-- HEADER -->
<TableToolbar
	bind:searchValue={searchTerm}
	placeholder="Buscador..."
	ariaLabel="Buscar pagos por nombre, email, teléfono, estado o RUT"
>
	<div slot="filters" class="flex items-center space-x-2">
		<Switch id="rejected-payments" bind:checked={$showRejected} />
		<Label for="rejected-payments">Ver pagos rechazados</Label>
	</div>
	<DialogToAddPayments slot="actions" />
</TableToolbar>

<div class="rounded-xl border border-base-content/20 overflow-hidden">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="px-3 sm:px-4">Cliente</Table.Head>
				<Table.Head class="hidden md:table-cell">RUT</Table.Head>
				<Table.Head class="hidden lg:table-cell">Fecha</Table.Head>
				<Table.Head class="px-3 sm:px-4">Estado</Table.Head>
				<Table.Head class="hidden md:table-cell">Descuento</Table.Head>
				<Table.Head class="px-3 sm:px-4 text-right">Tickets</Table.Head>
				<Table.Head class="hidden sm:table-cell text-right">Precio</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each filteredPayments as payment, i (payment.id)}
				<Table.Row
					id={i.toString()}
					role="button"
					tabindex={0}
					aria-label={`Ver pago de ${payment.customer_name}`}
					on:click={() => openDialog(payment.id)}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							openDialog(payment.id);
						}
					}}
					class={`cursor-pointer hover:bg-base-content/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
						payment.ticketAmount === payment.ticketValidated ? 'bg-green-500/10' : ''
					}`}
				>
					<Table.Cell class="px-3 py-3 sm:p-4 align-top">
						<div class="flex flex-col">
							<span class="text-xs text-primary uppercase flex gap-1.5 items-center">
								{payment.client_id ? payment.client_id : ''}
								{#if payment.Comment?.length > 0}
									<Badge variant="default"><MessageSquare class="h-3" aria-hidden="true" />{payment.Comment.length}</Badge>
								{/if}
							</span>
							<span class="font-medium md:text-base">{payment.customer_name}</span>
							<span class="text-xs text-zinc-400">{payment.customer_email}</span>
							{#if payment.customer_phone}
								<span class="text-xs text-zinc-400">{payment.customer_phone}</span>
							{/if}
							<span class="text-xs text-zinc-400 md:hidden">{payment.rut}</span>
							<span class="text-xs text-zinc-400 uppercase lg:hidden">
								{formatDateToChile(payment.date)}
							</span>
							{#if payment.discount_code}
								<span class="md:hidden mt-1">
									<Badge variant="outline">{payment.discount_code}</Badge>
								</span>
							{/if}
						</div>
					</Table.Cell>
					<Table.Cell class="hidden md:table-cell text-sm align-top">{payment.rut}</Table.Cell>
					<Table.Cell class="hidden lg:table-cell text-xs uppercase text-zinc-400 align-top truncate">
						{formatDateToChile(payment.date)}
					</Table.Cell>
					<Table.Cell class="px-3 py-3 sm:p-4 align-top">
						<div class="flex flex-wrap gap-1.5">
							<Badge class={getBadgeClass(originStatus(payment))}>
								{traductions[originStatus(payment)]}
							</Badge>
							{#if isRefund(payment)}
								<Badge class={getBadgeClass('refund')}>{traductions.refund}</Badge>
							{/if}
							{#if isChange(payment)}
								<Badge class={getBadgeClass('change')}>{traductions.change}</Badge>
							{/if}
							{#if payment.ticketAmount === payment.ticketValidated}
								<Badge class="bg-green-400 hover:bg-green-500">Validado</Badge>
							{/if}
						</div>
					</Table.Cell>
					<Table.Cell class="hidden md:table-cell align-top">
						{#if payment.discount_code}
							<Badge variant="outline">{payment.discount_code}</Badge>
						{:else}
							<span class="text-zinc-500">—</span>
						{/if}
					</Table.Cell>
					<Table.Cell class="px-3 py-3 sm:p-4 text-right align-top">
						<span class="flex gap-1.5 items-center justify-end whitespace-nowrap">
							<Ticket class="h-4" aria-hidden="true" />
							{payment.ticketValidated}/{payment.ticketAmount}
							<span class="hidden md:inline">
								{$page.data.eventFromSanityStudio?.sell_type === 'batch' ? '' : payment.ticketsType}
							</span>
						</span>
					</Table.Cell>
					<Table.Cell class="hidden sm:table-cell text-right whitespace-nowrap align-top">
						{formatPriceToCLP(payment.price)}
					</Table.Cell>
				</Table.Row>
			{/each}
			{#if filteredPayments.length === 0}
				<Table.Row>
					<Table.Cell colspan={7} class="text-center text-zinc-400 py-8">Sin resultados</Table.Cell>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>
</div>

{#if activePayment}
	<DialogToUpdatePayments bind:dialogOpen payment={activePayment} />
{/if}
