<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
	import TableToolbar from '$lib/components/TableToolbar.svelte';

	export let data;

	let searchTerm = '';
	let statusFilter: 'all' | 'sent' | 'failed' = 'all';
	let typeFilter: 'all' | 'order_confirmation' | 'ticket_confirmation' = 'all';

	const TYPE_LABEL: Record<string, string> = {
		order_confirmation: 'Confirmación de compra',
		ticket_confirmation: 'Confirmación de entrada'
	};

	function recipient(log: (typeof data.emailLogs)[number]) {
		if (log.Order) return { name: log.Order.customerName, email: log.Order.customerEmail };
		if (log.Payment) return { name: log.Payment.customer_name, email: log.Payment.customer_email };
		return { name: '—', email: '—' };
	}

	function reference(log: (typeof data.emailLogs)[number]) {
		if (log.Order) return log.Order.orderId ?? log.Order.id;
		if (log.Payment) return log.Payment.client_id ?? log.Payment.id;
		return '—';
	}

	$: filteredLogs = data.emailLogs.filter((log) => {
		const term = searchTerm.toLowerCase();
		const { name, email } = recipient(log);
		const matchesSearch =
			name?.toLowerCase().includes(term) ||
			email?.toLowerCase().includes(term) ||
			reference(log)?.toLowerCase?.().includes(term);

		const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
		const matchesType = typeFilter === 'all' || log.emailType === typeFilter;

		return matchesSearch && matchesStatus && matchesType;
	});
</script>

<h1 class="text-2xl font-bold mb-2">Historial de correos</h1>
<p class="text-sm text-zinc-400 mb-4">
	Cada intento de envío de confirmación de compra o de entrada, más reciente primero.
</p>

<TableToolbar
	bind:searchValue={searchTerm}
	placeholder="Buscar por nombre, email o Nº de orden..."
	ariaLabel="Buscar correos por destinatario o referencia"
>
	<div slot="filters" class="flex flex-col sm:flex-row gap-2">
		<Tabs.Root bind:value={statusFilter}>
			<Tabs.List>
				<Tabs.Trigger value="all">Todos</Tabs.Trigger>
				<Tabs.Trigger value="sent">Enviados</Tabs.Trigger>
				<Tabs.Trigger value="failed">Fallidos</Tabs.Trigger>
			</Tabs.List>
		</Tabs.Root>
		<Tabs.Root bind:value={typeFilter}>
			<Tabs.List>
				<Tabs.Trigger value="all">Todos los tipos</Tabs.Trigger>
				<Tabs.Trigger value="order_confirmation">Compra</Tabs.Trigger>
				<Tabs.Trigger value="ticket_confirmation">Entrada</Tabs.Trigger>
			</Tabs.List>
		</Tabs.Root>
	</div>
</TableToolbar>

<div class="rounded-xl border border-base-content/20 overflow-hidden">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="whitespace-nowrap">Fecha</Table.Head>
				<Table.Head>Tipo</Table.Head>
				<Table.Head>Destinatario</Table.Head>
				<Table.Head>Referencia</Table.Head>
				<Table.Head>Estado</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each filteredLogs as log (log.id)}
				{@const { name, email } = recipient(log)}
				<Table.Row>
					<Table.Cell class="whitespace-nowrap text-xs text-zinc-400 align-top">
						{new Date(log.createdAt).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}
					</Table.Cell>
					<Table.Cell class="align-top text-sm">{TYPE_LABEL[log.emailType] ?? log.emailType}</Table.Cell>
					<Table.Cell class="align-top">
						<div class="flex flex-col">
							<span class="font-medium">{name}</span>
							<span class="text-xs text-zinc-400">{email}</span>
						</div>
					</Table.Cell>
					<Table.Cell class="align-top">
						<span class="text-xs text-primary uppercase break-all">{reference(log)}</span>
					</Table.Cell>
					<Table.Cell class="align-top">
						<div class="flex flex-col gap-1 items-start">
							<Badge
								class={log.status === 'sent'
									? 'bg-green-300 text-green-900 hover:bg-green-400'
									: 'bg-red-800 text-red-300 hover:bg-red-900'}
							>
								{log.status === 'sent' ? '✓ Enviado' : '⚠ Error'}
							</Badge>
							{#if log.status === 'failed' && log.error}
								<span class="text-xs text-red-400 max-w-xs wrap-break-word">{log.error}</span>
							{/if}
						</div>
					</Table.Cell>
				</Table.Row>
			{/each}
			{#if filteredLogs.length === 0}
				<Table.Row>
					<Table.Cell colspan={5} class="text-center text-zinc-400 py-8">Sin resultados</Table.Cell>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>
</div>
