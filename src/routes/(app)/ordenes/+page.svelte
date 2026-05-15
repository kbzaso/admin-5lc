<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import TableToolbar from '$lib/components/TableToolbar.svelte';
	import { PackageOpen } from 'lucide-svelte';
	import supabaseClient from '$lib/supabaseClient';
	import { toast } from 'svelte-sonner';

	export let data;

	async function toggleMerchDelivered(
		merch: (typeof data.orders)[number]['MerchPayment'][number]
	) {
		const next = !merch.delivered;
		const { error } = await supabaseClient
			.from('MerchPayment')
			.update({ delivered: next, deliveryDate: next ? new Date() : null })
			.eq('id', merch.id);

		if (error) {
			toast.error('No se pudo actualizar el estado de entrega');
			return;
		}

		merch.delivered = next;
		merch.deliveryDate = next ? new Date() : null;
		data = data;
		toast.success(next ? 'Marcado como entregado' : 'Marcado como no entregado');
	}

	let searchTerm = '';
	let showRejected = false;
	let drawerOpen = false;
	let selectedOrder: (typeof data.orders)[number] | null = null;

	function openDrawer(order: (typeof data.orders)[number]) {
		selectedOrder = order;
		drawerOpen = true;
	}

	$: filteredOrders = data.orders.filter((order) => {
		const term = searchTerm.toLowerCase();
		const matchesSearch =
			order.orderId?.toLowerCase().includes(term) ||
			order.id.toLowerCase().includes(term) ||
			order.customerName.toLowerCase().includes(term) ||
			order.customerEmail.toLowerCase().includes(term) ||
			order.customerPhone?.includes(searchTerm) ||
			order.customerRut?.toLowerCase().includes(term);

		const matchesStatus = showRejected ? order.status !== 'success' : order.status === 'success';

		return matchesSearch && matchesStatus;
	});

	function orderType(order: (typeof data.orders)[number]) {
		const hasTickets = order.Payment.length > 0;
		const hasMerch = order.MerchPayment.length > 0;
		if (hasTickets && hasMerch) return 'Tickets + Merch';
		if (hasTickets) return 'Tickets';
		if (hasMerch) return 'Merch';
		return '—';
	}

	function itemCount(order: (typeof data.orders)[number]) {
		const tickets = order.Payment.reduce((sum, p) => sum + p.ticketAmount, 0);
		const merch = order.MerchPayment.reduce((sum, m) => sum + m.quantity, 0);
		return tickets + merch;
	}

	function pendingMerchUnits(order: (typeof data.orders)[number]) {
		return order.MerchPayment.filter((m) => !m.delivered).reduce(
			(sum, m) => sum + m.quantity,
			0
		);
	}

	function hasPendingMerch(order: (typeof data.orders)[number]) {
		return order.status === 'success' && order.MerchPayment.some((m) => !m.delivered);
	}

	$: pendingTotals = data.orders
		.filter((o) => o.status === 'success')
		.reduce(
			(acc, o) => {
				const units = pendingMerchUnits(o);
				if (units > 0) {
					acc.units += units;
					acc.orders += 1;
				}
				return acc;
			},
			{ units: 0, orders: 0 }
		);
</script>

<h1 class="text-2xl font-bold mb-2">Órdenes</h1>

<section class="w-full mb-4">
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<Card.Root class="rounded-xl border-base-content/20 bg-base-300">
			<Card.Header class="flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Merch pendiente de entrega</Card.Title>
				<PackageOpen class="h-4 w-4 text-muted-foreground" aria-hidden="true" />
			</Card.Header>
			<Card.Content>
				<div
					class={`text-2xl font-bold ${
						pendingTotals.units > 0 ? 'text-warning' : 'text-success'
					}`}
				>
					{pendingTotals.units}
				</div>
				<p class="text-xs text-muted-foreground">
					{pendingTotals.units === 1 ? 'unidad' : 'unidades'} en {pendingTotals.orders}
					{pendingTotals.orders === 1 ? 'orden' : 'órdenes'}
				</p>
			</Card.Content>
		</Card.Root>
	</div>
</section>

<TableToolbar
	bind:searchValue={searchTerm}
	placeholder="Buscador..."
	ariaLabel="Buscar órdenes por ID, cliente, email, teléfono o RUT"
>
	<div slot="filters" class="flex items-center space-x-2">
		<Switch id="rejected-orders" bind:checked={showRejected} />
		<Label for="rejected-orders">Mostrar pagos rechazados</Label>
	</div>
</TableToolbar>

