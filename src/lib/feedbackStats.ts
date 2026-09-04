// Shared aggregation for the two feedback surveys (asistentes and staff). Both
// panels showed the same numbers computed twice, and the PDF export would have
// been a third copy — so the maths lives here and every reader consumes it.
import { FEEDBACK_RATING_KEYS } from '$lib/feedbackQuestions';

/** The subset of a FeedbackResponse / StaffFeedbackResponse row the stats need. */
export type RatedResponse = {
	q1: number | null;
	q2: number | null;
	q3: number | null;
	q4: number | null;
	q5: number | null;
	comment: string | null;
	respondedAt: Date | string | null;
};

export type QuestionStat = {
	count: number;
	average: number | null;
};

export type FeedbackSummary<T extends RatedResponse = RatedResponse> = {
	/** Rows that were actually answered, in the order they came in. */
	answered: T[];
	perQuestion: QuestionStat[];
	/** Per-question averages, aligned with FEEDBACK_RATING_KEYS. */
	averages: (number | null)[];
	/** Per-question answer counts, aligned with FEEDBACK_RATING_KEYS. */
	counts: number[];
	/** Unweighted mean of the per-question means; null when nobody answered. */
	overall: number | null;
	answeredWithComment: T[];
};

export function summarizeFeedback<T extends RatedResponse>(responses: T[]): FeedbackSummary<T> {
	const answered = responses.filter((r) => r.respondedAt !== null);

	const perQuestion = FEEDBACK_RATING_KEYS.map((key) => {
		// 0 is not a valid rating (the scale starts at 1), so it stands for
		// "skipped" and must not drag the average down.
		const values = answered
			.map((r) => r[key])
			.filter((v): v is number => typeof v === 'number' && v > 0);
		return {
			count: values.length,
			average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
		};
	});

	const withAverage = perQuestion.filter((q) => q.average !== null);
	const overall = withAverage.length
		? withAverage.reduce((a, q) => a + (q.average ?? 0), 0) / withAverage.length
		: null;

	return {
		answered,
		perQuestion,
		averages: perQuestion.map((q) => q.average),
		counts: perQuestion.map((q) => q.count),
		overall,
		answeredWithComment: answered.filter((r) => r.comment && r.comment.trim().length > 0)
	};
}

/** Delivery state of a set of rows. Only rows that were actually emailed count. */
export function countEmailStatus<T extends { emailStatus: string }>(rows: T[]) {
	return {
		sent: rows.filter((r) => r.emailStatus === 'sent').length,
		failed: rows.filter((r) => r.emailStatus === 'failed').length,
		pending: rows.filter((r) => r.emailStatus === 'pending').length
	};
}

/** Answered / emailed, as a whole percentage. 0 when nothing was emailed yet. */
export function responseRate(answered: number, emailsSent: number): number {
	return emailsSent > 0 ? Math.round((answered / emailsSent) * 100) : 0;
}
