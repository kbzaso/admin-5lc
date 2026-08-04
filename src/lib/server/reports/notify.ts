import { env } from '$env/dynamic/private';
import type { ReportData } from './data';

const clp = new Intl.NumberFormat('es-CL', {
	style: 'currency',
	currency: 'CLP',
	maximumFractionDigits: 0
});

const PERIOD_TITLE: Record<string, string> = {
	daily: '📊 Reporte diario',
	weekly: '📈 Reporte semanal',
	monthly: '🗓️ Reporte mensual'
};

/**
 * Plain-text body (with emoji + newlines, no platform-specific bold) so the
 * same string renders correctly in both Slack and Discord.
 */
export function formatReport(data: ReportData): string {
	const { period, sales } = data;
	const t = sales.tickets;
	const lines: string[] = [];

	lines.push(`${PERIOD_TITLE[period.kind]} — ${period.label}`);
	lines.push('');

	// Sales
	lines.push(`🎟️ Entradas pagadas: ${t.paidTxns} ventas · ${clp.format(t.paidRevenue)} · ${t.paidTickets} tickets`);
	if (t.refunds) lines.push(`   ↩️ Reembolsos: ${t.refunds}`);
	if (t.byEvent.length) {
		lines.push('   Por evento:');
		for (const e of t.byEvent.slice(0, 5)) {
			lines.push(`   • ${e.name}: ${clp.format(e.revenue)} (${e.tickets} tickets)`);
		}
	}

	const successOrders = sales.orders.find((o) => o.status === 'success');
	if (successOrders) {
		lines.push(`🧾 Órdenes (success): ${successOrders.count} · ${clp.format(successOrders.total)}`);
	}
	if (sales.merch.count) {
		lines.push(`👕 Merch: ${sales.merch.qty} u. · ${clp.format(sales.merch.revenue)}`);
	}

	return lines.join('\n');
}

/** Detect provider from the webhook host and shape the payload accordingly. */
function payloadFor(url: string, body: string): string {
	if (url.includes('hooks.slack.com')) return JSON.stringify({ text: body });
	// Discord (and most generic webhooks) accept { content }
	return JSON.stringify({ content: body });
}

export async function sendReport(data: ReportData): Promise<void> {
	const webhookUrl = env.REPORT_WEBHOOK_URL;
	if (!webhookUrl) throw new Error('REPORT_WEBHOOK_URL is not set');
	const body = formatReport(data);
	const res = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: payloadFor(webhookUrl, body)
	});
	if (!res.ok) {
		throw new Error(`Webhook delivery failed ${res.status}: ${await res.text()}`);
	}
}
