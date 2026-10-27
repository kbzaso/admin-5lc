// src/lib/stores/validatorStore.ts
import { writable } from 'svelte/store';
import type { Comment, EmailLog, Payment } from '@prisma/client';

// A payment as held on the client: the Payment columns plus the relations the
// event page loads. Rows pushed by realtime or added optimistically arrive
// without relations, and dates come through as strings over the wire.
export type PaymentComment = Omit<Comment, 'createdAt' | 'paymentId'> & {
	createdAt: Date | string;
	// Server rows carry User; comments added optimistically carry name.
	name?: string;
	User?: { id: string; name: string };
};

export type PaymentRow = Omit<Payment, 'date' | 'paidAt'> & {
	date: Date | string;
	paidAt: Date | string | null;
	Comment?: PaymentComment[];
	EmailLog?: EmailLog[];
	Order?: { id: string; orderId: string | null; EmailLog: EmailLog[] } | null;
};

export const payments = writable<PaymentRow[]>([]);
