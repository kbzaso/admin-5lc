<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import TableToolbar from '$lib/components/TableToolbar.svelte';
	import { page } from '$app/stores';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';

	export let Events: any[];

	let filterValue = '';
	let selectedYear: string = String(new Date().getFullYear());
	let pageSize: string = '12';

	const PAGE_SIZES = ['12', '24', '36', 'all'] as const;

	$: isValidator = $page.data.validator;

	const dateFormatter = new Intl.DateTimeFormat('es-CL', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
	const priceFormatter = new Intl.NumberFormat('es-CL', {
		style: 'currency',
		currency: 'CLP'
	});

	function formatDate(value: string | Date | undefined) {
		if (!value) return '';
		return dateFormatter.format(new Date(value));
	}

	function getYear(value: string | Date | undefined): number | null {
		if (!value) return null;
		const d = new Date(value);
		return Number.isNaN(d.getTime()) ? null : d.getFullYear();
	}

	$: availableYears = Array.from(
		new Set(Events.map((e) => getYear(e.date)).filter((y): y is number => y !== null))
	).sort((a, b) => b - a);

	$: filteredEvents = Events.filter((event) => {
		const term = filterValue.toLowerCase();
		const matchesSearch =
			!term ||
			event.name?.toLowerCase().includes(term) ||
			formatDate(event.date).toLowerCase().includes(term);

		const matchesYear = selectedYear === 'all' || getYear(event.date) === Number(selectedYear);

		return matchesSearch && matchesYear;
	});

	$: visibleEvents =
		pageSize === 'all' ? filteredEvents : filteredEvents.slice(0, Number(pageSize));

	$: colspan = isValidator ? 3 : 5;

	const selectClass =
		'h-11 w-full rounded-md border border-base-content/20 bg-background pl-3 pr-9 text-base appearance-none cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
</script>

<TableToolbar
	bind:searchValue={filterValue}
	placeholder="Filtrar eventos..."
	ariaLabel="Filtrar eventos por nombre o fecha"
>
	<div slot="filters" class="flex flex-col sm:flex-row gap-3">
		<div class="flex items-center gap-2">
			<Label for="event-year" class="whitespace-nowrap">Año</Label>
			<div class="relative">
				<select id="event-year" bind:value={selectedYear} class={selectClass}>
					<option value="all">Todos</option>
					{#each availableYears as year}
						<option value={String(year)}>{year}</option>
					{/each}
				</select>
				<ChevronDown
					class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60"
					aria-hidden="true"
				/>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<Label for="event-page-size" class="whitespace-nowrap">Mostrar</Label>
			<div class="relative">
				<select id="event-page-size" bind:value={pageSize} class={selectClass}>
					{#each PAGE_SIZES as size}
						<option value={size}>{size === 'all' ? 'Todos' : size}</option>
					{/each}
				</select>
				<ChevronDown
					class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60"
					aria-hidden="true"
				/>
			</div>
		</div>
	</div>
</TableToolbar>

<div class="rounded-xl border border-base-content/20 overflow-hidden">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="hidden md:table-cell">Fecha</Table.Head>
				<Table.Head>Eventos</Table.Head>
				{#if !isValidator}
					<Table.Head class="hidden md:table-cell text-right">Adhesiones</Table.Head>
					<Table.Head class="hidden md:table-cell text-right">Total recaudado</Table.Head>
				{/if}
				<Table.Head class="text-right"></Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each visibleEvents as event (event.id)}
				<Table.Row>
					<Table.Cell class="hidden md:table-cell whitespace-nowrap">
						{formatDate(event.date)}
					</Table.Cell>
					<Table.Cell class="font-medium">
						<div class="flex flex-col">
							<span>{event.name}</span>
							<span class="text-xs text-zinc-400 md:hidden">{formatDate(event.date)}</span>
						</div>
					</Table.Cell>
					{#if !isValidator}
						<Table.Cell class="hidden md:table-cell text-right">
							{event.totalTicketsSold}
						</Table.Cell>
						<Table.Cell class="hidden md:table-cell text-right font-medium whitespace-nowrap">
							{priceFormatter.format(event.totalPayment ?? 0)}
						</Table.Cell>
					{/if}
					<Table.Cell class="text-right">
						<Button href={`/eventos/${event.id}`}>Detalle</Button>
					</Table.Cell>
				</Table.Row>
			{/each}
			{#if visibleEvents.length === 0}
				<Table.Row>
					<Table.Cell {colspan} class="text-center text-zinc-400 py-8">
						Sin resultados
					</Table.Cell>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>
</div>

<p class="text-xs text-muted-foreground mt-2">
	Mostrando {visibleEvents.length} de {filteredEvents.length}
	{filteredEvents.length === 1 ? 'evento' : 'eventos'}
</p>
