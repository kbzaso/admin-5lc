// Period/date-range helpers for scheduled reports.
// All day boundaries are computed in the site's timezone (Chile) so they line up
// with how Umami buckets data and with local business days.

export const REPORT_TZ = 'America/Santiago';

export type PeriodKind = 'daily' | 'weekly' | 'monthly';

export interface Period {
	kind: PeriodKind;
	/** inclusive start instant (UTC) */
	start: Date;
	/** exclusive end instant (UTC) */
	end: Date;
	/** human label, e.g. "22-05-2026" or "19–25 May 2026" */
	label: string;
}

interface CalDate {
	y: number;
	m: number; // 1-12
	d: number;
}

/** Calendar (y/m/d) of an instant, as seen in the report timezone. */
function calInTz(instant: Date): CalDate {
	const s = new Intl.DateTimeFormat('en-CA', {
		timeZone: REPORT_TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(instant);
	const [y, m, d] = s.split('-').map(Number);
	return { y, m, d };
}

/** TZ offset (ms) at a given instant: localWallClock - utc. */
function tzOffsetMs(instant: Date): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: REPORT_TZ,
		hour12: false,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	}).formatToParts(instant);
	const map: Record<string, number> = {};
	for (const p of parts) if (p.type !== 'literal') map[p.type] = Number(p.value);
	// Intl emits hour "24" at midnight in some runtimes; normalize to 0.
	const hour = map.hour === 24 ? 0 : map.hour;
	const asUTC = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
	return asUTC - instant.getTime();
}

/** UTC instant of 00:00 local-time on the given calendar date. */
function startOfDayUTC({ y, m, d }: CalDate): Date {
	const guess = Date.UTC(y, m - 1, d, 0, 0, 0);
	const off = tzOffsetMs(new Date(guess));
	return new Date(guess - off);
}

/** Shift a calendar date by n days (pure calendar math, DST-safe). */
function addDays({ y, m, d }: CalDate, n: number): CalDate {
	const t = new Date(Date.UTC(y, m - 1, d) + n * 86_400_000);
	return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

const fmtDay = (c: CalDate) =>
	`${String(c.d).padStart(2, '0')}-${String(c.m).padStart(2, '0')}-${c.y}`;

/**
 * Build the range for a period, relative to `now`.
 *
 * The daily job runs late at night (≈23:59 local), so the daily report covers
 * the *current* day that is ending. Weekly/monthly run at their boundary and
 * cover the *previous* complete week/month.
 */
export function buildPeriod(kind: PeriodKind, now: Date = new Date()): Period {
	const today = calInTz(now);

	if (kind === 'daily') {
		const tomorrow = addDays(today, 1);
		return {
			kind,
			start: startOfDayUTC(today),
			end: startOfDayUTC(tomorrow),
			label: fmtDay(today)
		};
	}

	if (kind === 'weekly') {
		const from = addDays(today, -7);
		return {
			kind,
			start: startOfDayUTC(from),
			end: startOfDayUTC(today),
			label: `${fmtDay(from)} → ${fmtDay(addDays(today, -1))}`
		};
	}

	// monthly: the previous calendar month
	const firstOfThis: CalDate = { y: today.y, m: today.m, d: 1 };
	const lastMonth = addDays(firstOfThis, -1); // some day in previous month
	const firstOfLast: CalDate = { y: lastMonth.y, m: lastMonth.m, d: 1 };
	return {
		kind,
		start: startOfDayUTC(firstOfLast),
		end: startOfDayUTC(firstOfThis),
		label: `${String(firstOfLast.m).padStart(2, '0')}-${firstOfLast.y}`
	};
}

/** Which periods are due on `now`: daily always; weekly on Mondays; monthly on the 1st. */
export function duePeriods(now: Date = new Date()): PeriodKind[] {
	const { y, m, d } = calInTz(now);
	const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun,1=Mon
	const kinds: PeriodKind[] = ['daily'];
	if (weekday === 1) kinds.push('weekly');
	if (d === 1) kinds.push('monthly');
	return kinds;
}
