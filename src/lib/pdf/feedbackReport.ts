// Client-side PDF export for an event's feedback: one document covering both
// the attendee survey and the staff survey, so an admin gets a single file to
// download and share.
//
// The report is deliberately anonymous: callers build `rows` with neutral
// labels, and no name or email ever reaches this module.
//
// jspdf/jspdf-autotable are imported dynamically by `downloadFeedbackReport`
// so they stay out of the initial bundle — nothing here runs until an admin
// actually clicks the button.
import { formatDateToChile } from '$lib';
import type { FeedbackSummary } from '$lib/feedbackStats';

export type FeedbackPdfRow = {
	/** Anonymous label, e.g. "Asistente 3", "Acompañante 1", "Staff 2". */
	label: string;
	/** Ratings aligned with `questions`; null where the question was skipped. */
	ratings: (number | null)[];
	comment: string | null;
	respondedAt: Date | string | null;
};

export type FeedbackPdfSection = {
	kind: 'asistentes' | 'staff';
	questions: string[];
	summary: FeedbackSummary;
	rows: FeedbackPdfRow[];
	meta: {
		/** People the survey was aimed at (validated attendees / staff list). */
		recipientCount: number;
		emailsSent: number;
		emailsFailed: number;
		emailsPending: number;
		responseRate: number;
		/** Only meaningful for the attendee survey. */
		companionAnswers?: number;
		sentAt: Date | string | null;
	};
};

export type FeedbackPdfInput = {
	eventName: string;
	eventDate?: string | null;
	/** Surveys to include, in order. A survey with no campaign is left out. */
	sections: FeedbackPdfSection[];
};

const MARGIN = 40;
// Bottom margin keeps table rows clear of the page footer.
const FOOTER_SPACE = 46;
const TABLE_MARGIN = { top: MARGIN, bottom: FOOTER_SPACE, left: MARGIN, right: MARGIN };
const TEXT = '#111827';
const MUTED = '#6b7280';
const BORDER = '#d1d5db';

const SECTION_TITLE: Record<FeedbackPdfSection['kind'], string> = {
	asistentes: 'Feedback de asistentes',
	staff: 'Feedback del staff'
};

// Same traffic-light thresholds as FeedbackRatingsChart.svelte, so a question
// that reads "green" on screen reads green on paper too.
function colorFor(average: number | null): string {
	if (average === null) return '#e5e7eb';
	if (average >= 4) return '#4ade80';
	if (average >= 3) return '#facc15';
	return '#f87171';
}

function slugify(value: string): string {
	return (
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60) || 'evento'
	);
}

function ratingLabel(value: number | null): string {
	return value === null || value === 0 ? '—' : `${value}/5`;
}

function averageLabel(average: number | null): string {
	return average === null ? '—' : `${average.toFixed(1)}/5`;
}

export async function downloadFeedbackReport(input: FeedbackPdfInput): Promise<void> {
	const [{ jsPDF }, { default: autoTable }] = await Promise.all([
		import('jspdf'),
		import('jspdf-autotable')
	]);

	const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const contentWidth = pageWidth - MARGIN * 2;

	let y = drawHeader(doc, input, MARGIN, contentWidth);

	input.sections.forEach((section, index) => {
		// Each survey starts on its own page so the two are easy to read apart
		// and to share as separate printouts.
		if (index > 0) {
			doc.addPage();
			y = MARGIN;
		}
		y = drawSection(doc, autoTable, section, y, MARGIN, contentWidth, pageHeight);
	});

	drawFooters(doc, pageWidth, pageHeight);

	const date = new Date().toISOString().slice(0, 10);
	doc.save(`feedback-${slugify(input.eventName)}-${date}.pdf`);
}

type Doc = import('jspdf').jsPDF;
type AutoTable = typeof import('jspdf-autotable').default;

/** Where the last autoTable ended, falling back to the current cursor. */
function lastTableY(doc: Doc, fallback: number): number {
	const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
	return typeof finalY === 'number' ? finalY : fallback;
}

