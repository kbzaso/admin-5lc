import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
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
	// Auth accepts the shared secret (REPORT_CRON_SECRET) via three channels:
	//  - `?key=`            → used by the Vercel cron (path in vercel.json), since
	//                          Vercel can't sign an Authorization header here.
	//  - `Authorization`    → Bearer token, for clients where it isn't stripped.
	//  - `x-report-secret`  → for manual testing (Vercel strips Authorization on
	//                          external requests, but not custom headers).
	const secret = env.REPORT_CRON_SECRET;
	const authHeader = request.headers.get('authorization');
	const customSecret = request.headers.get('x-report-secret');
	const queryKey = url.searchParams.get('key');
	const authorized =
		!!secret &&
		(queryKey === secret || authHeader === `Bearer ${secret}` || customSecret === secret);
	if (!authorized) {
		// Logged (without leaking the secret) so a failed cron run is diagnosable.
		console.warn(
			`[reports] unauthorized: secretConfigured=${!!secret} authHeaderPresent=${!!authHeader}` +
				` customHeaderPresent=${!!customSecret} queryKeyPresent=${!!queryKey}`
		);
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
	console.log(`[reports] ran ${JSON.stringify(results)}`);
	return json({ ran: results }, { status: allOk ? 200 : 207 });
};
