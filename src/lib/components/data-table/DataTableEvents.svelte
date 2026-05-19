<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Label } from '$lib/components/ui/label';
	import TableToolbar from '$lib/components/TableToolbar.svelte';
	import EventsBarChart from '$lib/components/data-table/EventsBarChart.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-svelte';

	export let Events: any[];

	let filterValue = '';
	let selectedYear: string = String(new Date().getFullYear());
	let pageSize: string = '12';
	let chartMetric: 'revenue' | 'tickets' = 'revenue';

	type SortKey = 'date' | 'name' | 'totalTicketsSold' | 'totalPayment';
	let sortKey: SortKey = 'date';
	let sortDir: 'asc' | 'desc' = 'desc';

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = key === 'name' ? 'asc' : 'desc';
		}
	}

	function compareValues(a: unknown, b: unknown): number {
		const aNull = a === null || a === undefined || a === '';
		const bNull = b === null || b === undefined || b === '';
		if (aNull && bNull) return 0;
		if (aNull) return 1;
		if (bNull) return -1;

		if (typeof a === 'number' && typeof b === 'number') return a - b;
		if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
		return String(a).localeCompare(String(b), 'es', { sensitivity: 'base' });
	}

	function getSortValue(event: Record<string, unknown>, key: SortKey) {
		if (key === 'date') return event.date ? new Date(event.date as string | Date) : null;
		if (key === 'name') return (event.name as string) ?? '';
		return (event[key] as number) ?? 0;
	}

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

	$: sortedEvents = [...filteredEvents].sort((a, b) => {
		const cmp = compareValues(getSortValue(a, sortKey), getSortValue(b, sortKey));
		return sortDir === 'asc' ? cmp : -cmp;
	});

	$: visibleEvents =
		pageSize === 'all' ? sortedEvents : sortedEvents.slice(0, Number(pageSize));

	$: colspan = isValidator ? 2 : 4;

	const selectClass = 'select select-bordered w-full';
</script>

<TableToolbar
	bind:searchValue={filterValue}
	placeholder="Filtrar eventos..."
	ariaLabel="Filtrar eventos por nombre o fecha"
>
	<div slot="filters" class="flex flex-col sm:flex-row gap-3">
		<div class="flex items-center gap-2">
			<Label for="event-year" class="whitespace-nowrap">Año</Label>
			<select id="event-year" bind:value={selectedYear} class={selectClass}>
				<option value="all">Todos</option>
				{#each availableYears as year}
					<option value={String(year)}>{year}</option>
				{/each}
			</select>
		</div>
		<div class="flex items-center gap-2">
			<Label for="event-page-size" class="whitespace-nowrap">Mostrar</Label>
			<select id="event-page-size" bind:value={pageSize} class={selectClass}>
				{#each PAGE_SIZES as size}
					<option value={size}>{size === 'all' ? 'Todos' : size}</option>
				{/each}
			</select>
		</div>
	</div>
</TableToolbar>

{#if !isValidator}
	<div class="rounded-xl border border-base-content/20 p-4 mb-4">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
			<h2 class="text-sm font-medium text-base-content/80">
				Comparativa de eventos{selectedYear === 'all' ? '' : ` · ${selectedYear}`}
			</h2>
			<div role="tablist" class="tabs tabs-boxed">
				<button
					type="button"
					role="tab"
					class="tab"
					class:tab-active={chartMetric === 'revenue'}
					on:click={() => (chartMetric = 'revenue')}
				>
					Recaudación
				</button>
				<button
					type="button"
					role="tab"
					class="tab"
					class:tab-active={chartMetric === 'tickets'}
					on:click={() => (chartMetric = 'tickets')}
				>
					Entradas
				</button>
			</div>
		</div>
		<EventsBarChart events={visibleEvents} metric={chartMetric} />
	</div>
{/if}

<div class="rounded-xl border border-base-content/20 overflow-hidden">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="hidden md:table-cell">
					<button
						type="button"
						class="flex items-center gap-1 hover:text-base-content"
						on:click={() => toggleSort('date')}
						aria-label="Ordenar por fecha"
					>
						Fecha
						{#if sortKey === 'date'}
							<svelte:component this={sortDir === 'asc' ? ArrowUp : ArrowDown} class="h-3 w-3" />
						{:else}
							<ArrowUpDown class="h-3 w-3 opacity-40" />
						{/if}
					</button>
				</Table.Head>
				<Table.Head>
					<button
						type="button"
						class="flex items-center gap-1 hover:text-base-content"
						on:click={() => toggleSort('name')}
						aria-label="Ordenar por nombre"
					>
						Eventos
						{#if sortKey === 'name'}
							<svelte:component this={sortDir === 'asc' ? ArrowUp : ArrowDown} class="h-3 w-3" />
						{:else}
							<ArrowUpDown class="h-3 w-3 opacity-40" />
						{/if}
					</button>
				</Table.Head>
				{#if !isValidator}
					<Table.Head class="hidden md:table-cell text-right">
						<button
							type="button"
							class="flex items-center gap-1 ml-auto hover:text-base-content"
							on:click={() => toggleSort('totalTicketsSold')}
							aria-label="Ordenar por adhesiones"
						>
							Adhesiones
							{#if sortKey === 'totalTicketsSold'}
								<svelte:component this={sortDir === 'asc' ? ArrowUp : ArrowDown} class="h-3 w-3" />
							{:else}
								<ArrowUpDown class="h-3 w-3 opacity-40" />
							{/if}
						</button>
					</Table.Head>
					<Table.Head class="hidden md:table-cell text-right">
						<button
							type="button"
							class="flex items-center gap-1 ml-auto hover:text-base-content"
							on:click={() => toggleSort('totalPayment')}
							aria-label="Ordenar por total recaudado"
						>
							Total recaudado
							{#if sortKey === 'totalPayment'}
								<svelte:component this={sortDir === 'asc' ? ArrowUp : ArrowDown} class="h-3 w-3" />
							{:else}
								<ArrowUpDown class="h-3 w-3 opacity-40" />
							{/if}
						</button>
					</Table.Head>
				{/if}
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each visibleEvents as event (event.id)}
				<Table.Row
					class="cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
					tabindex={0}
					role="link"
					aria-label={`Ver detalle de ${event.name}`}
					on:click={() => goto(`/eventos/${event.id}`)}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							goto(`/eventos/${event.id}`);
						}
					}}
				>
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
				</Table.Row>
			{/each}
			{#if visibleEvents.length === 0}
				<Table.Row>
					<Table.Cell {colspan} class="text-center text-zinc-400 py-8">Sin resultados</Table.Cell>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>
</div>

<p class="text-xs text-muted-foreground mt-2">
	Mostrando {visibleEvents.length} de {filteredEvents.length}
	{filteredEvents.length === 1 ? 'evento' : 'eventos'}
</p>
