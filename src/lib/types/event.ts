import type { Product } from '@prisma/client';

// An event row on the events list, with the sales totals the list loader adds.
export type EventSummary = Product & { totalPayment: number; totalTicketsSold: number };
