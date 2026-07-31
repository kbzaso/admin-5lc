<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { toast } from 'svelte-sonner';
	import { Mail, Save, Star, TriangleAlert } from 'lucide-svelte';
	import { formatDateToChile } from '$lib';
	import { FEEDBACK_RATING_KEYS, parseFeedbackQuestions } from '$lib/feedbackQuestions';
	import FeedbackRatingsChart from './FeedbackRatingsChart.svelte';

	type ResponseRow = {
		id: string;
		paymentId: string;
		recipientEmail: string | null;
		isBuyer: boolean;
		emailStatus: string;
		q1: number | null;
		q2: number | null;
		q3: number | null;
		q4: number | null;
		q5: number | null;
		comment: string | null;
		respondedAt: Date | string | null;
		Payment: {
			id: string;
			customer_name: string;
			customer_email: string;
			client_id: string | null;
			ticketAmount: number;
		};
	};
	type Campaign = {
		id: string;
		questions: unknown;
		status: string;
		sentAt: Date | string | null;
		FeedbackResponse: ResponseRow[];
	} | null;

	export let campaign: Campaign = null;
	export let recipientCount = 0;
	export let defaultQuestions: string[] = [];
	/** The survey is only sendable once the event has actually happened. */
	export let eventHasPassed = false;

	let saving = false;
	let sending = false;
	let reminding = false;

	$: responses = campaign?.FeedbackResponse ?? [];
	$: questions = campaign ? parseFeedbackQuestions(campaign.questions) : defaultQuestions;
	$: alreadySent = campaign?.status === 'sent' || responses.length > 0;

	// Email state is only tracked for buyer rows — companions arrive through the
	// shared link and are never emailed.
	$: buyerRows = responses.filter((r) => r.isBuyer);
	$: emailsSent = buyerRows.filter((r) => r.emailStatus === 'sent').length;
	$: emailsFailed = buyerRows.filter((r) => r.emailStatus === 'failed').length;
	$: emailsPending = buyerRows.filter((r) => r.emailStatus === 'pending').length;

	$: answered = responses.filter((r) => r.respondedAt !== null);
	$: companionAnswers = answered.filter((r) => !r.isBuyer).length;
	// Buyers who got the email but haven't answered — the ones a reminder reaches.
	$: pendingReply = buyerRows.filter(
		(r) => r.respondedAt === null && r.emailStatus === 'sent'
	).length;
	$: responseRate = emailsSent > 0 ? Math.round((answered.length / emailsSent) * 100) : 0;

	$: perQuestion = FEEDBACK_RATING_KEYS.map((key) => {
		const values = answered
			.map((r) => r[key])
			.filter((v): v is number => typeof v === 'number' && v > 0);
		return {
			count: values.length,
			average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
		};
	});
	$: averages = perQuestion.map((q) => q.average);
	$: counts = perQuestion.map((q) => q.count);
	$: overall = (() => {
		const valid = perQuestion.filter((q) => q.average !== null);
		if (valid.length === 0) return null;
		return valid.reduce((a, q) => a + (q.average ?? 0), 0) / valid.length;
	})();

	$: withComment = answered.filter((r) => r.comment && r.comment.trim().length > 0);

	const ratingLabel = (v: number | null) => (v === null ? '—' : `${v}/5`);
</script>

