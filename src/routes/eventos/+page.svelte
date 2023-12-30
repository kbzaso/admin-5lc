<script lang="ts">
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import es from 'date-fns/locale/es/index';
	import { onMount } from 'svelte';

	export let data: PageData;

	$: ({ products } = data);
</script>

<div class="overflow-x-auto">
	<table class="table">
		<!-- head -->
		<thead>
			<tr>
				<th>Fecha</th>
				<th>Evento</th>
				<th>Adhesiones</th>
				<th>$ Generado</th>
			</tr>
		</thead>
		<tbody>
			{#each products as product}
				<!-- row 1 -->
				<tr class="hover">
					<!-- <th>{product.date}</th> -->
					<!-- <th>{format(product.date, 'dd/MM/yyyy', { locale: es })}</th> -->
					<th>--</th>

					<a
						class="hover:underline text-blue-400 hover:text-primary"
						href={`/eventos/${product.id}`}
					>
						<td class="flex gap-2"
							>{product.name}
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 512 512"
								><path
									fill="none"
									stroke="currentColor"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="32"
									d="M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48M336 64h112v112M224 288L440 72"
								/></svg
							></td
						>
					</a>
					<td>{product.totalTicketsSold}</td>
					<td>
						{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
							product.totalPayment
						)}.-</td
					>
					<!-- <td>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
						total._sum.price
					)}.-</td> -->
				</tr>
			{/each}
		</tbody>
	</table>
</div>
