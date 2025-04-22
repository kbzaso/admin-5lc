<script lang="ts">
	import supabaseClient from '$lib/supabaseClient';
	import { toast } from 'svelte-sonner';

	export let data;

	function showModal(orderId: string) {
		const modal = document.getElementById(orderId);
		if (modal) {
			(modal as HTMLDialogElement).showModal();
		}
	}

	let searchTerm = '';

	let showRejected = false;

	function toggleFilter() {
		showRejected = !showRejected;
		filterOrders();
	}

	function filterOrders() {
		filteredOrders = data.orders.filter((order) => {
			const matchesSearch =
				order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
				order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
				order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
				order.customerPhone?.includes(searchTerm) ||
				order.customerRut?.toLowerCase().includes(searchTerm.toLowerCase());

			const matchesStatus = showRejected ? order.status !== 'success' : order.status === 'success';

			return matchesSearch && matchesStatus;
		});
	}
	
	let filteredOrders = data.orders;
	

	async function updateDeliveryStatus(orderId: string) {
		try {
			// Find the order to update
			const order = data.orders.find((order) => order.id === orderId);
			if (!order) {
				console.error('Order not found');
				return;
			}

			// Toggle the delivered status
			const newDeliveredStatus = !order.delivered;

			// Update the delivered status in Supabase
			const { error } = await supabaseClient
				.from('Order')
				.update({ delivered: newDeliveredStatus, deliveryDate: new Date() })
				.eq('id', orderId);

			if (error) {
				console.error('Failed to update delivery status:', error.message);
				return;
			}

			// Update the local data to reflect the change
			order.delivered = newDeliveredStatus;
			console.log('Delivery status updated successfully');
			toast.success(
				`Se marco la orden de ${order.customerName} como ${
					newDeliveredStatus ? 'entregada' : 'no entregada'
				}`,
				{}
			);
		} catch (error) {
			console.error('Error updating delivery status:', error);
		}
	}
	filterOrders();
</script>

<h1 class="text-2xl font-bold mb-2">Ordenes</h1>
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
		<input id="filter" type="checkbox" checked={showRejected}  on:change={toggleFilter} class="toggle" />
		<p>Mostrar pagos rechazados</p>
	</div>
</div>

<div class="overflow-x-auto rounded-box border border-base-content/10 bg-base-100">
	<table class="table">
		<!-- head -->
		<thead>
			<tr>
				<th>ID de orden</th>
				<th>Fecha</th>
				<th>Cliente</th>
				<th>Entrega</th>
				<th>Status</th>
				<th>Productos</th>
				<th>Entregada</th>
			</tr>
		</thead>
		<tbody>
			{#each filteredOrders as order}
				<tr class="hover:bg-base-300">
					<th>{order.orderId}</th>
					<th>{new Date(order.createdAt).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</th>
					<td class="flex flex-col">
						<span>{order.customerName}</span>
						<span>{order.customerEmail}</span>
						<span>{order.customerPhone}</span>
						<span>{order.customerRut}</span>
					</td>
					<td>{order.deliveryOption}</td>
					<td>
						<div class={`badge ${order.status === 'success' ? 'badge-success' : 'badge-neutral'}`}>{order.status}</div>
					</td>
					<td
						><button class="link" on:click={() => showModal(order.id)}
							>{#if order.MerchPayment}
								<span>
									{order.MerchPayment.reduce((total, merch) => total + merch.quantity, 0)} items
								</span>
							{/if}</button
						></td
					>
					<td>
						<input
							type="checkbox"
							checked={order.delivered}
							on:change={() => updateDeliveryStatus(order.id)}
							class="checkbox checkbox-success"
						/>
					</td>
				</tr>
				<dialog id={order.id} class="modal modal-bottom sm:modal-middle">
					<div class="modal-box">
						<div class="flex flex-col gap-2">
							<h3 class="text-lg font-bold">Productos que compro {order.customerName}</h3>
							{#each order.MerchPayment as merch}
								<div class="flex flex-row">
									<div class="avatar">
										<div class="w-24 rounded">
											<img src={merch.Merch.image} alt={merch.Merch.name} />
										</div>
									</div>
									<div class="flex flex-col ml-4">
										<span>{merch.Merch.name}</span>
										<span>{merch.quantity}</span>
										<span>{merch.variationLabel}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
					<form method="dialog" class="modal-backdrop">
						<button>close</button>
					</form>
				</dialog>
			{/each}
		</tbody>
	</table>
</div>
