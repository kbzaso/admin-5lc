<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { toast } from 'svelte-sonner';
	import { Mail, Save, TriangleAlert } from 'lucide-svelte';
	import { formatDateToChile } from '$lib';

	type EventOption = { id: string; name: string; date: Date | string | null };
	type ResponseRow = {
		id: string;
		paymentId: string;
		emailStatus: string;
		choice: string | null;
		respondedAt: Date | string | null;
		refundStatus: string | null;
		targetProductId: string | null;
		Payment: {
			id: string;
			customer_name: string;
			customer_email: string;
			customer_phone: string | null;
			client_id: string | null;
			ticketAmount: number;
			price: number;
		};
	};
	type Campaign = {
		id: string;
		eligibleEventIds: string[];
		status: string;
		sentAt: Date | string | null;
		CancellationResponse: ResponseRow[];
	} | null;

	export let campaign: Campaign = null;
	// Future, non-cancelled events with the same método de venta as the
	// cancelled event (sourced from Sanity by the page load).
	export let eventOptions: EventOption[] = [];
	export let recipientCount = 0;

	let saving = false;
	let sending = false;
	let reminding = false;

	$: responses = campaign?.CancellationResponse ?? [];
	$: emailsSent = responses.filter((r) => r.emailStatus === 'sent').length;
	$: emailsFailed = responses.filter((r) => r.emailStatus === 'failed').length;
	$: emailsPending = responses.filter((r) => r.emailStatus === 'pending').length;
	$: refundCount = responses.filter((r) => r.choice === 'refund').length;
	$: changeCount = responses.filter((r) => r.choice === 'change').length;
	$: noResponseCount = responses.filter((r) => r.choice === null).length;
	// Buyers who received the email but haven't chosen yet — the ones a reminder
	// can actually reach.
	$: pendingReply = responses.filter((r) => r.choice === null && r.emailStatus === 'sent').length;

	const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

	const eventName = (id: string | null) => eventOptions.find((e) => e.id === id)?.name ?? id ?? '—';
</script>

