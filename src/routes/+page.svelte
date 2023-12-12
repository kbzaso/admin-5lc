<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	$: ({ products, total } = data);
</script>

<div class="overflow-x-auto">
	<table class="table">
		<!-- head -->
		<thead>
			<tr>
				<th>Id</th>
				<th>Nombre</th>
				<th>Stock original</th>
				<th>Items Vendidos</th>
				<th>$ Generado</th>
			</tr>
		</thead>
		<tbody>
			{#each products as product}
				<!-- row 1 -->
				<tr class="hover">
					<th>{product.id.substring(0, 6)}</th>
					<a href={`/eventos/${product.id}`}>
						<td>{product.name}</td>
					</a>
					<td>{product.stock}</td>
					<!-- <td>{ticketsSold._sum.ticketAmount}</td> -->
					<!-- <td>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
						total._sum.price
					)}.-</td> -->
				</tr>
			{/each}
		</tbody>
	</table>
</div>