function drawSection(
	doc: Doc,
	autoTable: AutoTable,
	section: FeedbackPdfSection,
	startY: number,
	left: number,
	width: number,
	pageHeight: number
): number {
	const isStaff = section.kind === 'staff';

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(14);
	doc.setTextColor(TEXT);
	doc.text(SECTION_TITLE[section.kind], left, startY);
	let y = startY + 20;

	if (section.summary.answered.length === 0) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(MUTED);
		doc.text('Aún no hay respuestas para esta encuesta.', left, y);
		return y + 26;
	}

	y = drawMetrics(doc, section, y, left, width, isStaff);
	y = drawChart(doc, section, y, left, width, pageHeight);

	// Per-question averages.
	autoTable(doc, {
		startY: y,
		margin: TABLE_MARGIN,
		head: [['Pregunta', 'Promedio', 'Respuestas']],
		body: section.questions.map((question, i) => [
			question,
			averageLabel(section.summary.averages[i]),
			String(section.summary.counts[i] ?? 0)
		]),
		styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, textColor: TEXT },
		headStyles: { fillColor: '#1f2937', textColor: '#ffffff', fontStyle: 'bold' },
		alternateRowStyles: { fillColor: '#f9fafb' },
		columnStyles: {
			1: { cellWidth: 70, halign: 'center' },
			2: { cellWidth: 75, halign: 'center' }
		}
	});
	y = lastTableY(doc, y) + 24;

	if (section.rows.length === 0) return y;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(12);
	doc.setTextColor(TEXT);
	doc.text('Respuestas', left, y);
	y += 8;

	autoTable(doc, {
		startY: y,
		margin: TABLE_MARGIN,
		head: [
			[
				isStaff ? 'Staff' : 'Asistente',
				...section.questions.map((_, i) => `P${i + 1}`),
				'Comentario',
				'Fecha'
			]
		],
		body: section.rows.map((row) => [
			row.label,
			...row.ratings.map(ratingLabel),
			row.comment?.trim() || '—',
			row.respondedAt ? formatDateToChile(row.respondedAt) : '—'
		]),
		styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, textColor: TEXT, valign: 'top' },
		headStyles: { fillColor: '#1f2937', textColor: '#ffffff', fontStyle: 'bold' },
		alternateRowStyles: { fillColor: '#f9fafb' },
		columnStyles: {
			0: { cellWidth: 74 },
			1: { cellWidth: 24, halign: 'center' },
			2: { cellWidth: 24, halign: 'center' },
			3: { cellWidth: 24, halign: 'center' },
			4: { cellWidth: 24, halign: 'center' },
			5: { cellWidth: 24, halign: 'center' },
			7: { cellWidth: 100 }
		}
	});

	return lastTableY(doc, y) + 24;
}

function drawHeader(doc: Doc, input: FeedbackPdfInput, left: number, width: number): number {
	let y = MARGIN + 4;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(9);
	doc.setTextColor(MUTED);
	doc.text('5 LUCHA CLUB', left, y);

	y += 22;
	doc.setFontSize(17);
	doc.setTextColor(TEXT);
	doc.text('Informe de feedback', left, y);

	y += 18;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(11);
	const nameLines: string[] = doc.splitTextToSize(input.eventName || 'Evento sin nombre', width);
	doc.text(nameLines, left, y);
	y += nameLines.length * 14;

	doc.setFontSize(8.5);
	doc.setTextColor(MUTED);
	const subtitle = [
		input.eventDate ? `Evento: ${formatDateToChile(input.eventDate)}` : null,
		`Generado: ${formatDateToChile(new Date())}`
	]
		.filter(Boolean)
		.join('   ·   ');
	doc.text(subtitle, left, y);
	y += 12;

	doc.setDrawColor(BORDER);
	doc.setLineWidth(0.7);
	doc.line(left, y, left + width, y);

	return y + 26;
}

