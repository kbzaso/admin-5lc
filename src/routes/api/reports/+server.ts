import { json, error } from '@sveltejs/kit';
import { CRON_SECRET } from '$env/static/private';
import { buildPeriod, duePeriods, type PeriodKind } from '$lib/server/reports/period';
import { buildReportData } from '$lib/server/reports/data';
import { sendReport } from '$lib/server/reports/notify';
import type { RequestHandler } from './$types';

const VALID: PeriodKind[] = ['daily', 'weekly', 'monthly'];

/**
 * Scheduled report endpoint. Triggered by Vercel Cron, which automatically
 * sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set in the
 * project env. Can also be called manually with ?period=daily|weekly|monthly
 * (still requires the secret) for testing.
 */
export const GET: RequestHandler = async ({ request, url }) => {
	if (!CRON_SECRET || request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
		throw error(401, 'Unauthorized');
	}

	const requested = url.searchParams.get('period') as PeriodKind | null;
	const kinds = requested
		? VALID.includes(requested)
			? [requested]
			: (() => {
					throw error(400, `Invalid period. Use one of: ${VALID.join(', ')}`);
				})()
		: duePeriods();

	const now = new Date();
	const results: { period: PeriodKind; ok: boolean; error?: string }[] = [];

	for (const kind of kinds) {
		try {
			const data = await buildReportData(buildPeriod(kind, now));
			await sendReport(data);
			results.push({ period: kind, ok: true });
		} catch (e) {
			results.push({ period: kind, ok: false, error: e instanceof Error ? e.message : String(e) });
		}
	}

	const allOk = results.every((r) => r.ok);
	return json({ ran: results }, { status: allOk ? 200 : 207 });
};
