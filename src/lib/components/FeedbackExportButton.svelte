<script lang="ts">
	// Single entry point for the feedback PDF: one button, one file covering
	// both the attendee survey and the staff survey.
	//
	// The document is meant to be shared outside the team, so every row is
	// anonymised here — no customer name, no attendee or staff email leaves
	// this component.
	import { Button } from '$lib/components/ui/button/index.js';
	import { Download } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import {
		DEFAULT_STAFF_FEEDBACK_QUESTIONS,
		FEEDBACK_RATING_KEYS,
		parseFeedbackQuestions
	} from '$lib/feedbackQuestions';
	import { countEmailStatus, responseRate, summarizeFeedback } from '$lib/feedbackStats';
	import type { FeedbackPdfSection } from '$lib/pdf/feedbackReport';

	type RatingRow = {
		q1: number | null;
		q2: number | null;
		q3: number | null;
		q4: number | null;
		q5: number | null;
		comment: string | null;
		respondedAt: Date | string | null;
		emailStatus: string;
	};
	type BuyerCampaign = {
		questions: unknown;
		sentAt: Date | string | null;
		FeedbackResponse: (RatingRow & { isBuyer: boolean })[];
	} | null;
	type StaffCampaign = {
		questions: unknown;
		recipientEmails: unknown;
		sentAt: Date | string | null;
		StaffFeedbackResponse: RatingRow[];
	} | null;

	export let eventName = '';
	export let eventDate: string | null = null;
	export let campaign: BuyerCampaign = null;
	export let recipientCount = 0;
	export let defaultQuestions: string[] = [];
	export let staffCampaign: StaffCampaign = null;
	export let staffDefaultQuestions: string[] = [];

	let exporting = false;

	$: buyerResponses = campaign?.FeedbackResponse ?? [];
	$: staffResponses = staffCampaign?.StaffFeedbackResponse ?? [];
	// Nothing to export until at least one survey has an answer.
	$: hasAnything =
		buyerResponses.some((r) => r.respondedAt !== null) ||
		staffResponses.some((r) => r.respondedAt !== null);

	function buyerSection(): FeedbackPdfSection | null {
		if (!campaign) return null;
		const summary = summarizeFeedback(buyerResponses);
		// Companions arrive through the shared link and are never emailed, so
		// delivery stats only count buyer rows.
		const emails = countEmailStatus(buyerResponses.filter((r) => r.isBuyer));
		const companionAnswers = summary.answered.filter((r) => !r.isBuyer).length;

		let buyerN = 0;
		let companionN = 0;
		return {
			kind: 'asistentes',
			questions: parseFeedbackQuestions(campaign.questions, defaultQuestions),
			summary,
			rows: summary.answered.map((row) => ({
				label: row.isBuyer ? `Asistente ${++buyerN}` : `Acompañante ${++companionN}`,
				ratings: FEEDBACK_RATING_KEYS.map((key) => row[key]),
				comment: row.comment,
				respondedAt: row.respondedAt
			})),
			meta: {
				recipientCount,
				emailsSent: emails.sent,
				emailsFailed: emails.failed,
				emailsPending: emails.pending,
				responseRate: responseRate(summary.answered.length, emails.sent),
				companionAnswers,
				sentAt: campaign.sentAt ?? null
			}
		};
	}

	function staffSection(): FeedbackPdfSection | null {
		if (!staffCampaign) return null;
		const summary = summarizeFeedback(staffResponses);
		const emails = countEmailStatus(staffResponses);
		const recipients = Array.isArray(staffCampaign.recipientEmails)
			? (staffCampaign.recipientEmails as string[])
			: [];

		return {
			kind: 'staff',
			questions: parseFeedbackQuestions(
				staffCampaign.questions,
				staffDefaultQuestions.length ? staffDefaultQuestions : DEFAULT_STAFF_FEEDBACK_QUESTIONS
			),
			summary,
			rows: summary.answered.map((_, i) => ({
				label: `Staff ${i + 1}`,
				ratings: FEEDBACK_RATING_KEYS.map((key) => summary.answered[i][key]),
				comment: summary.answered[i].comment,
				respondedAt: summary.answered[i].respondedAt
			})),
			meta: {
				recipientCount: recipients.length,
				emailsSent: emails.sent,
				emailsFailed: emails.failed,
				emailsPending: emails.pending,
				responseRate: responseRate(summary.answered.length, emails.sent),
				sentAt: staffCampaign.sentAt ?? null
			}
		};
	}

	async function exportPdf() {
		exporting = true;
		try {
			const { downloadFeedbackReport } = await import('$lib/pdf/feedbackReport');
			const sections = [buyerSection(), staffSection()].filter(
				(s): s is FeedbackPdfSection => s !== null
			);
			await downloadFeedbackReport({ eventName, eventDate, sections });
		} catch (e) {
			console.error('[feedback] PDF export failed', e);
			toast.error('No se pudo generar el PDF');
		} finally {
			exporting = false;
		}
	}
</script>

<Button
	variant="outline"
	size="sm"
	disabled={!hasAnything || exporting}
	title={hasAnything ? 'Descargar el feedback en PDF' : 'Aún no hay respuestas que exportar'}
	on:click={exportPdf}
>
	<Download class="mr-2 h-4 w-4" />
	{exporting ? 'Generando...' : 'Descargar feedback (PDF)'}
</Button>
