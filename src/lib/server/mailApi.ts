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

export type SendEmailResult = { ok: true; id?: string } | { ok: false; error: string };

async function postEmail(path: string, payload: unknown): Promise<SendEmailResult> {
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
			signal: AbortSignal.timeout(5000)
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			return { ok: false, error: `${res.status} ${data?.message ?? data?.error ?? ''}`.trim() };
		}
		return { ok: true, id: data?.id };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
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
