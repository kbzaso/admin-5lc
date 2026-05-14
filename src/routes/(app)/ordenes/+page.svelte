<script lang="ts">
	import * as Drawer from '$lib/components/ui/drawer';

	export let data;

	let searchTerm = '';
	let showRejected = false;
	let drawerOpen = false;
	let selectedOrder: (typeof data.orders)[number] | null = null;

	function openDrawer(order: (typeof data.orders)[number]) {
		selectedOrder = order;
		drawerOpen = true;
	}

	function toggleFilter() {
		showRejected = !showRejected;
		filterOrders();
	}

	function filterOrders() {
		filteredOrders = data.orders.filter((order) => {
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
	}

	let filteredOrders = data.orders;

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

	filterOrders();
</script>

<h1 class="text-2xl font-bold mb-2">Órdenes</h1>
<div class="flex flex-col md:flex-row gap-2 md:gap-4 w-full">
	<label class="floating-label">
		<span>Buscador</span>
		<input
			type="text"
			placeholder="Buscador"
			class="input input-md w-full md:w-96 mb-4"
			bind:value={searchTerm}
			on:input={filterOrders}
		/>
	</label>
	<div class="flex items-center gap-2 mb-4">
		<input
			id="filter"
			type="checkbox"
			checked={showRejected}
			on:change={toggleFilter}
			class="toggle"
		/>
		<p>Mostrar pagos rechazados</p>
	</div>
</div>

<!-- Desktop / tablet: table -->
<div class="hidden md:block overflow-x-auto rounded-box border border-base-content/10 bg-base-100">
	<table class="table">
		<thead>
			<tr>
				<th>ID de orden</th>
				<th>Fecha</th>
				<th>Cliente</th>
				<th>Tipo</th>
				<th>Total</th>
				<th>Status</th>
				<th>Items</th>
			</tr>
		</thead>
		<tbody>
			{#each filteredOrders as order}
				<tr
					class="hover:bg-base-300 cursor-pointer"
					on:click={() => openDrawer(order)}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							openDrawer(order);
						}
					}}
					tabindex="0"
					role="button"
				>
					<th class="whitespace-normal break-all">{order.orderId ?? order.id}</th>
					<th class="whitespace-nowrap"
						>{new Date(order.createdAt).toLocaleString('es-CL', {
							timeZone: 'America/Santiago'
						})}</th
					>
					<td class="flex flex-col">
						<span>{order.customerName}</span>
						<span>{order.customerEmail}</span>
						<span>{order.customerPhone}</span>
						<span>{order.customerRut}</span>
					</td>
					<td>{orderType(order)}</td>
					<td class="whitespace-nowrap">${order.totalAmount.toLocaleString('es-CL')}</td>
					<td>
						<div
							class={`badge ${order.status === 'success' ? 'badge-success' : 'badge-neutral'}`}
						>
							{order.status}
						</div>
					</td>
					<td class="whitespace-nowrap">{itemCount(order)} items</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<!-- Mobile: card list -->