<div class="rounded-xl border border-base-content/20 overflow-hidden">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="px-3 sm:px-4">ID de orden</Table.Head>
				<Table.Head class="hidden lg:table-cell">Fecha</Table.Head>
				<Table.Head class="px-3 sm:px-4">Cliente</Table.Head>
				<Table.Head class="hidden md:table-cell">Tipo</Table.Head>
				<Table.Head class="text-right">Total</Table.Head>
				<Table.Head>Estado</Table.Head>
				<Table.Head class="text-right">Items</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each filteredOrders as order (order.id)}
				<Table.Row
					role="button"
					tabindex={0}
					aria-label={`Ver orden de ${order.customerName}`}
					on:click={() => openDrawer(order)}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							openDrawer(order);
						}
					}}
					class={`cursor-pointer hover:bg-base-content/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
						hasPendingMerch(order) ? 'bg-warning/10 border-l-4 border-l-warning' : ''
					}`}
				>
					<Table.Cell class="px-3 py-3 sm:p-4 align-top">
						<span class="text-xs text-primary uppercase break-all">
							{order.orderId ?? order.id}
						</span>
					</Table.Cell>
					<Table.Cell class="hidden lg:table-cell text-xs uppercase text-zinc-400 align-top whitespace-nowrap">
						{new Date(order.createdAt).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
					</Table.Cell>
					<Table.Cell class="px-3 py-3 sm:p-4 align-top">
						<div class="flex flex-col">
							<span class="font-medium md:text-base">{order.customerName}</span>
							<span class="text-xs text-zinc-400">{order.customerEmail}</span>
							{#if order.customerPhone}
								<span class="text-xs text-zinc-400">{order.customerPhone}</span>
							{/if}
							{#if order.customerRut}
								<span class="text-xs text-zinc-400">{order.customerRut}</span>
							{/if}
							<span class="text-xs text-zinc-400 uppercase lg:hidden mt-1">
								{new Date(order.createdAt).toLocaleString('es-CL', {
									timeZone: 'America/Santiago'
								})}
							</span>
						</div>
					</Table.Cell>
					<Table.Cell class="hidden md:table-cell align-top text-sm">{orderType(order)}</Table.Cell>
					<Table.Cell class="text-right whitespace-nowrap align-top">
						${order.totalAmount.toLocaleString('es-CL')}
					</Table.Cell>
					<Table.Cell class="align-top">
						<Badge
							class={order.status === 'success'
								? 'bg-orange-300 text-orange-900 hover:bg-orange-400'
								: 'bg-red-800 text-red-300 hover:bg-red-900'}
						>
							{order.status}
						</Badge>
					</Table.Cell>
					<Table.Cell class="text-right whitespace-nowrap align-top">
						<div class="flex flex-col items-end gap-1">
							<span>{itemCount(order)} items</span>
							{#if hasPendingMerch(order)}
								<Badge class="bg-yellow-300 text-yellow-900 hover:bg-yellow-400 gap-1">
									⚠ {pendingMerchUnits(order)} por entregar
								</Badge>
							{/if}
						</div>
					</Table.Cell>
				</Table.Row>
			{/each}
			{#if filteredOrders.length === 0}
				<Table.Row>
					<Table.Cell colspan={7} class="text-center text-zinc-400 py-8">
						Sin resultados
					</Table.Cell>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>
</div>

<Sheet.Root bind:open={drawerOpen}>
	<Sheet.Content side="bottom" class="max-h-[90vh] flex flex-col overflow-hidden">
		{#if selectedOrder}
			<Sheet.Header>
				<Sheet.Title>Detalle de la orden de {selectedOrder.customerName}</Sheet.Title>
				<Sheet.Description>
					{selectedOrder.orderId ?? selectedOrder.id} · {new Date(
						selectedOrder.createdAt
					).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
				</Sheet.Description>
			</Sheet.Header>

			<div class="flex-1 min-h-0 overflow-y-auto pb-2">
				{#if selectedOrder.Payment.length > 0}
					<h4 class="font-semibold mt-2 mb-2">Entradas</h4>
					<div class="rounded-xl border border-base-content/20 overflow-hidden mb-4">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>ID</Table.Head>
									<Table.Head>Código</Table.Head>
									<Table.Head>Transbank ID</Table.Head>
									<Table.Head>Evento</Table.Head>
									<Table.Head>Tipo</Table.Head>
									<Table.Head>Cantidad</Table.Head>
									<Table.Head>Validados</Table.Head>
									<Table.Head>Precio</Table.Head>
									<Table.Head>Descuento</Table.Head>
									<Table.Head>Fecha</Table.Head>
									<Table.Head>Flags</Table.Head>
									<Table.Head>Estado</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each selectedOrder.Payment as payment}
									<Table.Row>
										<Table.Cell class="font-mono text-xs break-all">{payment.id}</Table.Cell>
										<Table.Cell class="font-mono text-xs">{payment.client_id ?? '—'}</Table.Cell>
										<Table.Cell class="font-mono text-xs break-all">
											{payment.payment_id_service ?? '—'}
										</Table.Cell>
										<Table.Cell>{payment.Product?.name ?? '—'}</Table.Cell>
										<Table.Cell>{payment.ticketsType}</Table.Cell>
										<Table.Cell>{payment.ticketAmount}</Table.Cell>
										<Table.Cell>{payment.ticketValidated}/{payment.ticketAmount}</Table.Cell>
										<Table.Cell class="whitespace-nowrap">
											${payment.price.toLocaleString('es-CL')}
										</Table.Cell>
										<Table.Cell>{payment.discount_code ?? '—'}</Table.Cell>
										<Table.Cell class="whitespace-nowrap">
											{new Date(payment.date).toLocaleString('es-CL', {
												timeZone: 'America/Santiago'
											})}
										</Table.Cell>
										<Table.Cell>
											<div class="flex flex-wrap gap-1">
												{#if payment.refund}
													<Badge class="bg-yellow-300 text-yellow-900 hover:bg-yellow-400">
														Reembolso
													</Badge>
												{/if}
												{#if payment.changeEvent}
													<Badge class="bg-cyan-300 text-cyan-900 hover:bg-cyan-400">Cambio</Badge>
												{/if}
												{#if !payment.refund && !payment.changeEvent}
													<span class="opacity-50">—</span>
												{/if}
											</div>
										</Table.Cell>
										<Table.Cell>
											<Badge
												class={payment.payment_status === 'success'
													? 'bg-orange-300 text-orange-900 hover:bg-orange-400'
													: 'bg-zinc-500 text-zinc-100 hover:bg-zinc-600'}
											>
												{payment.payment_status}
											</Badge>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}

				{#if selectedOrder.MerchPayment.length > 0}
					<h4 class="font-semibold mt-2 mb-2">Merch</h4>
					<div class="rounded-xl border border-base-content/20 overflow-hidden mb-4">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head></Table.Head>
									<Table.Head>ID</Table.Head>
									<Table.Head>Transbank ID</Table.Head>
									<Table.Head>Producto</Table.Head>
									<Table.Head>Variación</Table.Head>
									<Table.Head>Cantidad</Table.Head>
									<Table.Head>Precio</Table.Head>
									<Table.Head>Fecha</Table.Head>
									<Table.Head>Estado</Table.Head>
									<Table.Head>Entregado</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each selectedOrder.MerchPayment as merch}
									<Table.Row>
										<Table.Cell>
											<img
												src={merch.Merch.image}
												alt={merch.Merch.name}
												class="w-12 h-12 rounded object-cover"
											/>
										</Table.Cell>
										<Table.Cell class="font-mono text-xs break-all">{merch.id}</Table.Cell>
										<Table.Cell class="font-mono text-xs break-all">
											{merch.payment_id_service ?? '—'}
										</Table.Cell>
										<Table.Cell>{merch.Merch.name}</Table.Cell>
										<Table.Cell>{merch.variationLabel ?? '—'}</Table.Cell>
										<Table.Cell>{merch.quantity}</Table.Cell>
										<Table.Cell class="whitespace-nowrap">
											${merch.price.toLocaleString('es-CL')}
										</Table.Cell>
										<Table.Cell class="whitespace-nowrap">
											{new Date(merch.date).toLocaleString('es-CL', {
												timeZone: 'America/Santiago'
											})}
										</Table.Cell>
										<Table.Cell>
											<Badge
												class={merch.paymentStatus === 'success'
													? 'bg-orange-300 text-orange-900 hover:bg-orange-400'
													: 'bg-zinc-500 text-zinc-100 hover:bg-zinc-600'}
											>
												{merch.paymentStatus ?? '—'}
											</Badge>
										</Table.Cell>
										<Table.Cell>
											<div class="flex flex-col gap-1">
												<Checkbox
													checked={merch.delivered}
													onCheckedChange={() => toggleMerchDelivered(merch)}
													class="border-green-500 data-[state=checked]:bg-green-500 data-[state=checked]:text-white"
												/>
												{#if merch.delivered && merch.deliveryDate}
													<span class="text-xs opacity-70 whitespace-nowrap">
														{new Date(merch.deliveryDate).toLocaleDateString('es-CL', {
															timeZone: 'America/Santiago'
														})}
													</span>
												{/if}
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}

				{#if selectedOrder.deliveryOption}
					<div class="text-sm">
						<p><span class="font-semibold">Entrega:</span> {selectedOrder.deliveryOption}</p>
						{#if selectedOrder.address}
							<p>
								{selectedOrder.address}{selectedOrder.comuna
									? `, ${selectedOrder.comuna}`
									: ''}{selectedOrder.region ? `, ${selectedOrder.region}` : ''}
							</p>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