<div class="flex flex-col gap-4">
	<Card.Root>
		<Card.Header>
			<Card.Title>Preguntas de la encuesta</Card.Title>
			<Card.Description>
				Cinco preguntas con nota de 1 a 5, más un espacio libre para comentarios. Se guardan tal
				como se envían, así que una vez enviada la encuesta ya no se pueden cambiar (las respuestas
				dejarían de significar lo mismo).
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				action="?/saveFeedbackCampaign"
				use:enhance={() => {
					saving = true;
					return async ({ result, update }) => {
						saving = false;
						const ok = result.type === 'success' && result.data?.status === 200;
						const body =
							result.type === 'success'
								? (result.data?.body as { error?: string; message?: string } | undefined)
								: undefined;
						if (ok) {
							toast.success(body?.message ?? 'Preguntas guardadas');
						} else {
							toast.error(body?.error ?? 'No se pudieron guardar las preguntas');
						}
						await update();
					};
				}}
			>
				<div class="flex flex-col gap-3">
					{#each questions as question, i (i)}
						<label class="flex flex-col gap-1">
							<span class="text-sm font-medium text-muted-foreground">Pregunta {i + 1}</span>
							<input
								type="text"
								name={`question${i + 1}`}
								value={question}
								maxlength="160"
								required
								disabled={alreadySent}
								class="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
							/>
						</label>
					{/each}
				</div>
				{#if alreadySent}
					<p class="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
						<TriangleAlert class="h-4 w-4" />
						La encuesta ya fue enviada; las preguntas quedaron fijas.
					</p>
				{:else}
					<Button type="submit" class="mt-4" disabled={saving}>
						<Save class="mr-2 h-4 w-4" />
						{saving ? 'Guardando...' : 'Guardar preguntas'}
					</Button>
				{/if}
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Envío a asistentes</Card.Title>
			<Card.Description>
				Solo se encuesta a quienes validaron su entrada en la puerta. Cada persona recibe un enlace
				único, y quien compró más de una entrada recibe además un enlace para compartir con sus
				acompañantes. Reenviar solo alcanza a los pendientes o fallidos.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="mb-4 flex flex-wrap items-center gap-2">
				<Badge variant="outline">Asistentes: {recipientCount}</Badge>
				{#if buyerRows.length > 0}
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

			{#if !campaign}
				<p class="flex items-center gap-2 text-sm text-muted-foreground">
					<TriangleAlert class="h-4 w-4" />
					Guarda las preguntas antes de enviar la encuesta.
				</p>
			{:else if !eventHasPassed}
				<p class="flex items-center gap-2 text-sm text-muted-foreground">
					<TriangleAlert class="h-4 w-4" />
					La encuesta se podrá enviar cuando el evento haya terminado.
				</p>
			{:else if recipientCount === 0}
				<p class="flex items-center gap-2 text-sm text-muted-foreground">
					<TriangleAlert class="h-4 w-4" />
					Nadie validó su entrada en este evento, así que no hay a quién encuestar.
				</p>
			{:else}
				<form
					method="POST"
					action="?/sendFeedbackEmails"
					use:enhance={({ cancel }) => {
						const pendientes = buyerRows.length ? emailsPending + emailsFailed : recipientCount;
						if (
							!confirm(`Se enviará la encuesta a ${pendientes} asistente(s). ¿Continuar?`)
						) {
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
						disabled={sending || (buyerRows.length > 0 && emailsPending + emailsFailed === 0)}
					>
						<Mail class="mr-2 h-4 w-4" />
						{sending
							? 'Enviando...'
							: buyerRows.length > 0
							? 'Reenviar pendientes/fallidos'
							: 'Enviar encuesta'}
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
					Reenvía la encuesta (con su enlace original) a los asistentes que ya la recibieron pero
					aún no responden.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/remindFeedbackNonResponders"
					use:enhance={({ cancel }) => {
						if (
							!confirm(
								`Se reenviará la encuesta a ${pendingReply} asistente(s) que no han respondido. ¿Continuar?`
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
								toast.success(body?.message ?? 'Recordatorios enviados');
							} else {
								toast.error(body?.error ?? 'No se pudieron enviar los recordatorios');
							}
							await invalidateAll();
						};
					}}
				>
					<Button type="submit" variant="secondary" disabled={reminding}>
						<Mail class="mr-2 h-4 w-4" />
						{reminding ? 'Enviando...' : `Recordar a ${pendingReply} pendiente(s)`}
					</Button>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>Resultados</Card.Title>
			<Card.Description>Promedio de cada pregunta, en escala de 1 a 5.</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="mb-4 flex flex-wrap items-center gap-2">
				<Badge variant="outline">Respuestas: {answered.length}</Badge>
				{#if emailsSent > 0}
					<Badge variant="outline">Tasa de respuesta: {responseRate}%</Badge>
				{/if}
				{#if companionAnswers > 0}
					<Badge variant="secondary">Acompañantes: {companionAnswers}</Badge>
				{/if}
				{#if overall !== null}
					<Badge class="gap-1">
						<Star class="h-3 w-3" />
						Promedio general: {overall.toFixed(1)}/5
					</Badge>
				{/if}
			</div>

			<FeedbackRatingsChart {questions} {averages} {counts} />

			{#if answered.length > 0}
				<div class="mt-4 flex flex-col gap-1">
					{#each questions as question, i (i)}
						<div class="flex items-baseline justify-between gap-4 text-sm">
							<span class="text-muted-foreground">{question}</span>
							<span class="font-medium tabular-nums">
								{averages[i] === null ? '—' : `${averages[i]?.toFixed(1)}/5`}
								<span class="text-muted-foreground">({counts[i]})</span>
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Respuestas</Card.Title>
			<Card.Description>
				{answered.length} respuesta(s), {withComment.length} con comentario.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if answered.length === 0}
				<p class="text-sm text-muted-foreground">Aún nadie ha respondido la encuesta.</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Asistente</Table.Head>
							{#each questions as question, i (i)}
								<Table.Head class="text-center" title={question}>P{i + 1}</Table.Head>
							{/each}
							<Table.Head>Comentario</Table.Head>
							<Table.Head>Fecha</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each answered as row (row.id)}
							<Table.Row>
								<Table.Cell>
									{#if row.isBuyer}
										<div class="font-medium">{row.Payment.customer_name}</div>
										<div class="text-xs text-muted-foreground">
											{row.recipientEmail ?? row.Payment.customer_email}
										</div>
									{:else}
										<div class="font-medium">Acompañante</div>
										<div class="text-xs text-muted-foreground">
											de {row.Payment.customer_name}
										</div>
									{/if}
								</Table.Cell>
								{#each FEEDBACK_RATING_KEYS as key (key)}
									<Table.Cell class="text-center tabular-nums">
										{ratingLabel(row[key])}
									</Table.Cell>
								{/each}
								<Table.Cell class="max-w-[320px] whitespace-pre-wrap text-sm">
									{row.comment?.trim() || '—'}
								</Table.Cell>
								<Table.Cell class="text-sm text-muted-foreground">
									{row.respondedAt ? formatDateToChile(row.respondedAt) : '—'}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
