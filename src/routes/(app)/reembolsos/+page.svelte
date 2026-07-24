<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Table from '$lib/components/ui/table';
	import { toast } from 'svelte-sonner';
	import { BadgeCheck } from 'lucide-svelte';
	import { formatDateToChile } from '$lib';

	export let data: PageData;

	let filter: 'pending' | 'transferred' | 'all' = 'pending';
	let submittingId: string | null = null;

	$: rows = data.refundRequests.filter((r) =>
		filter === 'all' ? true : (r.refundStatus ?? 'pending') === filter
	);
	$: pendingCount = data.refundRequests.filter((r) => r.refundStatus === 'pending').length;
	$: transferredCount = data.refundRequests.filter((r) => r.refundStatus === 'transferred').length;

	const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

	const ACCOUNT_TYPE_LABELS: Record<string, string> = {
		corriente: 'Cuenta Corriente',
		vista: 'Cuenta Vista',
		ahorro: 'Cuenta de Ahorro',
		cuenta_rut: 'CuentaRUT'
	};
</script>

<svelte:head>
	<title>Reembolsos</title>
</svelte:head>

<div class="flex flex-col gap-4 mb-6 mt-4">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Reembolsos</h1>
		<div class="flex gap-2">
			<Button
				variant={filter === 'pending' ? 'default' : 'outline'}
				size="sm"
				on:click={() => (filter = 'pending')}
			>
				Pendientes ({pendingCount})
			</Button>
			<Button
				variant={filter === 'transferred' ? 'default' : 'outline'}
				size="sm"
				on:click={() => (filter = 'transferred')}
			>
				Transferidos ({transferredCount})
			</Button>
			<Button
				variant={filter === 'all' ? 'default' : 'outline'}
				size="sm"
				on:click={() => (filter = 'all')}
			>
				Todos ({data.refundRequests.length})
			</Button>
		</div>
	</div>

	{#if rows.length === 0}
		<p class="text-sm text-muted-foreground py-8 text-center">
			No hay reembolsos {filter === 'pending'
				? 'pendientes'
				: filter === 'transferred'
				? 'transferidos'
				: 'registrados'}.
		</p>
	{:else}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Evento</Table.Head>
					<Table.Head>Comprador</Table.Head>
					<Table.Head>Monto</Table.Head>
					<Table.Head>Datos bancarios</Table.Head>
					<Table.Head>Solicitado</Table.Head>
					<Table.Head>Estado</Table.Head>
					<Table.Head />
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each rows as row (row.id)}
					<Table.Row>
						<Table.Cell>
							<a
								class="underline underline-offset-2"
								href={`/eventos/${row.CancellationCampaign.Product.id}`}
							>
								{row.CancellationCampaign.Product.name}
							</a>
						</Table.Cell>
						<Table.Cell>
							<div class="font-medium">{row.Payment.customer_name}</div>
							<div class="text-sm text-muted-foreground">{row.Payment.customer_email}</div>
							{#if row.Payment.client_id}
								<div class="text-sm text-muted-foreground">{row.Payment.client_id}</div>
							{/if}
						</Table.Cell>
						<Table.Cell class="font-medium">{clp.format(row.Payment.price)}</Table.Cell>
						<Table.Cell>
							<div class="text-sm">
								<div>{row.bankHolderName} · {row.bankRut}</div>
								<div>
									{row.bankName} · {ACCOUNT_TYPE_LABELS[row.bankAccountType ?? ''] ??
										row.bankAccountType}
								</div>
								<div class="font-mono">{row.bankAccountNumber}</div>
								{#if row.bankEmail}
									<div class="text-muted-foreground">{row.bankEmail}</div>
								{/if}
							</div>
						</Table.Cell>
						<Table.Cell class="text-sm text-muted-foreground">
							{row.respondedAt ? formatDateToChile(row.respondedAt) : '—'}
						</Table.Cell>
						<Table.Cell>
							{#if row.refundStatus === 'transferred'}
								<Badge variant="outline">Transferido</Badge>
								{#if row.refundedAt}
									<div class="text-xs text-muted-foreground mt-1">
										{formatDateToChile(row.refundedAt)}
									</div>
								{/if}
							{:else}
								<Badge variant="destructive">Pendiente</Badge>
							{/if}
						</Table.Cell>
						<Table.Cell>
							{#if row.refundStatus === 'pending'}
								<form
									method="POST"
									action="?/markAsTransferred"
									use:enhance={({ cancel }) => {
										if (
											!confirm(
												`¿Confirmas que ya transferiste ${clp.format(row.Payment.price)} a ${row.Payment.customer_name}?`
											)
										) {
											cancel();
											return;
										}
										submittingId = row.id;
										return async ({ result, update }) => {
											submittingId = null;
											const ok =
												result.type === 'success' && result.data?.status === 200;
											if (ok) {
												const body = result.data?.body as { message?: string } | undefined;
												toast.success(body?.message ?? 'Reembolso marcado como transferido');
											} else {
												const body =
													result.type === 'success'
														? (result.data?.body as { error?: string } | undefined)
														: undefined;
												toast.error(body?.error ?? 'No se pudo actualizar el reembolso');
											}
											await update();
										};
									}}
								>
									<input type="hidden" name="responseId" value={row.id} />
									<Button type="submit" size="sm" disabled={submittingId === row.id}>
										<BadgeCheck class="mr-2 h-4 w-4" />
										{submittingId === row.id ? 'Guardando...' : 'Marcar transferido'}
									</Button>
								</form>
							{/if}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>
