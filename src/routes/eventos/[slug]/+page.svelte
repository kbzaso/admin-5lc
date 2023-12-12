<script lang="ts">
	import type { PageData } from './$types';

	import Stat from '$lib/components/Stat.svelte';

	import { format } from 'date-fns';
	import es from 'date-fns/locale/es/index';
	import { utcToZonedTime } from 'date-fns-tz';

	export let data: PageData;

	let filter = '';

	// Function to filter payments
	function filterPayments() {
		const filteredPayments = payments.filter((payment) => payment.includes(filter));
		// Do something with filteredPayments
	}
</script>

<input type="text" bind:value={filter} on:input={filterPayments} placeholder="Filter payments..." />
<section class="flex justify-center">
	<Stat
		total={data.total._sum.price}
		ticketsSold={data.ticketsSold._sum.ticketAmount}
		originalStudioStock={data.product?.stock}
	/>
</section>
<div class="overflow-x-auto">
	<table class="table">
		<!-- head -->
		<thead>
			<tr>
				<!-- <th>Id</th> -->
				<th>Nombre</th>
				<th>Rut</th>
				<th>Email</th>
				<th>Precio</th>
				<th>Entradas</th>
				<th>Fecha de compra</th>
			</tr>
		</thead>
		<tbody>
			{#each data.product?.Payment as payment}
				<!-- row 1 -->
				<tr class="hover">
					<!-- <th>{payment.id.substring(0, 6)}</th> -->
					<td>{payment.customer_name}</td>
					<td>{payment.rut}</td>
					<td>{payment.customer_email}</td>
					<td
						>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
							payment.price
						)}.-</td
					>
					<td>{payment.ticketAmount}</td>
					<td
						>{format(payment.date, 'EEEE d MMMM', { locale: es })} - {format(
							payment.date,
							'HH:mm',
							{ locale: es }
						)}</td
					>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
