<script lang="ts">
	import type { PageData } from './$types';
	import * as Table from '$lib/components/ui/table';
	import Navbar from '$lib/components/Navbar.svelte';
	import * as Card from '$lib/components/ui/card/index.js';

	export let data: PageData;

	$: ({ events } = data);
</script>

<Navbar />

<Card.Root
	data-x-chunk-name="card-03"
	data-x-chunk-description="Una tarjeta que muestra el monto total generado por la venta de entradas."
>
	<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
		<!-- <Card.Title class="text-xl font-medium">Monto generado</Card.Title> -->
		<!-- <DollarSign class="h-4 w-4 text-muted-foreground" /> -->
	</Card.Header>
	<Card.Content>
		<Table.Root>
			<Table.Caption>Lista de los eventos recientes.</Table.Caption>
			<Table.Header>
				<Table.Row>
					<Table.Head>Evento</Table.Head>
					<Table.Head>Fecha</Table.Head>
					<Table.Head>Adhesiones</Table.Head>
					<Table.Head class="text-right">Monto Generado</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each events as event}
					<Table.Row>
						<a
							class="text-yellow-400 hover:underline"
							href={`/eventos/${event.id}`}
							title="link al evento"
						>
							<Table.Cell class="font-medium">{event.name}</Table.Cell>
						</a>
						<Table.Cell
							>{new Date(event.date).toLocaleDateString('es-CL', { dateStyle: 'full' })}</Table.Cell
						>
						<Table.Cell>{event.totalTicketsSold}</Table.Cell>
						<Table.Cell class="text-right"
							>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
								event.totalPayment
							)}.-</Table.Cell
						>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</Card.Content>
</Card.Root>