/** Small key/value grid, three metrics per row. */
function drawMetrics(
	doc: Doc,
	section: FeedbackPdfSection,
	startY: number,
	left: number,
	width: number,
	isStaff: boolean
): number {
	const { summary, meta } = section;
	const items: { label: string; value: string }[] = [
		{ label: 'Respuestas', value: String(summary.answered.length) },
		{ label: 'Promedio general', value: averageLabel(summary.overall) },
		{ label: 'Tasa de respuesta', value: meta.emailsSent > 0 ? `${meta.responseRate}%` : '—' },
		{ label: isStaff ? 'Destinatarios' : 'Asistentes', value: String(meta.recipientCount) },
		{ label: 'Correos enviados', value: String(meta.emailsSent) },
		{ label: 'Pendientes / fallidos', value: `${meta.emailsPending} / ${meta.emailsFailed}` }
	];
	if (!isStaff && typeof meta.companionAnswers === 'number') {
		items.push({ label: 'Acompañantes', value: String(meta.companionAnswers) });
	}
	items.push({ label: 'Último envío', value: meta.sentAt ? formatDateToChile(meta.sentAt) : '—' });

	const perRow = 3;
	const gap = 12;
	const cellWidth = (width - gap * (perRow - 1)) / perRow;
	const cellHeight = 44;
	let y = startY;

	items.forEach((item, i) => {
		const col = i % perRow;
		if (col === 0 && i > 0) y += cellHeight + gap;
		const x = left + col * (cellWidth + gap);

		doc.setDrawColor(BORDER);
		doc.setFillColor('#f9fafb');
		doc.setLineWidth(0.7);
		doc.roundedRect(x, y, cellWidth, cellHeight, 4, 4, 'FD');

		doc.setFont('helvetica', 'normal');
		doc.setFontSize(7.5);
		doc.setTextColor(MUTED);
		doc.text(item.label.toUpperCase(), x + 10, y + 16);

		doc.setFont('helvetica', 'bold');
		doc.setFontSize(12);
		doc.setTextColor(TEXT);
		doc.text(doc.splitTextToSize(item.value, cellWidth - 20)[0], x + 10, y + 33);
	});

	return y + cellHeight + 28;
}

/**
 * Horizontal bars drawn straight into the PDF rather than captured from the
 * on-screen Chart.js canvas: that chart hardcodes white axis labels for the
 * dark UI (invisible on paper) and isn't rendered at all when there are no
 * answers yet.
 */
function drawChart(
	doc: Doc,
	section: FeedbackPdfSection,
	startY: number,
	left: number,
	width: number,
	pageHeight: number
): number {
	const { questions, summary } = section;
	const valueWidth = 78;
	const trackWidth = width - valueWidth;
	const barHeight = 11;
	let y = startY;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(12);
	doc.setTextColor(TEXT);
	doc.text('Promedio por pregunta', left, y);
	y += 18;

	questions.forEach((question, i) => {
		const average = summary.averages[i] ?? null;
		const labelLines: string[] = doc.splitTextToSize(question, trackWidth);
		const blockHeight = labelLines.length * 10 + barHeight + 14;

		if (y + blockHeight > pageHeight - FOOTER_SPACE) {
			doc.addPage();
			y = MARGIN;
		}

		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		doc.setTextColor(TEXT);
		doc.text(labelLines, left, y + 7);
		y += labelLines.length * 10 + 2;

		doc.setFillColor('#eef0f3');
		doc.roundedRect(left, y, trackWidth, barHeight, 2, 2, 'F');
		if (average !== null) {
			doc.setFillColor(colorFor(average));
			doc.roundedRect(left, y, Math.max((average / 5) * trackWidth, 3), barHeight, 2, 2, 'F');
		}

		doc.setFontSize(8.5);
		doc.setTextColor(average === null ? MUTED : TEXT);
		const count = summary.counts[i] ?? 0;
		doc.text(
			average === null ? 'Sin respuestas' : `${average.toFixed(1)}/5  (${count})`,
			left + trackWidth + 8,
			y + barHeight - 2
		);

		y += barHeight + 12;
	});

	// Scale reference, so a bar length is readable without an axis.
	doc.setFontSize(7);
	doc.setTextColor(MUTED);
	doc.text('Escala 1 a 5', left, y + 4);

	return y + 22;
}

function drawFooters(doc: Doc, pageWidth: number, pageHeight: number): void {
	const total = doc.getNumberOfPages();
	for (let page = 1; page <= total; page++) {
		doc.setPage(page);
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(7.5);
		doc.setTextColor(MUTED);
		doc.text('Documento interno · 5 Lucha Club', MARGIN, pageHeight - 22);
		doc.text(`Página ${page} de ${total}`, pageWidth - MARGIN, pageHeight - 22, { align: 'right' });
	}
}
