<script lang="ts">
	export let data;
	// Add any additional logic or imports here if needed

	console.log(data);

	function showModal(orderId) {
		const modal = document.getElementById(orderId);
		if (modal) {
			modal.showModal();
		}
	}

    let searchTerm = '';

function filterOrders() {
    filteredOrders = data.orders.filter(order =>
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerPhone.includes(searchTerm) ||
        order.customerRut.toLowerCase().includes(searchTerm.toLowerCase())
    );
}

let filteredOrders = data.orders;
</script>

<h1>Ordenes</h1>
<label class="floating-label">
    <span>Buscador</span>
    <input type="text" placeholder="Buscador" class="input input-md mb-4" bind:value={searchTerm} on:input={filterOrders}/>
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
                <td><button class="btn" on:click={() => showModal(order.id)}>open modal</button></td>
                <td> <input type="checkbox" checked="checked" class="checkbox" /></td>
            </tr>
            <dialog id={order.id} class="modal">
                <div class="modal-box">
                    <h3 class="text-lg font-bold">{order.customerName}</h3>
                    <div>
                        {#each order.MerchPayment as merch}
                            <div class="flex flex-col">
                                <div class="flex flex-row">
                                    <span>{merch.Merch.name}</span>
                                    <span>{merch.quantity}</span>
                                    <span>{merch.variationLabel}</span>
                                    <div class="avatar">
                                        <div class="w-24 rounded">
                                            <img src={merch.Merch.image} alt={merch.Merch.name} />
                                        </div>
                                    </div>
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
