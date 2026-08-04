// The five rating questions, in order. These are only the *defaults*: at send
// time they're snapshotted onto FeedbackCampaign.questions, and every reader
// (admin panel, public form) renders that snapshot instead of this list. That
// way the wording here can change without altering what past answers meant —
// q1 always refers to questions[0] as it was actually sent.
export const DEFAULT_FEEDBACK_QUESTIONS = [
	'Tu experiencia general en el evento',
	'La cartelera y las luchas',
	'El recinto (visibilidad, comodidad, ambiente)',
	'La compra de entradas y el acceso al evento',
	'La relación precio-valor'
] as const;

// Same shape as buyer feedback, but aimed at the staff who worked the event
// instead of the people who attended it.
export const DEFAULT_STAFF_FEEDBACK_QUESTIONS = [
	'La organización general del evento para el staff (indicaciones, horarios, comunicación)',
	'La coordinación con tu líder de área o supervisor',
	'Los recursos y herramientas que tuviste para hacer tu trabajo',
	'El ambiente de trabajo durante tu turno',
	'Qué tan preparado(a) te sentiste para tus tareas ese día'
] as const;

export const FEEDBACK_QUESTION_COUNT = 5;

/** Rating columns on FeedbackResponse, in the same order as the questions. */
export const FEEDBACK_RATING_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

export type FeedbackRatingKey = (typeof FEEDBACK_RATING_KEYS)[number];

/**
 * Read a campaign's snapshotted questions back into a fixed-length string[].
 * Falls back to `defaults` per-slot so a malformed or short snapshot still
 * renders a usable form instead of blank labels.
 */
export function parseFeedbackQuestions(
	questions: unknown,
	defaults: readonly string[] = DEFAULT_FEEDBACK_QUESTIONS
): string[] {
	const snapshot = Array.isArray(questions) ? questions : [];
	return Array.from(
		{ length: FEEDBACK_QUESTION_COUNT },
		(_, i) => (typeof snapshot[i] === 'string' && snapshot[i].trim()) || defaults[i]
	);
}
