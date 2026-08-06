<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { toast } from 'svelte-sonner';
	import { Mail, Save, Star, TriangleAlert, X } from 'lucide-svelte';
	import { formatDateToChile } from '$lib';
	import { cn } from '$lib/utils';
	import { FEEDBACK_RATING_KEYS, parseFeedbackQuestions } from '$lib/feedbackQuestions';
	import FeedbackRatingsChart from './FeedbackRatingsChart.svelte';

	// Mirrors the validator on the server side (parseStaffRecipientEmails) so
	// the chip input rejects the same shapes the server would.
	const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	type ResponseRow = {
		id: string;
		recipientEmail: string;
		emailStatus: string;
		q1: number | null;
		q2: number | null;
		q3: number | null;
		q4: number | null;
		q5: number | null;
		comment: string | null;
		respondedAt: Date | string | null;
	};
	type Campaign = {
		id: string;
		questions: unknown;
		recipientEmails: unknown;
		status: string;
		sentAt: Date | string | null;
		StaffFeedbackResponse: ResponseRow[];
	} | null;

	export let campaign: Campaign = null;
	export let defaultQuestions: string[] = [];
	/** The survey is only sendable once the event has actually happened. */
	export let eventHasPassed = false;

	let saving = false;
	let sending = false;
	let reminding = false;
	let adding = false;

	$: responses = campaign?.StaffFeedbackResponse ?? [];
	$: questions = parseFeedbackQuestions(campaign?.questions, defaultQuestions);
	$: alreadySent = campaign?.status === 'sent' || responses.length > 0;

	$: recipientEmails = Array.isArray(campaign?.recipientEmails)
		? (campaign?.recipientEmails as string[])
		: [];

	// `emails` is the chip-editor's working list. Its meaning depends on state:
	//   - Pre-send: the full recipient list (mirrors and edits the saved one).
	//   - Post-send: strictly the new additions the admin wants to append.
	// Sync only fires when the saved snapshot or the sent flag actually changes,
	// so mid-edit chip additions aren't wiped by unrelated reactive updates.
	let emails: string[] = [];
	let lastSyncKey: string | null = null;
	$: {
		const key = `${alreadySent ? '1' : '0'}|${recipientEmails.join('\n')}`;
		if (key !== lastSyncKey) {
			lastSyncKey = key;
			emails = alreadySent ? [] : [...recipientEmails];
		}
	}

	let inputRef: HTMLInputElement | undefined;
	let draftEmail = '';
	let draftError = '';

	// Chip color reflects the recipient's real send/response state, so an admin
	// glancing at the list can spot who still owes them a reply. Falls back to
	// "pendiente" for chips that don't have a response row yet (either the
	// campaign hasn't been sent, or the email was added after sending).
	function responseFor(email: string) {
		const target = email.toLowerCase();
		return responses.find((r) => r.recipientEmail?.toLowerCase() === target);
	}

	function chipClasses(email: string): string {
		const r = responseFor(email);
		if (r?.respondedAt) {
			return 'border-green-500/50 bg-green-500/15 text-green-700 dark:text-green-300';
		}
		if (r?.emailStatus === 'failed') {
			return 'border-red-500/50 bg-red-500/15 text-red-700 dark:text-red-300';
		}
		if (r?.emailStatus === 'sent') {
			return 'border-yellow-500/50 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300';
		}
		return 'border-border bg-muted text-muted-foreground';
	}

	function tryAddEmail(raw: string): boolean {
		const email = raw.trim().toLowerCase();
		if (!email) return false;
		if (!EMAIL_RE.test(email)) {
			draftError = `Correo inválido: ${raw.trim()}`;
			return false;
		}
		if (emails.some((e) => e.toLowerCase() === email)) {
			draftError = `Ya está agregado: ${email}`;
			return false;
		}
		// Post-send, also reject anyone already on the saved list — otherwise the
		// add-and-send action would try to double-notify them (and the server
		// would reject the whole batch).
		if (alreadySent && recipientEmails.some((e) => e.toLowerCase() === email)) {
			draftError = `Ya está en la lista enviada: ${email}`;
			return false;
		}
		emails = [...emails, email];
		draftError = '';
		return true;
	}

	function removeEmail(email: string) {
		emails = emails.filter((e) => e !== email);
	}

	function onInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
			e.preventDefault();
			if (tryAddEmail(draftEmail)) draftEmail = '';
		} else if (e.key === 'Backspace' && draftEmail === '' && emails.length > 0) {
			emails = emails.slice(0, -1);
			draftError = '';
		} else if (draftError) {
			draftError = '';
		}
	}

	function onInputBlur() {
		if (draftEmail.trim() && tryAddEmail(draftEmail)) draftEmail = '';
	}

	// Pasting a block of comma/whitespace-separated addresses should explode
	// into one chip per address, not dump the whole string into the draft field.
	function onInputPaste(e: ClipboardEvent) {
		const text = e.clipboardData?.getData('text');
		if (!text || !/[,\s]/.test(text)) return;
		e.preventDefault();
		for (const part of text.split(/[\n,\s]+/)) {
			if (part) tryAddEmail(part);
		}
		draftEmail = '';
	}

	$: emailsSent = responses.filter((r) => r.emailStatus === 'sent').length;
	$: emailsFailed = responses.filter((r) => r.emailStatus === 'failed').length;
	$: emailsPending = responses.filter((r) => r.emailStatus === 'pending').length;

	$: answered = responses.filter((r) => r.respondedAt !== null);
	// Staff who got the email but haven't answered — the ones a reminder reaches.
	$: pendingReply = responses.filter(
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

	const ratingLabel = (v: number | null) => (v === null ? '—' : `${v}/5`);
</script>

<div class="flex flex-col gap-4">
	<Card.Root>
		<Card.Header>
			<Card.Title>Preguntas y destinatarios</Card.Title>
			<Card.Description>
				Cinco preguntas con nota de 1 a 5, más un espacio libre para comentarios, dirigidas al
				staff que trabajó ese día. No necesitan cuenta para responder, solo el enlace que reciben
				por correo. Una vez enviada la encuesta, las preguntas quedan fijas; los destinatarios se
				pueden seguir agregando.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if !alreadySent}
				<form
					method="POST"
					action="?/saveStaffFeedbackCampaign"
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
								toast.success(body?.message ?? 'Encuesta de staff guardada');
							} else {
								toast.error(body?.error ?? 'No se pudo guardar la encuesta de staff');
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
									class="w-full rounded-md border bg-background px-3 py-2 text-sm"
								/>
							</label>
						{/each}
					</div>
					<div class="mt-4 flex flex-col gap-1">
						<span class="text-sm font-medium text-muted-foreground">Correos del staff</span>

						<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
						<div
							class="flex min-h-[6rem] flex-wrap items-start gap-2 rounded-md border bg-background p-2 text-sm focus-within:ring-2 focus-within:ring-ring"
							on:click={() => inputRef?.focus()}
						>
							{#each emails as email (email)}
								<span
									class={cn(
										'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
										chipClasses(email)
									)}
								>
									{email}
									<button
										type="button"
										class="ml-0.5 rounded-full opacity-60 hover:opacity-100"
										aria-label={`Quitar ${email}`}
										on:click|stopPropagation={() => removeEmail(email)}
									>
										<X class="h-3 w-3" />
									</button>
								</span>
							{/each}

							<input
								bind:this={inputRef}
								bind:value={draftEmail}
								on:keydown={onInputKeydown}
								on:blur={onInputBlur}
								on:paste={onInputPaste}
								placeholder={emails.length === 0 ? 'persona@ejemplo.com' : 'Agregar otro…'}
								class="min-w-[10rem] flex-1 border-0 bg-transparent p-0.5 text-sm outline-hidden focus:outline-hidden"
							/>
						</div>

						{#if draftError}
							<p class="text-xs text-destructive">{draftError}</p>
						{:else}
							<p class="text-xs text-muted-foreground">
								Presiona Enter, coma o espacio para agregar. Retroceso borra el último.
							</p>
						{/if}

						<input type="hidden" name="recipientEmails" value={emails.join('\n')} />
					</div>
					<Button type="submit" class="mt-4" disabled={saving || emails.length === 0}>
						<Save class="mr-2 h-4 w-4" />
						{saving ? 'Guardando...' : 'Guardar encuesta y destinatarios'}
					</Button>
				</form>
			{:else}
				<!-- Questions are frozen once the campaign has gone out, so they're
				     displayed but not submitted. -->
				<div class="flex flex-col gap-3">
					{#each questions as question, i (i)}
						<label class="flex flex-col gap-1">
							<span class="text-sm font-medium text-muted-foreground">Pregunta {i + 1}</span>
							<input
								type="text"
								value={question}
								disabled
								class="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
							/>
						</label>
					{/each}
				</div>

				<div class="mt-4 flex flex-col gap-1">
					<span class="text-sm font-medium text-muted-foreground">Correos del staff</span>

					<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
					<div
						class="flex min-h-[6rem] flex-wrap items-start gap-2 rounded-md border bg-background p-2 text-sm focus-within:ring-2 focus-within:ring-ring"
						on:click={() => inputRef?.focus()}
					>
						<!-- Already-notified recipients: locked, colored by their real status. -->
						{#each recipientEmails as email (email)}
							<span
								class={cn(
									'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
									chipClasses(email)
								)}
							>
								{email}
							</span>
						{/each}

						<!-- Pending additions: dashed border so it's obvious they haven't
						     been saved/sent yet, and can still be removed. -->
						{#each emails as email (email)}
							<span
								class={cn(
									'inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs font-medium',
									chipClasses(email)
								)}
							>
								{email}
								<button
									type="button"
									class="ml-0.5 rounded-full opacity-60 hover:opacity-100"
									aria-label={`Quitar ${email}`}
									on:click|stopPropagation={() => removeEmail(email)}
								>
									<X class="h-3 w-3" />
								</button>
							</span>
						{/each}

						<input
							bind:this={inputRef}
							bind:value={draftEmail}
							on:keydown={onInputKeydown}
							on:blur={onInputBlur}
							on:paste={onInputPaste}
							placeholder="Agregar más destinatarios…"
							class="min-w-[10rem] flex-1 border-0 bg-transparent p-0.5 text-sm outline-hidden focus:outline-hidden"
						/>
					</div>

					{#if draftError}
						<p class="text-xs text-destructive">{draftError}</p>
					{:else}
						<p class="text-xs text-muted-foreground">
							Los nuevos aparecen con borde punteado. Presiona Enter, coma o espacio para agregar.
						</p>
					{/if}

					{#if responses.length > 0}
						<div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
							<span class="inline-flex items-center gap-1">
								<span class="h-2 w-2 rounded-full bg-green-500"></span> Respondió
							</span>
							<span class="inline-flex items-center gap-1">
								<span class="h-2 w-2 rounded-full bg-yellow-500"></span> Enviado, sin respuesta
							</span>
							<span class="inline-flex items-center gap-1">
								<span class="h-2 w-2 rounded-full bg-red-500"></span> Falló
							</span>
							<span class="inline-flex items-center gap-1">
								<span class="h-2 w-2 rounded-full border border-border"></span> Pendiente
							</span>
						</div>
					{/if}
				</div>

				<p class="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
					<TriangleAlert class="h-4 w-4" />
					La encuesta ya fue enviada; las preguntas quedaron fijas. Puedes seguir agregando
					destinatarios y el correo se enviará solo a ellos.
				</p>

				<form
					method="POST"
					action="?/addStaffFeedbackRecipients"
					use:enhance={({ cancel }) => {
						if (emails.length === 0) {
							cancel();
							return;
						}
						if (
							!confirm(
								`Se agregarán y notificarán ${emails.length} nuevo(s) destinatario(s). ¿Continuar?`
							)
						) {
							cancel();
							return;
						}
						adding = true;
						return async ({ result }) => {
							adding = false;
							const ok = result.type === 'success' && result.data?.status === 200;
							const body =
								result.type === 'success'
									? (result.data?.body as
											| { message?: string; error?: string; failed?: number }
											| undefined)
									: undefined;
							if (ok) {
								if (body?.failed) {
									toast.warning(body?.message ?? 'Envío parcial a los nuevos destinatarios');
								} else {
									toast.success(body?.message ?? 'Nuevos destinatarios notificados');
								}
							} else {
								toast.error(body?.error ?? 'No se pudieron agregar los destinatarios');
							}
							await invalidateAll();
						};
					}}
				>
					<input type="hidden" name="newEmails" value={emails.join('\n')} />
					<Button type="submit" class="mt-4" disabled={adding || emails.length === 0}>
						<Mail class="mr-2 h-4 w-4" />
						{adding
							? 'Enviando...'
							: emails.length === 0
								? 'Agregar y enviar a nuevos destinatarios'
								: `Agregar y enviar a ${emails.length} nuevo(s)`}
					</Button>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Envío al staff</Card.Title>
			<Card.Description>
				Cada persona recibe un enlace único a su correo. Reenviar solo alcanza a los pendientes o
				fallidos.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="mb-4 flex flex-wrap items-center gap-2">
				<Badge variant="outline">Destinatarios: {recipientEmails.length}</Badge>
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

			{#if !campaign}
				<p class="flex items-center gap-2 text-sm text-muted-foreground">
					<TriangleAlert class="h-4 w-4" />
					Guarda las preguntas y destinatarios antes de enviar la encuesta.
				</p>
			{:else if !eventHasPassed}
				<p class="flex items-center gap-2 text-sm text-muted-foreground">
					<TriangleAlert class="h-4 w-4" />
					La encuesta se podrá enviar cuando el evento haya terminado.
				</p>
			{:else if recipientEmails.length === 0}
				<p class="flex items-center gap-2 text-sm text-muted-foreground">
					<TriangleAlert class="h-4 w-4" />
					No hay destinatarios guardados para encuestar.
				</p>
			{:else}
				<form
					method="POST"
					action="?/sendStaffFeedbackEmails"
					use:enhance={({ cancel }) => {
						const pendientes = responses.length
							? emailsPending + emailsFailed
							: recipientEmails.length;
						if (!confirm(`Se enviará la encuesta a ${pendientes} persona(s) del staff. ¿Continuar?`)) {
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
					Reenvía la encuesta (con su enlace original) al staff que ya la recibió pero aún no
					responde.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/remindStaffFeedbackNonResponders"
					use:enhance={({ cancel }) => {
						if (
							!confirm(
								`Se reenviará la encuesta a ${pendingReply} persona(s) del staff que no han respondido. ¿Continuar?`
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
				{answered.length} respuesta(s) de {recipientEmails.length} destinatario(s).
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if answered.length === 0}
				<p class="text-sm text-muted-foreground">Aún nadie ha respondido la encuesta.</p>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Correo</Table.Head>
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
								<Table.Cell class="font-medium">{row.recipientEmail}</Table.Cell>
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
