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

	function filterOrders() {
		filteredOrders = data.orders.filter(
			(order) =>
				order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
				order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
				order.customerPhone.includes(searchTerm) ||
				order.customerRut.toLowerCase().includes(searchTerm.toLowerCase())
		);
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
			toast.success(`Se marco la orden de ${order.customerName} como ${newDeliveredStatus ? 'entregada' : 'no entregada'}`, {});
		} catch (error) {
			console.error('Error updating delivery status:', error);
		}
	}
</script>

<h1 class="text-2xl font-bold mb-2">Ordenes</h1>
<label class="floating-label">
	<span>Buscador</span>
	<input
		type="text"
		placeholder="Buscador"
		class="input input-md mb-4"
		bind:value={searchTerm}
		on:input={filterOrders}
	/>
</label>

<div class="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
	<table class="table">
		<!-- head -->
		<thead>
			<tr>
				<th>ID de orden</th>
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
					<td class="flex flex-col">
						<span>{order.customerName}</span>
						<span>{order.customerEmail}</span>
						<span>{order.customerPhone}</span>
						<span>{order.customerRut}</span>
					</td>
					<td>{order.deliveryOption}</td>
					<td>
						<div class="badge badge-soft badge-primary">{order.status}</div>
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
							class="checkbox checkbox-primary"
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
