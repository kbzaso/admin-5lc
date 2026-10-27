<script lang="ts">
	import DialogToAddPayments from '../SheetToAddPayments.svelte';
	import { Ticket, MessageSquare, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { page } from '$app/stores';
	import { formatDateToChile } from '$lib';
	import DialogToUpdatePayments from '../SheetToUpdatePayments.svelte';
	import QrScannerDialog from '../QrScannerDialog.svelte';
	import { toast } from 'svelte-sonner';
	import { formatPriceToCLP } from '$lib';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Table from '$lib/components/ui/table';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import TableToolbar from '$lib/components/TableToolbar.svelte';
	import { getContext, setContext, tick } from 'svelte';

	import type { PaymentComment, PaymentRow } from '$lib/stores/payments';
	import { idUpdateDialogOpen } from '$lib/stores/idUpdatePaymentsDialogOpen';
	import {
		categoriesFor,
		selectedCategories,
		onlyUnvalidated,
		isNotFullyValidated,
		showRejected
	} from '$lib/stores/paymentFilter';

	setContext('idUpdateDialogOpen', idUpdateDialogOpen);
	getContext('idUpdateDialogOpen');

	type Payment = PaymentRow;

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
		return payment.payment_status ?? '';
	}
	// Combined value used for search/filter so users can still type 'refund' etc.
	function effectiveStatus(payment: Payment): string {
		if (isRefund(payment)) return 'refund';
		if (isChange(payment)) return 'change';
		return payment.payment_status ?? '';
	}

	export let Payments: Payment[];

	let searchTerm = '';

	let dialogOpen = false;
	let activePaymentId: string | undefined;

	// Derive the active payment from the live list so the open sheet (and its
	// comment list) reflects store updates instead of a snapshot taken on open.
	$: activePayment = activePaymentId ? Payments.find((p) => p.id === activePaymentId) : undefined;

	// Tab the sheet opens on; scans land straight on the validator counter.
	let initialTab: string | undefined;

	// Mount the sheet closed, then open it on the next tick. Svelte 5
	// transitions are local: if the sheet were created already open, its
	// slide-in would be skipped (it's part of the parent block's creation)
	// and the panel would pop in instead of animating.
	async function openDialog(paymentId: string, tab?: string) {
		dialogOpen = false;
		initialTab = tab;
		activePaymentId = paymentId;
		await tick();
		idUpdateDialogOpen.set({ open: true, id: paymentId });
		dialogOpen = true;
	}

	function onScan(e: CustomEvent<string>) {
		const payment = Payments.find((p) => p.id === e.detail);
		if (!payment) {
			toast.error('Esta entrada no pertenece a este evento.');
			return;
		}
		openDialog(payment.id, 'validator');
	}

	$: if (!dialogOpen) {
		idUpdateDialogOpen.set({ open: false, id: '' });
	}

	$: isUbication = $page.data.sell_type === 'ubication';

	// Reactive statement to filter payments based on search term, the rejected
	// switch and the shared category chips (General/Ringside or batch tiers,
	// plus Sistema/Reembolso/Cambio) — the same selection that drives the chart.
	$: filteredPayments = Payments.filter((payment) => {
		const status = effectiveStatus(payment);
		const matchesSearchTerm =
			payment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			payment.rut?.toLowerCase().includes(searchTerm.toLowerCase());

		if ($showRejected) {
			return (
				(status === 'register' || status === 'rejected' || status === null) && matchesSearchTerm
			);
		}

		// Show the row if any category it belongs to is currently selected.
		const matchesCategory = categoriesFor(payment, isUbication).some((c) => $selectedCategories[c]);
		// When active, keep only payments that weren't fully checked in.
		const matchesValidation = !$onlyUnvalidated || isNotFullyValidated(payment);

		return matchesSearchTerm && matchesCategory && matchesValidation;
	});

	// Column sorting. Clicking a sortable header cycles asc → desc → unsorted
	// (which restores the server order: most recent first).
	type SortKey = 'customer_name' | 'status' | 'ticketAmount' | 'price';
	let sortKey: SortKey | null = null;
	let sortDir: 'asc' | 'desc' = 'asc';

	function toggleSort(key: SortKey) {
		if (sortKey !== key) {
			sortKey = key;
			sortDir = 'asc';
		} else if (sortDir === 'asc') {
			sortDir = 'desc';
		} else {
			sortKey = null;
			sortDir = 'asc';
		}
	}

	function sortValue(payment: Payment, key: SortKey): string | number {
		switch (key) {
			case 'customer_name':
				return payment.customer_name?.toLowerCase() ?? '';
			case 'status':
				return effectiveStatus(payment) ?? '';
			case 'ticketAmount':
				return payment.ticketAmount ?? 0;
			case 'price':
				return payment.price ?? 0;
		}
	}

	$: sortedPayments = sortKey
		? [...filteredPayments].sort((a, b) => {
				const av = sortValue(a, sortKey as SortKey);
				const bv = sortValue(b, sortKey as SortKey);
				const cmp =
					typeof av === 'number' && typeof bv === 'number'
						? av - bv
						: String(av).localeCompare(String(bv), 'es');
				return sortDir === 'asc' ? cmp : -cmp;
		  })
		: filteredPayments;

	const sortIcon = (key: SortKey) =>
		sortKey !== key ? ChevronsUpDown : sortDir === 'asc' ? ChevronUp : ChevronDown;

	// Newest-first preview for the comment badge tooltip; the full list lives in
	// the payment sheet's comments tab.
	const MAX_TOOLTIP_COMMENTS = 3;
	function recentComments(payment: Payment) {
		return [...(payment.Comment ?? [])]
			.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			.slice(0, MAX_TOOLTIP_COMMENTS);
	}
	const commentAuthor = (comment: PaymentComment) => comment.name ?? comment.User?.name ?? '';
	const commentDate = (comment: PaymentComment) =>
		new Date(comment.createdAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

	// Outlined (not filled) so the ticket type never reads as a payment status.
	function ticketTypeVariant(ticketsType: string) {
		switch (ticketsType) {
			case 'General':
				return 'outline-info';
			case 'Ringside':
				return 'outline-warning';
			default:
				return 'outline';
		}
	}

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
	<div slot="actions" class="grid grid-cols-2 gap-2 md:flex md:items-center">
		<QrScannerDialog on:scan={onScan} />
		<DialogToAddPayments />
	</div>
</TableToolbar>

<div class="rounded-xl border border-base-content/20 overflow-hidden">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="px-3 sm:px-4">
					<button
						type="button"
						class="flex items-center gap-1 hover:text-base-content"
						on:click={() => toggleSort('customer_name')}
					>
						Cliente
						<svelte:component
							this={sortIcon('customer_name')}
							class="h-3.5 w-3.5"
							aria-hidden="true"
						/>
					</button>
				</Table.Head>
				<Table.Head class="hidden md:table-cell">RUT</Table.Head>
				<Table.Head class="hidden lg:table-cell">Fecha</Table.Head>
				<Table.Head class="hidden sm:table-cell px-3 sm:px-4">
					<button
						type="button"
						class="flex items-center gap-1 hover:text-base-content"
						on:click={() => toggleSort('status')}
					>
						Estado
						<svelte:component this={sortIcon('status')} class="h-3.5 w-3.5" aria-hidden="true" />
					</button>
				</Table.Head>
				<Table.Head class="hidden md:table-cell">Descuento</Table.Head>
				<Table.Head class="hidden sm:table-cell px-3 sm:px-4 text-right">
					<button
						type="button"
						class="ml-auto flex items-center gap-1 hover:text-base-content"
						on:click={() => toggleSort('ticketAmount')}
					>
						Tickets
						<svelte:component
							this={sortIcon('ticketAmount')}
							class="h-3.5 w-3.5"
							aria-hidden="true"
						/>
					</button>
				</Table.Head>
				<Table.Head class="hidden sm:table-cell text-right">
					<button
						type="button"
						class="ml-auto flex items-center gap-1 hover:text-base-content"
						on:click={() => toggleSort('price')}
					>
						Precio
						<svelte:component this={sortIcon('price')} class="h-3.5 w-3.5" aria-hidden="true" />
					</button>
				</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each sortedPayments as payment, i (payment.id)}
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
						<div class="flex min-w-0 flex-col gap-0.5">
							<span class="font-medium md:text-base break-words">{payment.customer_name}</span>
							<span class="text-sm text-zinc-300 break-all">{payment.customer_email}</span>
							{#if payment.customer_phone}
								<span class="text-sm text-zinc-300">{payment.customer_phone}</span>
							{/if}
							<span class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
								{#if payment.client_id}
									<span class="uppercase break-all">{payment.client_id}</span>
								{/if}
								{#if payment.Comment?.length}
									<Tooltip.Root openDelay={200}>
										<Tooltip.Trigger
											class="inline-flex cursor-pointer items-center gap-1 text-primary"
											aria-label={`${payment.Comment.length} comentarios`}
										>
											<MessageSquare class="h-3.5 w-3.5" aria-hidden="true" />
											{payment.Comment.length}
										</Tooltip.Trigger>
										<Tooltip.Content side="right" class="max-w-xs text-left normal-case">
											<ul class="flex flex-col gap-2">
												{#each recentComments(payment) as comment (comment.id)}
													<li class="flex flex-col">
														<span class="text-xs text-primary">
															{commentAuthor(comment)} · {commentDate(comment)}
														</span>
														<span class="break-words">{comment.commentText}</span>
													</li>
												{/each}
											</ul>
											{#if payment.Comment.length > MAX_TOOLTIP_COMMENTS}
												<p class="mt-2 text-xs text-muted-foreground">
													+{payment.Comment.length - MAX_TOOLTIP_COMMENTS} más — abre el pago para verlos
												</p>
											{/if}
										</Tooltip.Content>
									</Tooltip.Root>
								{/if}
								<span class="uppercase lg:hidden">{formatDateToChile(payment.date)}</span>
							</span>
							<div class="mt-2 flex flex-wrap items-center gap-1.5 sm:hidden">
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
								<span class="flex items-center gap-1 text-sm whitespace-nowrap">
									<Ticket class="h-4" aria-hidden="true" />
									{payment.ticketValidated}/{payment.ticketAmount}
									{#if payment.ticketsType && payment.ticketsType !== 'Tandas'}
										<Badge variant={ticketTypeVariant(payment.ticketsType)}>
											{payment.ticketsType}
										</Badge>
									{/if}
								</span>
								<span class="ml-auto text-sm font-medium whitespace-nowrap">
									{formatPriceToCLP(payment.price)}
								</span>
							</div>
							{#if payment.discount_code}
								<span class="md:hidden mt-1">
									Codigo: <code class="font-mono text-xs uppercase tracking-wide text-zinc-300"
										>{payment.discount_code}</code
									>
								</span>
							{/if}
						</div>
					</Table.Cell>
					<Table.Cell class="hidden md:table-cell text-sm align-top">{payment.rut}</Table.Cell>
					<Table.Cell
						class="hidden lg:table-cell text-xs uppercase text-zinc-400 align-top truncate"
					>
						{formatDateToChile(payment.date)}
					</Table.Cell>
					<Table.Cell class="hidden sm:table-cell px-3 py-3 sm:p-4 align-top">
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
							Código: <code class="font-mono text-xs uppercase tracking-wide text-zinc-300"
								>{payment.discount_code}</code
							>
						{:else}
							<span class="text-zinc-500">—</span>
						{/if}
					</Table.Cell>
					<Table.Cell class="hidden sm:table-cell px-3 py-3 sm:p-4 text-right align-top">
						<span class="flex gap-1.5 items-center justify-end whitespace-nowrap">
							<Ticket class="h-4" aria-hidden="true" />
							{payment.ticketValidated}/{payment.ticketAmount}
						</span>
						{#if payment.ticketsType && payment.ticketsType !== 'Tandas'}
							<Badge variant={ticketTypeVariant(payment.ticketsType)} class="mt-1">
								{payment.ticketsType}
							</Badge>
						{/if}
					</Table.Cell>
					<Table.Cell class="hidden sm:table-cell text-right whitespace-nowrap align-top">
						{formatPriceToCLP(payment.price)}
					</Table.Cell>
				</Table.Row>
			{/each}
			{#if sortedPayments.length === 0}
				<Table.Row>
					<Table.Cell colspan={7} class="text-center text-zinc-400 py-8">Sin resultados</Table.Cell>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>
</div>

{#if activePayment}
	<!-- Key on the payment id so the sheet's local state (refundStatus,
	     validatedTickets, …) is reinitialized from the freshly opened payment
	     instead of carrying over from the previous one. -->
	{#key activePayment.id}
		<DialogToUpdatePayments bind:dialogOpen payment={activePayment} {initialTab} />
	{/key}
{/if}