<div class="md:hidden flex flex-col gap-2">
	{#each filteredOrders as order}
		<button
			type="button"
			class="text-left rounded-box border border-base-content/10 bg-base-100 p-3 hover:bg-base-200 transition-colors"
			on:click={() => openDrawer(order)}
		>
			<div class="flex justify-between items-start gap-2 mb-2">
				<div class="flex flex-col min-w-0">
					<span class="font-semibold truncate">{order.orderId ?? order.id}</span>
					<span class="text-xs opacity-70">
						{new Date(order.createdAt).toLocaleString('es-CL', {
							timeZone: 'America/Santiago'
						})}
					</span>
				</div>
				<div
					class={`badge shrink-0 ${
						order.status === 'success' ? 'badge-success' : 'badge-neutral'
					}`}
				>
					{order.status}
				</div>
			</div>

			<div class="flex flex-col text-sm mb-2">
				<span class="font-medium">{order.customerName}</span>
				<span class="opacity-70 truncate">{order.customerEmail}</span>
				{#if order.customerPhone}
					<span class="opacity-70">{order.customerPhone}</span>
				{/if}
				{#if order.customerRut}
					<span class="opacity-70">{order.customerRut}</span>
				{/if}
			</div>

			<div class="flex justify-between items-center gap-2 text-sm">
				<div class="flex flex-col">
					<span class="opacity-70">{orderType(order)}</span>
					<span class="font-semibold">${order.totalAmount.toLocaleString('es-CL')}</span>
				</div>
				<span class="opacity-70">{itemCount(order)} items</span>
			</div>
		</button>
	{/each}
</div>

<Drawer.Root bind:open={drawerOpen}>
	<Drawer.Content class="max-h-[90vh]">
		{#if selectedOrder}
			<Drawer.Header>
				<Drawer.Title>Detalle de la orden de {selectedOrder.customerName}</Drawer.Title>
				<Drawer.Description>
					{selectedOrder.orderId ?? selectedOrder.id} · {new Date(
						selectedOrder.createdAt
					).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
				</Drawer.Description>
			</Drawer.Header>

			<div class="px-4 pb-6 overflow-y-auto">
				{#if selectedOrder.Payment.length > 0}
					<h4 class="font-semibold mt-2 mb-2">Entradas</h4>
					<div class="overflow-x-auto rounded-box border border-base-content/10 bg-base-100 mb-4">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>ID</th>
									<th>Código</th>
									<th>Transbank ID</th>
									<th>Evento</th>
									<th>Tipo</th>
									<th>Cantidad</th>
									<th>Validados</th>
									<th>Precio</th>
									<th>Descuento</th>
									<th>Fecha</th>
									<th>Flags</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{#each selectedOrder.Payment as payment}
									<tr>
										<td class="font-mono text-xs break-all">{payment.id}</td>
										<td class="font-mono text-xs">{payment.client_id ?? '—'}</td>
										<td class="font-mono text-xs break-all"
											>{payment.payment_id_service ?? '—'}</td
										>
										<td>{payment.Product?.name ?? '—'}</td>
										<td>{payment.ticketsType}</td>
										<td>{payment.ticketAmount}</td>
										<td>{payment.ticketValidated}/{payment.ticketAmount}</td>
										<td class="whitespace-nowrap">${payment.price.toLocaleString('es-CL')}</td>
										<td>{payment.discount_code ?? '—'}</td>
										<td class="whitespace-nowrap">
											{new Date(payment.date).toLocaleString('es-CL', {
												timeZone: 'America/Santiago'
											})}
										</td>
										<td>
											<div class="flex flex-wrap gap-1">
												{#if payment.refund}
													<div class="badge badge-warning badge-sm">Reembolso</div>
												{/if}
												{#if payment.changeEvent}
													<div class="badge badge-info badge-sm">Cambio</div>
												{/if}
												{#if !payment.refund && !payment.changeEvent}
													<span class="opacity-50">—</span>
												{/if}
											</div>
										</td>
										<td>
											<div
												class={`badge ${
													payment.payment_status === 'success'
														? 'badge-success'
														: 'badge-neutral'
												}`}
											>
												{payment.payment_status}
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}

				{#if selectedOrder.MerchPayment.length > 0}
					<h4 class="font-semibold mt-2 mb-2">Merch</h4>
					<div class="overflow-x-auto rounded-box border border-base-content/10 bg-base-100 mb-4">
						<table class="table table-sm">
							<thead>
								<tr>
									<th></th>
									<th>ID</th>
									<th>Transbank ID</th>
									<th>Producto</th>
									<th>Variación</th>
									<th>Cantidad</th>
									<th>Precio</th>
									<th>Fecha</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{#each selectedOrder.MerchPayment as merch}
									<tr>
										<td>
											<div class="avatar">
												<div class="w-12 rounded">
													<img src={merch.Merch.image} alt={merch.Merch.name} />
												</div>
											</div>
										</td>
										<td class="font-mono text-xs break-all">{merch.id}</td>
										<td class="font-mono text-xs break-all"
											>{merch.payment_id_service ?? '—'}</td
										>
										<td>{merch.Merch.name}</td>
										<td>{merch.variationLabel ?? '—'}</td>
										<td>{merch.quantity}</td>
										<td class="whitespace-nowrap">${merch.price.toLocaleString('es-CL')}</td>
										<td class="whitespace-nowrap">
											{new Date(merch.date).toLocaleString('es-CL', {
												timeZone: 'America/Santiago'
											})}
										</td>
										<td>
											<div
												class={`badge ${
													merch.paymentStatus === 'success'
														? 'badge-success'
														: 'badge-neutral'
												}`}
											>
												{merch.paymentStatus ?? '—'}
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
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
	</Drawer.Content>
</Drawer.Root>
