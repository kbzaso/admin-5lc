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

<h1 class="text-4xl font-extrabold text-primary text-wrap">{data.product?.name}</h1>
<header class="flex justify-between flex-col lg:flex-row gap-4 items-end mb-6 mt-4">
	<Stat
		total={data.total._sum.price || 0}
		ticketsSold={data.ticketsSold._sum.ticketAmount || 0}
		originalStudioStock={data.product?.stock || 0}
	/>
	<label class="form-control w-full max-w-md">
		<div class="label">
			<span class="label-text">Busca a través de nombre, rut o email</span>
		</div>
		<input
			type="text"
			placeholder="..."
			class="input input-bordered input-primary w-full"
			bind:value={$searchStore.search}
		/>
	</label>
</header>
<div class="overflow-x-auto">
	<table class="table">
		<!-- head -->
		<thead>
			<tr>
				<!-- <th>Id</th> -->
				<th>Fecha de compra</th>
				<th>Nombre</th>
				<!-- <th>Rut</th> -->
				<th>Email</th>
				<th>Precio</th>
				<th>Nº de entradas</th>
				<th>Pasarela de pago</th>
			</tr>
		</thead>
		<tbody>
			{#each $searchStore.filtered as payment}
				<!-- row 1 -->
				<tr class="hover">
					<td>
						{format(payment.date, 'EEEE d MMMM', { locale: es })} <br/>
						{format(payment.date, 'HH:mm', { locale: es })}
					</td>
					<td>
						{payment.customer_name} <br/>
						{payment.rut ? payment.rut : ''}
					</td>
					<!-- <td>{payment.rut ? payment.rut : ''}</td> -->
					<td>{payment.customer_email}</td>
					<td
						>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
							payment.price
						)}.-</td
					>
					<td>{payment.ticketAmount}</td>
					<td>
						<div class={`badge ${payment.payment_method === 'etpay' ? 'bg-green-800' : 'bg-purple-900'}`}>{payment.payment_method}</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
