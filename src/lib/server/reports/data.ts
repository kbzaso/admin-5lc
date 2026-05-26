import { client } from '$lib/server/prisma';
import { env } from '$env/dynamic/private';
import type { Period } from './period';

const UMAMI_BASE = 'https://api.umami.is/v1';

export interface StatusRow {
	status: string;
	count: number;
	revenue: number;
	tickets: number;
}

export interface EventRow {
	name: string;
	sales: number;
	revenue: number;
	tickets: number;
}

export interface SalesData {
	tickets: {
		byStatus: StatusRow[];
		byEvent: EventRow[];
		paidRevenue: number;
		paidTickets: number;
		paidTxns: number;
		refunds: number;
	};
	orders: { status: string; count: number; total: number }[];
	merch: { count: number; qty: number; revenue: number };
}

export interface WebData {
	pageviews: number;
	visitors: number;
	visits: number;
	bounces: number;
	bounceRate: number;
	comparison?: { pageviews: number; visitors: number };
	topReferrers: { source: string; count: number }[];
	topPages: { path: string; count: number }[];
}

export interface ReportData {
	period: Period;
	sales: SalesData;
	web: WebData | null;
}

// Statuses that represent realized revenue. Adjust here if the payment
// provider's vocabulary changes.
const PAID = 'success';

async function gatherSales(period: Period): Promise<SalesData> {
	const where = { date: { gte: period.start, lt: period.end } };

	const [statusGroups, refunds, payments, orderGroups, merch] = await Promise.all([
		client.payment.groupBy({
			by: ['payment_status'],
			where,
			_count: { _all: true },
			_sum: { price: true, ticketAmount: true }
		}),
		client.payment.count({ where: { ...where, refund: true } }),
		client.payment.findMany({
			where,
			select: { price: true, ticketAmount: true, Product: { select: { name: true } } }
		}),
		client.order.groupBy({
			by: ['status'],
			where: { createdAt: { gte: period.start, lt: period.end } },
			_count: { _all: true },
			_sum: { totalAmount: true }
		}),
		client.merchPayment.findMany({
			where: { date: { gte: period.start, lt: period.end } },
			select: { price: true, quantity: true }
		})
	]);

	const byStatus: StatusRow[] = statusGroups
		.map((g) => ({
			status: g.payment_status ?? 'unknown',
			count: g._count._all,
			revenue: Math.round(g._sum.price ?? 0),
			tickets: g._sum.ticketAmount ?? 0
		}))
		.sort((a, b) => b.revenue - a.revenue);

	const eventMap = new Map<string, EventRow>();
	for (const p of payments) {
		const name = p.Product?.name ?? 'Sin evento';
		const row = eventMap.get(name) ?? { name, sales: 0, revenue: 0, tickets: 0 };
		row.sales += 1;
		row.revenue += p.price;
		row.tickets += p.ticketAmount;
		eventMap.set(name, row);
	}
	const byEvent = [...eventMap.values()]
		.map((r) => ({ ...r, revenue: Math.round(r.revenue) }))
		.sort((a, b) => b.revenue - a.revenue);

	const paid = byStatus.find((s) => s.status === PAID);

	return {
		tickets: {
			byStatus,
			byEvent,
			paidRevenue: paid?.revenue ?? 0,
			paidTickets: paid?.tickets ?? 0,
			paidTxns: paid?.count ?? 0,
			refunds
		},
		orders: orderGroups
			.map((g) => ({
				status: g.status,
				count: g._count._all,
				total: Math.round(g._sum.totalAmount ?? 0)
			}))
			.sort((a, b) => b.total - a.total),
		merch: {
			count: merch.length,
			qty: merch.reduce((n, m) => n + m.quantity, 0),
			revenue: Math.round(merch.reduce((n, m) => n + m.price * m.quantity, 0))
		}
	};
}

async function umami<T>(path: string, params: Record<string, string | number>): Promise<T> {
	const qs = new URLSearchParams(
		Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
	);
	const res = await fetch(`${UMAMI_BASE}/websites/${env.UMAMI_WEBSITE_ID}/${path}?${qs}`, {
		headers: { 'x-umami-api-key': env.UMAMI_API_KEY ?? '' }
	});
	if (!res.ok) throw new Error(`Umami ${path} ${res.status}: ${await res.text()}`);
	return res.json() as Promise<T>;
}

async function gatherWeb(period: Period): Promise<WebData | null> {
	if (!env.UMAMI_API_KEY || !env.UMAMI_WEBSITE_ID) return null;

	const startAt = period.start.getTime();
	const endAt = period.end.getTime();

	const [stats, referrers, pages] = await Promise.all([
		umami<{
			pageviews: number;
			visitors: number;
			visits: number;
			bounces: number;
			comparison?: { pageviews: number; visitors: number };
		}>('stats', { startAt, endAt }),
		umami<{ x: string; y: number }[]>('metrics', { startAt, endAt, type: 'referrer', limit: 6 }),
		umami<{ x: string; y: number }[]>('metrics', { startAt, endAt, type: 'path', limit: 6 })
	]);

	return {
		pageviews: stats.pageviews,
		visitors: stats.visitors,
		visits: stats.visits,
		bounces: stats.bounces,
		bounceRate: stats.visits ? Math.round((stats.bounces / stats.visits) * 100) : 0,
		comparison: stats.comparison,
		topReferrers: referrers.map((r) => ({ source: r.x || '(directo)', count: r.y })),
		topPages: pages.map((p) => ({ path: p.x, count: p.y }))
	};
}

export async function buildReportData(period: Period): Promise<ReportData> {
	const [sales, web] = await Promise.all([gatherSales(period), gatherWeb(period)]);
	return { period, sales, web };
}
