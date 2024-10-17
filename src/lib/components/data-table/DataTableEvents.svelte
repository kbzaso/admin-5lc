<script lang="ts">
	import { createTable, Render, Subscribe, createRender } from 'svelte-headless-table';
	import { readable } from 'svelte/store';
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { addSortBy, addTableFilter } from 'svelte-headless-table/plugins';
	import { ChevronsUpDown, ChevronDown } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import ButtonHref from '../ButtonHref.svelte';
	import { page } from '$app/stores';

	// type Payment = {
	// 	date: string;
	// 	customer_name: string;
	// 	rut: string;
	// 	customer_email: string;
	// 	customer_phone: string;
	// 	price: number;
	// 	ticketAmount: number;
	// 	ticketsType: string;
	// 	buys: {
	// 		amount: number;
	// 		status: string;
	// 	}[];
	// 	// status: 'pending' | 'processing' | 'success' | 'failed';
	// };

	export let Events;

	const table = createTable(readable(Events), {
		sort: addSortBy(),
		filter: addTableFilter({
			fn: ({ filterValue, value }) => value.toLowerCase().includes(filterValue.toLowerCase())
		})
	});

	let columns = table.createColumns([
		table.column({
			accessor: 'date',
			header: 'Fecha',
			cell: ({ value }) => {
				const formatted = new Intl.DateTimeFormat('es-CL', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				}).format(new Date(value));
				return formatted;
			}
		}),
		table.column({
			accessor: 'name',
			header: 'Eventos'
			// filter: {
			// 	exclude: true
			// }
		}),
		table.column({
			accessor: 'totalTicketsSold',
			header: 'Adhesiones'
		}),
		table.column({
			accessor: 'totalPayment',
			header: 'Total recaudado',
			cell: ({ value }) => {
				const formatter = new Intl.NumberFormat('es-CL', {
					style: 'currency',
					currency: 'CLP'
				});
				return formatter.format(value);
			}
		}),
		table.column({
			header: '',
			accessor: ({ id }) => id,
			cell: (item) => {
				return createRender(ButtonHref, { href: `/eventos/${item.value}` });
			},
			plugins: {
				sort: {
					disable: true
				}
			}
		})
	]);

	const { headerRows, pageRows, tableAttrs, tableBodyAttrs, pluginStates, flatColumns } =
		table.createViewModel(columns);
	const { filterValue } = pluginStates.filter;
</script>

<div class="flex items-center py-4">
	<Input class="max-w-sm" placeholder="Filtrar eventos..." type="text" bind:value={$filterValue} />
</div>
<div class="rounded-md border">
	<Table.Root {...$tableAttrs}>
		<Table.Header>
			{#each $headerRows as headerRow}
				<Subscribe rowAttrs={headerRow.attrs()}>
					<Table.Row>
						{#each headerRow.cells as cell (cell.id)}
							<Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
								<Table.Head {...attrs}>
									{#if cell.id === 'totalPayment'}
										<div class="text-right">
											<Render of={cell.render()} />
										</div>
									{:else if cell.id === 'name' || cell.id === 'date'}
										<Button variant="ghost" on:click={props.sort.toggle}>
											<Render of={cell.render()} />
											<ChevronsUpDown class={'ml-2 h-4 w-4'} />
										</Button>
									{:else}
										<Render of={cell.render()} />
									{/if}
								</Table.Head>
							</Subscribe>
						{/each}
					</Table.Row>
				</Subscribe>
			{/each}
		</Table.Header>
		<Table.Body {...$tableBodyAttrs}>
			{#each $pageRows as row (row.id)}
				<Subscribe rowAttrs={row.attrs()} let:rowAttrs>
					<Table.Row {...rowAttrs}>
						{#each row.cells as cell (cell.id)}
							<Subscribe attrs={cell.attrs()} let:attrs>
								<Table.Cell {...attrs}>
									{#if cell.id === 'totalPayment' || cell.id === ''}
										<div class="text-right font-medium">
											<Render of={cell.render()} />
										</div>
									{:else}
										<Render of={cell.render()} />
									{/if}
								</Table.Cell>
							</Subscribe>
						{/each}
					</Table.Row>
				</Subscribe>
			{/each}
		</Table.Body>
	</Table.Root>
</div>
