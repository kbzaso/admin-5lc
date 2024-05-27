<script lang="ts">
	import type { PageData } from './$types';
	import { format } from 'date-fns';
	import es from 'date-fns/locale/es/index';
	import { onMount } from 'svelte';

	export let data: PageData;

	$: ({ events } = data);
</script>

<div class="overflow-x-auto">
	<table class="table">
		<!-- head -->
		<thead>
			<tr>
				<th>Evento</th>
				<th>Fecha</th>
				<th>Adhesiones</th>
				<th>$ Generado</th>
			</tr>
		</thead>
		<tbody>
			{#each events as  event}
				<!-- row 1 -->
				<tr class="hover">
					<a
						class="hover:underline text-blue-400 hover:text-primary"
						href={`/eventos/${event.id}`}
					>
						<td class="flex gap-2"
							>{event.name}</td
						>
					</a>
					<th>{new Date(event.date).toLocaleDateString('es-CL', { dateStyle: 'full' })}</th>
					

					<td>{event.totalTicketsSold}</td>
					<td>
						{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
							event.totalPayment
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
