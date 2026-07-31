import { env } from '$env/dynamic/private';

interface OrderConfirmationTicket {
	productName: string;
	ticketsType?: string | null;
	date?: string | null;
	quantity: number;
	unitPrice: number;
}

interface OrderConfirmationMerch {
	name: string;
	variationLabel?: string | null;
	quantity: number;
	unitPrice: number;
}

export interface OrderConfirmationEmailInput {
	orderId: string;
	to: string;
	customerName: string;
	customerRut?: string | null;
	totalAmount: number;
	deliveryOption?: string | null;
	address?: string | null;
	comuna?: string | null;
	region?: string | null;
	tickets: OrderConfirmationTicket[];
	merch: OrderConfirmationMerch[];
}

export interface TicketConfirmationEmailInput {
	orderId: string;
	to: string;
	customerName: string;
	productName: string;
	eventDate?: string | null;
	venueName?: string | null;
	venueAddress?: string | null;
	ticketAmount: number;
	unitPrice: number;
}

export interface TicketTransferEmailInput {
	orderId: string;
	to: string;
	customerName: string;
	fromProductName: string;
	fromEventDate?: string | null;
	toProductName: string;
	toEventDate?: string | null;
	venueName?: string | null;
	venueAddress?: string | null;
	ticketAmount: number;
	unitPrice: number;
}

export interface EventCancellationBatchItem {
	to: string;
	customerName: string;
	ticketAmount: number;
	totalPaid: number;
	actionUrl: string;
	paymentRef: string;
}

export interface EventCancellationBatchInput {
	cancelledEventName: string;
	cancelledEventDate?: string | null;
	cancelledReason?: string | null;
	items: EventCancellationBatchItem[];
}

export interface FeedbackRequestBatchItem {
	to: string;
	customerName: string;
	actionUrl: string;
	/** Multi-ticket buyers only: link forwarded to the people who came with them. */
	shareUrl?: string | null;
	ticketAmount: number;
	/** The FeedbackResponse id — a buyer can own several rows, so results are
	 * mapped per response, not per payment. */
	responseRef: string;
}

export interface FeedbackRequestBatchInput {
	eventName: string;
	eventDate?: string | null;
	items: FeedbackRequestBatchItem[];
}

export type SendEmailResult = { ok: true; id?: string } | { ok: false; error: string };

export type BatchSendResult =
	| { ok: true; results: { paymentRef: string; id: string | null }[] }
	| { ok: false; error: string };

export type FeedbackBatchSendResult =
	| { ok: true; results: { responseRef: string; id: string | null }[] }
	| { ok: false; error: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PostJsonResult = { ok: true; data: any } | { ok: false; error: string };

async function postJson(path: string, payload: unknown, timeoutMs = 5000): Promise<PostJsonResult> {
	const mailApiUrl = env.MAIL_API_URL;
	const sharedSecret = env.MAIL_API_SHARED_SECRET;
	if (!mailApiUrl || !sharedSecret) {
		return { ok: false, error: 'MAIL_API_URL/MAIL_API_SHARED_SECRET not set' };
	}

	try {
		const res = await fetch(`${mailApiUrl}${path}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${sharedSecret}`
			},
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(timeoutMs)
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			// Zod rejections carry the useful part in `issues`; without this the log
			// only ever said "400 validation_error", which says nothing about which
			// item or field was actually bad.
			const issues = Array.isArray(data?.issues)
				? data.issues
						.slice(0, 3)
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						.map((i: any) => `${(i.path ?? []).join('.')} ${i.message}`.trim())
						.join('; ')
				: '';
			return {
				ok: false,
				error: `${res.status} ${data?.message ?? data?.error ?? ''} ${issues}`.trim()
			};
		}
		return { ok: true, data };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}

async function postEmail(path: string, payload: unknown): Promise<SendEmailResult> {
	const res = await postJson(path, payload);
	if (!res.ok) return res;
	return { ok: true, id: res.data?.id };
}

export async function sendOrderConfirmationEmail(
	payload: OrderConfirmationEmailInput
): Promise<SendEmailResult> {
	return postEmail('/v1/emails/order-confirmation', payload);
}

export async function sendTicketConfirmationEmail(
	payload: TicketConfirmationEmailInput
): Promise<SendEmailResult> {
	return postEmail('/v1/emails/ticket-confirmation', payload);
}

export async function sendTicketTransferEmail(
	payload: TicketTransferEmailInput
): Promise<SendEmailResult> {
	return postEmail('/v1/emails/ticket-transfer', payload);
}

export interface RefundCompletedEmailInput {
	orderId: string;
	to: string;
	customerName: string;
	eventName: string;
	refundAmount: number;
	bankName: string;
	bankAccountNumberLast4: string;
}

export async function sendRefundCompletedEmail(
	payload: RefundCompletedEmailInput
): Promise<SendEmailResult> {
	return postEmail('/v1/emails/refund-completed', payload);
}

export async function sendEventCancellationBatch(
	payload: EventCancellationBatchInput
): Promise<BatchSendResult> {
	// Rendering + sending up to 100 emails takes well over the default 5s.
	const res = await postJson('/v1/emails/event-cancellation-batch', payload, 30000);
	if (!res.ok) return res;
	return { ok: true, results: res.data?.results ?? [] };
}

export async function sendFeedbackRequestBatch(
	payload: FeedbackRequestBatchInput
): Promise<FeedbackBatchSendResult> {
	// Rendering + sending up to 100 emails takes well over the default 5s.
	const res = await postJson('/v1/emails/feedback-request-batch', payload, 30000);
	if (!res.ok) return res;
	return { ok: true, results: res.data?.results ?? [] };
}
