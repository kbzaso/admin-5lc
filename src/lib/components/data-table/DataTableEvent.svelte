<script lang="ts">
	import { createTable, Render, Subscribe } from 'svelte-headless-table';
	import { readable } from 'svelte/store';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import { addSortBy, addTableFilter, addHiddenColumns } from 'svelte-headless-table/plugins';
	import { ChevronsUpDown, ChevronDown } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { TANDAS_NAMES } from '$lib/consts';
	export let sellType: string;

	type Payment = {
		date: string;
		customer_name: string;
		rut: string;
		customer_email: string;
		customer_phone: string;
		price: number;
		ticketAmount: number;
		ticketsType: string;
		buys: {
			amount: number;
			status: string;
		}[];
		// status: 'pending' | 'processing' | 'success' | 'failed';
	};

	export let Payments: Payment[];

	const table = createTable(readable(Payments), {
		sort: addSortBy(),
		filter: addTableFilter({
			fn: ({ filterValue, value }) => value.toLowerCase().includes(filterValue.toLowerCase())
		}),
		hide: addHiddenColumns()
	});

	let columns;

	if (sellType === 'batch') {
		columns = table.createColumns([
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
				},
				filter: {
					exclude: true
				}
			}),
			table.column({
				accessor: 'customer_name',
				header: 'Comprador'
			}),
			table.column({
				accessor: 'rut',
				header: 'Rut'
			}),
			table.column({
				accessor: 'customer_email',
				header: 'Email'
			}),
			table.column({
				accessor: 'customer_phone',
				header: 'Teléfono',
				filter: {
					exclude: true
				}
			}),
			table.column({
				accessor: 'price',
				header: 'Pagó',
				plugins: {
					sort: {
						disable: true
					}
				},
				cell: ({ value }) => {
					const formatted = new Intl.NumberFormat('es-CL', {
						style: 'currency',
						currency: 'CLP'
					}).format(value);
					return formatted;
				},
				filter: {
					exclude: true
				}
			}),
			table.column({
				accessor: 'discount_code',
				header: 'Código de dscto.'
			}),
			table.column({
				accessor: 'buys',
				header: 'Compras',
				cell: ({ value }) => {
					let output = '';
					for (const [key, innerValue] of Object.entries(value)) {
						if (innerValue.amount > 0) {
							output += `${TANDAS_NAMES[key]}: ${innerValue.amount} </br>`;
						}
					}
					// Remove the trailing comma and space
					return output.slice(0, -2);
				},
				filter: {
					exclude: true
				}
			})
		]);
	} else {
		columns = table.createColumns([
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
				},
				filter: {
					exclude: true
				}
			}),
			table.column({
				accessor: 'customer_name',
				header: 'Comprador'
			}),
			table.column({
				accessor: 'rut',
				header: 'Rut'
			}),
			table.column({
				accessor: 'customer_email',
				header: 'Email'
			}),
			table.column({
				accessor: 'customer_phone',
				header: 'Teléfono',
				filter: {
					exclude: true
				}
			}),
			table.column({
				accessor: 'price',
				header: 'Pagó',
				plugins: {
					sort: {
						disable: true
					}
				},
				cell: ({ value }) => {
					const formatted = new Intl.NumberFormat('es-CL', {
						style: 'currency',
						currency: 'CLP'
					}).format(value);
					return formatted;
				},
				filter: {
					exclude: true
				}
			}),
			table.column({
				accessor: 'discount_code',
				header: 'Código de dscto.'
			}),
			table.column({
				accessor: 'ticketAmount',
				header: 'Cant.',
				filter: {
					exclude: true
				}
			}),
			table.column({
				accessor: 'ticketsType',
				header: 'Tipo de entrada',
				filter: {
					exclude: true
				}
			})
		]);
	}

	const { headerRows, pageRows, tableAttrs, tableBodyAttrs, pluginStates, flatColumns } =
		table.createViewModel(columns);
	const { filterValue } = pluginStates.filter;
	const { hiddenColumnIds } = pluginStates.hide;

	const ids = flatColumns.map((col) => col.id);
	let hideForId = Object.fromEntries(ids.map((id) => [id, true]));

	$: $hiddenColumnIds = Object.entries(hideForId)
		.filter(([, hide]) => !hide)
		.map(([id]) => id);

	const hidableCols = ['date', 'rut', 'customer_phone', 'price', 'ticketAmount', 'ticketsType'];
</script>

<div class="flex items-center py-4">
	<Input class="max-w-sm" placeholder="Filter emails..." type="text" bind:value={$filterValue} />
	<DropdownMenu.Root>
		<DropdownMenu.Trigger asChild let:builder>
			<Button variant="outline" class="ml-auto" builders={[builder]}>
				Columnas <ChevronDown class="ml-2 h-4 w-4" />
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content>
			{#each flatColumns as col}
				{#if hidableCols.includes(col.id)}
					<DropdownMenu.CheckboxItem bind:checked={hideForId[col.id]}>
						{col.header}
					</DropdownMenu.CheckboxItem>
				{/if}
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
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
									{#if cell.id === 'amount'}
										<div class="text-right">
											<Render of={cell.render()} />
										</div>
									{:else if cell.id === 'customer_email' || cell.id === 'date' || cell.id === 'customer_name'}
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
									{#if cell.id === 'amount'}
										<div class="text-right font-medium">
											<Render of={cell.render()} />
										</div>
									{:else if cell.id === 'status'}
										<div class="capitalize">
											<Render of={cell.render()} />
										</div>
									{:else if cell.id === 'buys'}
										{@html cell.render()}
									{:else if cell.id === 'discount_code'}
										{#if cell.render() !== ''}
											<Badge><Render of={cell.render()} /></Badge>
										{/if}
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
