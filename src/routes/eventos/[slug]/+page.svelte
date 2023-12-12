<script lang="ts">
	import type { PageData } from './$types';
	import { createSearchStore, searchHandler } from '$lib/stores/search';
	
	export let data: PageData;

	import Stat from '$lib/components/Stat.svelte';

	import { format } from 'date-fns';
	import es from 'date-fns/locale/es/index';
	import { onDestroy } from 'svelte';


	const searchPayment = data.product?.Payment.map((payment) => {
		return {
			...payment,
			searchTerms: `${payment.customer_name} ${payment.customer_email} ${payment.rut}`
		};
	});

	const searchStore = createSearchStore(searchPayment);

	const unsubscribe = searchStore.subscribe((value) => {
		searchHandler(value);
	});

	onDestroy(() => {
		unsubscribe();
	});

</script>

<header class="flex justify-between gap-4 items-end mb-6 mt-4">
	<Stat
		total={data.total._sum.price}
		ticketsSold={data.ticketsSold._sum.ticketAmount}
		originalStudioStock={data.product?.stock}
	/>
	<label class="form-control w-full max-w-xs">
		<div class="label">
		  <span class="label-text">Busca a través de nombre, rut o email</span>
		</div>
		<input type="text" placeholder="..." class="input input-bordered input-primary w-full max-w-xs" bind:value={$searchStore.search} />
	</label>
</header>
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
			{#each $searchStore.filtered as payment}
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
