<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { ChevronDown, ChevronUp } from 'lucide-svelte';
	import TableToolbar from '$lib/components/TableToolbar.svelte';
	import { formatDateToChile, formatPriceToCLP } from '$lib';

	type ChangeLogEntry = {
		id: string;
		changeType: string;
		fromProductId: string | null;
		fromProductName: string | null;
		toProductId: string | null;
		toProductName: string | null;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		before: any;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		after: any;
		userId: string | null;
		createdAt: Date | string;
		Payment: {
			id: string;
			customer_name: string;
			customer_email: string;
			client_id: string | null;
		} | null;
		Users: { id: string; name: string } | null;
	};

	export let changeLog: ChangeLogEntry[];

	let searchTerm = '';
	let onlyTransfers = false;
	let expandedId: string | null = null;

	// Fields whose before/after values are worth showing in the detail row.
	// productId is intentionally excluded — Origen/Destino already show that.
	const FIELD_LABELS: Record<string, string> = {
		customer_name: 'Nombre',
		rut: 'RUT',
		customer_email: 'Email',
		customer_phone: 'Teléfono',
		price: 'Precio',
		ticketAmount: 'Cantidad',
		ticketsType: 'Tipo de entrada',
		refund: 'Reembolso',
		changeEvent: 'Cambio de evento'
	};

	function formatValue(key: string, value: unknown): string {
		if (value === null || value === undefined || value === '') return '—';
		if (key === 'price') return formatPriceToCLP(Number(value));
		if (typeof value === 'boolean') return value ? 'Sí' : 'No';
		return String(value);
	}

	function diff(entry: ChangeLogEntry) {
		return Object.entries(FIELD_LABELS)
			.map(([key, label]) => ({
				key,
				label,
				before: entry.before?.[key],
				after: entry.after?.[key]
			}))
			.filter(({ before, after }) => JSON.stringify(before) !== JSON.stringify(after));
	}

	function toggleExpanded(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	$: filteredChangeLog = changeLog.filter((entry) => {
		const haystack = [
			entry.Payment?.customer_name,
			entry.Payment?.customer_email,
			entry.Payment?.client_id,
			entry.fromProductName,
			entry.toProductName,
			entry.Users?.name
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
		const matchesSearchTerm = haystack.includes(searchTerm.toLowerCase());
		const matchesFilter = !onlyTransfers || entry.changeType === 'transfer';
		return matchesSearchTerm && matchesFilter;
	});
</script>

<TableToolbar
	bind:searchValue={searchTerm}
	placeholder="Buscador..."
	ariaLabel="Buscar cambios por cliente, email, código o evento"
>
	<div slot="filters" class="flex items-center space-x-2">
		<Switch id="only-transfers" bind:checked={onlyTransfers} />
		<Label for="only-transfers">Solo cambios de evento</Label>
	</div>
</TableToolbar>

<div class="rounded-xl border border-base-content/20 overflow-hidden">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="px-3 sm:px-4">Fecha</Table.Head>
				<Table.Head>Usuario</Table.Head>
				<Table.Head>Pago</Table.Head>
				<Table.Head>Origen</Table.Head>
				<Table.Head>Destino</Table.Head>
				<Table.Head class="text-right px-3 sm:px-4">Detalle</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each filteredChangeLog as entry (entry.id)}
				<Table.Row>
					<Table.Cell class="px-3 py-3 sm:p-4 align-top text-xs uppercase text-zinc-400 whitespace-nowrap">
						{formatDateToChile(entry.createdAt)}
					</Table.Cell>
					<Table.Cell class="align-top text-sm">{entry.Users?.name ?? 'Sistema'}</Table.Cell>
					<Table.Cell class="align-top">
						{#if entry.Payment}
							<div class="flex flex-col">
								<span class="text-xs text-primary uppercase">{entry.Payment.client_id ?? ''}</span>
								<span class="font-medium">{entry.Payment.customer_name}</span>
								<span class="text-xs text-zinc-400">{entry.Payment.customer_email}</span>
							</div>
						{:else}
							<span class="text-xs text-zinc-500 italic">Pago eliminado</span>
						{/if}
					</Table.Cell>
					<Table.Cell class="align-top text-sm">{entry.fromProductName ?? '—'}</Table.Cell>
					<Table.Cell class="align-top text-sm">
						<div class="flex flex-wrap items-center gap-1.5">
							<span>{entry.toProductName ?? '—'}</span>
							{#if entry.changeType === 'transfer'}
								<Badge class="bg-cyan-300 text-cyan-900 hover:bg-cyan-400">Cambio de evento</Badge>
							{/if}
						</div>
					</Table.Cell>
					<Table.Cell class="px-3 py-3 sm:p-4 text-right align-top">
						<button
							type="button"
							class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
							on:click={() => toggleExpanded(entry.id)}
						>
							Ver detalle
							<svelte:component
								this={expandedId === entry.id ? ChevronUp : ChevronDown}
								class="h-3.5 w-3.5"
								aria-hidden="true"
							/>
						</button>
					</Table.Cell>
				</Table.Row>
				{#if expandedId === entry.id}
					<Table.Row>
						<Table.Cell colspan={6} class="bg-base-content/5 px-4 py-3">
							{#if diff(entry).length === 0}
								<span class="text-xs text-zinc-400">Sin cambios en los campos del pago.</span>
							{:else}
								<ul class="flex flex-col gap-1 text-xs">
									{#each diff(entry) as change}
										<li class="flex flex-wrap items-center gap-1.5">
											<span class="font-semibold text-zinc-300">{change.label}:</span>
											<span class="text-zinc-400 line-through">
												{formatValue(change.key, change.before)}
											</span>
											<span>→</span>
											<span class="text-zinc-100">{formatValue(change.key, change.after)}</span>
										</li>
									{/each}
								</ul>
							{/if}
						</Table.Cell>
					</Table.Row>
				{/if}
			{/each}
			{#if filteredChangeLog.length === 0}
				<Table.Row>
					<Table.Cell colspan={6} class="text-center text-zinc-400 py-8">
						Sin cambios registrados
					</Table.Cell>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>
</div>
