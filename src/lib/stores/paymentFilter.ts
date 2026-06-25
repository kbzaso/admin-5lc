// Shared category filter for an event's payments. The same selection drives
// both the daily-tickets chart and the payments table, so the classification
// logic and the selected-state live here rather than in any one component.
import { writable } from 'svelte/store';

// 'batch' events sell tiers stored in `buys`; 'ubication' events sell zones
// stored in `ticketsType`. Everything else partitions into status categories.
export const BATCH_TIERS = [
	{ key: 'firsts_tickets', label: 'Preventa' },
	{ key: 'seconds_tickets', label: 'Regular' },
	{ key: 'thirds_tickets', label: 'Últimas entradas' }
];
export const STATUS_CATEGORIES = ['Sistema', 'Reembolso', 'Cambio'];

export const isRefund = (p: any) => p?.refund === true || p?.payment_status === 'refund';
export const isChange = (p: any) => p?.changeEvent === true || p?.payment_status === 'change';

// Decompose a payment into { category, amount } slices, attributing every
// ticket to exactly one category — the same partition as "Resumen de venta".
// Refund / change / system take precedence; web sales split into zones
// (ubication) or batch tiers (with any unmapped remainder as "Otros").
export function slicesFor(
	p: any,
	isUbication: boolean
): { category: string; amount: number }[] {
	const amount = p?.ticketAmount ?? 0;
	if (isRefund(p)) return [{ category: 'Reembolso', amount }];
	if (isChange(p)) return [{ category: 'Cambio', amount }];
	if (p?.payment_status === 'system') return [{ category: 'Sistema', amount }];
	if (p?.payment_status !== 'success') return [];

	if (isUbication) {
		return [{ category: p?.ticketsType || 'Otros', amount }];
	}

	const buys = p?.buys ?? {};
	const slices = BATCH_TIERS.map(({ key, label }) => ({
		category: label,
		amount: buys[key]?.amount ?? 0
	})).filter((s) => s.amount > 0);
	const remainder = amount - slices.reduce((sum, s) => sum + s.amount, 0);
	if (remainder > 0) slices.push({ category: 'Otros', amount: remainder });
	return slices;
}

// The distinct categories a payment belongs to (used by the table to decide
// whether a row is visible under the current selection).
export function categoriesFor(p: any, isUbication: boolean): string[] {
	return slicesFor(p, isUbication).map((s) => s.category);
}

// Stable display order: sale categories first, then status categories.
export function orderCategories(present: Set<string>, isUbication: boolean): string[] {
	const saleOrder = isUbication
		? ['General', 'Ringside', 'Otros']
		: [...BATCH_TIERS.map((t) => t.label), 'Otros'];
	const order = [...saleOrder, ...STATUS_CATEGORIES];
	const ordered = order.filter((c) => present.has(c));
	for (const c of present) if (!ordered.includes(c)) ordered.push(c);
	return ordered;
}

// The "non-success" bucket shown by the rejected switch: registrations,
// rejected attempts and rows without a status (refund/change are layered on a
// successful origin, so they don't belong here).
export const isRejectedBucket = (p: any) => {
	if (isRefund(p) || isChange(p)) return false;
	const s = p?.payment_status;
	return s === 'register' || s === 'rejected' || s == null;
};

// When on, the table (and chart) switch to the non-success bucket above. The
// switch lives in the table toolbar but is shared so the chart and the filter
// chips can react to it.
export const showRejected = writable(false);

// A payment whose tickets weren't all checked in at the door (a no-show or
// partial no-show). Only meaningful once the event has happened.
export const isNotFullyValidated = (p: any) =>
	(p?.ticketValidated ?? 0) < (p?.ticketAmount ?? 0);

// When on, restrict both the chart and the table to not-fully-validated
// payments. Surfaced as a chip only after the event date has passed.
export const onlyUnvalidated = writable(false);

// Selected categories, shared across components. Categories default to ON the
// first time they appear so the filter starts showing everything; the user
// narrows from there.
export const selectedCategories = writable<Record<string, boolean>>({});

const seen = new Set<string>();
export function ensureCategoriesInitialized(categories: string[]) {
	selectedCategories.update((current) => {
		let changed = false;
		const next = { ...current };
		for (const c of categories) {
			if (seen.has(c)) continue;
			seen.add(c);
			next[c] = true;
			changed = true;
		}
		return changed ? next : current;
	});
}