<div class="flex flex-col gap-4">
	<Card.Root>
		<Card.Header>
			<Card.Title>Eventos elegibles para el cambio</Card.Title>
			<Card.Description>
				Los compradores podrán mover su entrada a uno de estos eventos (solo se listan eventos
				futuros con el mismo método de venta). Guarda la selección antes de enviar los correos.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if eventOptions.length === 0}
				<p class="text-sm text-muted-foreground">
					No hay eventos futuros con el mismo método de venta disponibles como destino.
				</p>
			{:else}
				<form
					method="POST"
					action="?/saveCancellationCampaign"
					use:enhance={() => {
						saving = true;
						return async ({ result, update }) => {
							saving = false;
							const ok = result.type === 'success' && result.data?.status === 200;
							if (ok) {
								toast.success('Eventos elegibles guardados');
							} else {
								const body =
									result.type === 'success'
										? (result.data?.body as { error?: string } | undefined)
										: undefined;
								toast.error(body?.error ?? 'No se pudo guardar la selección');
							}
							await update();
						};
					}}
				>
					<div class="flex flex-col gap-2">
						{#each eventOptions as event (event.id)}
							<label class="flex items-center gap-3 rounded-md border p-3">
								<input
									type="checkbox"
									name="eligibleEventIds"
									value={event.id}
									checked={campaign?.eligibleEventIds.includes(event.id)}
									class="h-4 w-4 accent-primary"
								/>
								<span class="font-medium">{event.name}</span>
								{#if event.date}
									<span class="text-sm text-muted-foreground">
										{formatDateToChile(event.date)}
									</span>
								{/if}
							</label>
						{/each}
					</div>
					<Button type="submit" class="mt-4" disabled={saving}>
						<Save class="mr-2 h-4 w-4" />
						{saving ? 'Guardando...' : 'Guardar eventos elegibles'}
					</Button>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Correos a compradores</Card.Title>
			<Card.Description>
				Cada comprador recibe un enlace único para elegir entre devolución o cambio de evento.
				Reenviar solo alcanza a los correos pendientes o fallidos — nadie recibe el correo dos
				veces.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="mb-4 flex flex-wrap items-center gap-2">
				<Badge variant="outline">Destinatarios: {recipientCount}</Badge>
				{#if responses.length > 0}
					<Badge variant="outline">Enviados: {emailsSent}</Badge>
					{#if emailsFailed > 0}
						<Badge variant="destructive">Fallidos: {emailsFailed}</Badge>
					{/if}
					{#if emailsPending > 0}
						<Badge variant="secondary">Pendientes: {emailsPending}</Badge>
					{/if}
				{/if}
				{#if campaign?.sentAt}
					<span class="text-sm text-muted-foreground">
						Último envío completado: {formatDateToChile(campaign.sentAt)}
					</span>
				{/if}
			</div>

			{#if !campaign || campaign.eligibleEventIds.length === 0}
				<p class="flex items-center gap-2 text-sm text-muted-foreground">
					<TriangleAlert class="h-4 w-4" />
					Guarda los eventos elegibles antes de enviar los correos.
				</p>
			{:else}
				<form
					method="POST"
					action="?/sendCancellationEmails"
					use:enhance={({ cancel }) => {
						const pendientes = responses.length
							? emailsPending + emailsFailed
							: recipientCount;
						if (!confirm(`Se enviará el correo de cancelación a ${pendientes} comprador(es). ¿Continuar?`)) {
							cancel();
							return;
						}
						sending = true;
						return async ({ result }) => {
							sending = false;
							const ok = result.type === 'success' && result.data?.status === 200;
							const body =
								result.type === 'success'
									? (result.data?.body as
											| { message?: string; error?: string; failed?: number }
											| undefined)
									: undefined;
							if (ok) {
								if (body?.failed) {
									toast.warning(body?.message ?? 'Envío completado con fallidos');
								} else {
									toast.success(body?.message ?? 'Correos enviados');
								}
							} else {
								toast.error(body?.error ?? 'No se pudieron enviar los correos');
							}
							await invalidateAll();
						};
					}}
				>
					<Button
						type="submit"
						disabled={sending || (responses.length > 0 && emailsPending + emailsFailed === 0)}
					>
						<Mail class="mr-2 h-4 w-4" />
						{sending
							? 'Enviando...'
							: responses.length > 0
							? 'Reenviar pendientes/fallidos'
							: 'Enviar correos'}
					</Button>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>

	{#if pendingReply > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Recordatorio</Card.Title>
				<Card.Description>
					Reenvía el mismo correo (con su enlace original) a los compradores que ya lo recibieron
					pero aún no eligen devolución ni cambio.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/remindNonResponders"
					use:enhance={({ cancel }) => {
						if (
							!confirm(
								`Se reenviará el correo a ${pendingReply} comprador(es) que no han respondido. ¿Continuar?`
							)
						) {
							cancel();
							return;
						}
						reminding = true;
						return async ({ result }) => {
							reminding = false;
							const ok = result.type === 'success' && result.data?.status === 200;
							const body =
								result.type === 'success'
									? (result.data?.body as
											| { message?: string; error?: string; failed?: number }
											| undefined)
									: undefined;
							if (ok) {
								if (body?.failed) {
									toast.warning(body?.message ?? 'Recordatorios enviados con fallidos');
								} else {
									toast.success(body?.message ?? 'Recordatorios enviados');
								}
							} else {
								toast.error(body?.error ?? 'No se pudieron enviar los recordatorios');
							}
							await invalidateAll();
						};
					}}
				>
					<Button type="submit" variant="outline" disabled={reminding}>
						<Mail class="mr-2 h-4 w-4" />
						{reminding ? 'Enviando...' : `Recordar a ${pendingReply} que no han respondido`}
					</Button>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if responses.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Respuestas</Card.Title>
				<Card.Description>
					Devolución: {refundCount} · Cambio: {changeCount} · Sin respuesta: {noResponseCount}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Comprador</Table.Head>
							<Table.Head>Orden</Table.Head>
							<Table.Head>Monto</Table.Head>
							<Table.Head>Correo</Table.Head>
							<Table.Head>Respuesta</Table.Head>
							<Table.Head>Detalle</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each responses as row (row.id)}
							<Table.Row>
								<Table.Cell>
									<div class="font-medium">{row.Payment.customer_name}</div>
									<div class="text-sm text-muted-foreground flex flex-col">
										<span>{row.Payment.customer_email}</span>
										<span>{row.Payment.customer_phone}</span>
									</div>
								</Table.Cell>
								<Table.Cell>{row.Payment.client_id ?? '—'}</Table.Cell>
								<Table.Cell>{clp.format(row.Payment.price)}</Table.Cell>
								<Table.Cell>
									{#if row.emailStatus === 'sent'}
										<Badge variant="outline">Enviado</Badge>
									{:else if row.emailStatus === 'failed'}
										<Badge variant="destructive">Fallido</Badge>
									{:else}
										<Badge variant="secondary">Pendiente</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell>
									{#if row.choice === 'refund'}
										<Badge>Devolución</Badge>
									{:else if row.choice === 'change'}
										<Badge>Cambio</Badge>
									{:else}
										<Badge variant="secondary">Sin respuesta</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-sm text-muted-foreground">
									{#if row.choice === 'refund'}
										{row.refundStatus === 'transferred'
											? 'Transferido'
											: 'Pendiente de transferencia'}
									{:else if row.choice === 'change'}
										{eventName(row.targetProductId)}
									{:else if row.respondedAt}
										{formatDateToChile(row.respondedAt)}
									{:else}
										—
									{/if}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
