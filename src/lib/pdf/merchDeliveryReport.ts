// Client-side PDF export for the merch that still has to be handed over: a
// picking/delivery sheet an admin can print, carry to the event and tick off
// by hand.
//
// Unlike the feedback report this document is NOT anonymous — its whole point
// is to identify the buyer at the pickup table — so it carries name, email,
// phone, RUT and the shipping address. It is an internal document; the footer
// says so on every page.
//
// jspdf/jspdf-autotable are imported dynamically by `downloadMerchDeliveryReport`
// so they stay out of the initial bundle — nothing here runs until an admin
// actually clicks the button.
import { formatDateToChile } from '$lib';

export type MerchDeliveryItem = {
	name: string;
	variationLabel: string | null;
	quantity: number;
	price: number;
};

export type MerchDeliveryOrder = {
	/** Public order id when there is one, internal id otherwise. */
	orderId: string;
	createdAt: Date | string;
	customerName: string;
	customerEmail: string;
	customerPhone: string | null;
	customerRut: string | null;
	deliveryOption: string | null;
	address: string | null;
	comuna: string | null;
	region: string | null;
	/** Only the undelivered lines; an order with none is left out by the caller. */
	items: MerchDeliveryItem[];
};

export type MerchDeliveryPdfInput = {
	orders: MerchDeliveryOrder[];
};

const MARGIN = 36;
// Bottom margin keeps table rows clear of the page footer.
const FOOTER_SPACE = 42;
const TABLE_MARGIN = { top: MARGIN, bottom: FOOTER_SPACE, left: MARGIN, right: MARGIN };
const TEXT = '#111827';
const MUTED = '#6b7280';
const BORDER = '#d1d5db';

function orderUnits(order: MerchDeliveryOrder): number {
	return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

function orderAmount(order: MerchDeliveryOrder): number {
	return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function money(value: number): string {
	return `$${Math.round(value).toLocaleString('es-CL')}`;
}

/** Name plus variation, the way it has to be read off a box. */
function itemLabel(item: MerchDeliveryItem): string {
	return item.variationLabel ? `${item.name} — ${item.variationLabel}` : item.name;
}

function customerLines(order: MerchDeliveryOrder): string {
	return [order.customerName, order.customerEmail, order.customerPhone, order.customerRut]
		.filter(Boolean)
		.join('\n');
}

/** Delivery method and, for shipments, where it goes. */
function deliveryLines(order: MerchDeliveryOrder): string {
	const place = [order.address, order.comuna, order.region].filter(Boolean).join(', ');
	return [order.deliveryOption ?? '—', place].filter(Boolean).join('\n');
}

export async function downloadMerchDeliveryReport(input: MerchDeliveryPdfInput): Promise<void> {
	const [{ jsPDF }, { default: autoTable }] = await Promise.all([
		import('jspdf'),
		import('jspdf-autotable')
	]);

	// Landscape: the buyer block and the address both need room next to the
	// product columns, and this sheet is read side by side with the boxes.
	const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const contentWidth = pageWidth - MARGIN * 2;

	let y = drawHeader(doc, input, MARGIN, contentWidth);
	y = drawMetrics(doc, input, y, MARGIN, contentWidth);
	y = drawProductSummary(doc, autoTable, input, y, MARGIN);
	drawOrders(doc, autoTable, input, y, MARGIN);
	drawFooters(doc, pageWidth, pageHeight);

	const date = new Date().toISOString().slice(0, 10);
	doc.save(`merch-por-entregar-${date}.pdf`);
}

type Doc = import('jspdf').jsPDF;
type AutoTable = typeof import('jspdf-autotable').default;

/** Where the last autoTable ended, falling back to the current cursor. */
function lastTableY(doc: Doc, fallback: number): number {
	const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
	return typeof finalY === 'number' ? finalY : fallback;
}

function drawHeader(doc: Doc, input: MerchDeliveryPdfInput, left: number, width: number): number {
	let y = MARGIN + 4;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(9);
	doc.setTextColor(MUTED);
	doc.text('5 LUCHAS CLANDESTINO', left, y);

	y += 22;
	doc.setFontSize(17);
	doc.setTextColor(TEXT);
	doc.text('Merch por entregar', left, y);

	y += 16;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8.5);
	doc.setTextColor(MUTED);
	doc.text(`Generado: ${formatDateToChile(new Date())}`, left, y);
	y += 12;

	doc.setDrawColor(BORDER);
	doc.setLineWidth(0.7);
	doc.line(left, y, left + width, y);

	return y + 24;
}

/** Small key/value grid, four metrics per row. */
function drawMetrics(
	doc: Doc,
	input: MerchDeliveryPdfInput,
	startY: number,
	left: number,
	width: number
): number {
	const units = input.orders.reduce((sum, o) => sum + orderUnits(o), 0);
	const amount = input.orders.reduce((sum, o) => sum + orderAmount(o), 0);
	const oldest = input.orders.reduce<Date | null>((acc, o) => {
		const date = new Date(o.createdAt);
		return acc === null || date < acc ? date : acc;
	}, null);

	const items: { label: string; value: string }[] = [
		{ label: 'Órdenes pendientes', value: String(input.orders.length) },
		{ label: 'Unidades por entregar', value: String(units) },
		{ label: 'Monto asociado', value: money(amount) },
		{ label: 'Compra más antigua', value: oldest ? formatDateToChile(oldest) : '—' }
	];

	const perRow = 4;
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

	return y + cellHeight + 26;
}

/**
 * Totals per product/variation, so whoever prepares the boxes knows how many
 * of each to bring without reading the whole order list first.
 */
function drawProductSummary(
	doc: Doc,
	autoTable: AutoTable,
	input: MerchDeliveryPdfInput,
	startY: number,
	left: number
): number {
	const totals = new Map<string, { label: string; units: number; orders: number }>();
	input.orders.forEach((order) => {
		// An order that repeats the same variation on two lines still counts once
		// towards "órdenes".
		const seen = new Set<string>();
		order.items.forEach((item) => {
			const label = itemLabel(item);
			const entry = totals.get(label) ?? { label, units: 0, orders: 0 };
			entry.units += item.quantity;
			if (!seen.has(label)) {
				entry.orders += 1;
				seen.add(label);
			}
			totals.set(label, entry);
		});
	});

	const rows = [...totals.values()].sort((a, b) => b.units - a.units || a.label.localeCompare(b.label));
	if (rows.length === 0) return startY;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(12);
	doc.setTextColor(TEXT);
	doc.text('Resumen por producto', left, startY);

	autoTable(doc, {
		startY: startY + 8,
		margin: TABLE_MARGIN,
		head: [['Producto', 'Unidades', 'Órdenes']],
		body: rows.map((row) => [row.label, String(row.units), String(row.orders)]),
		styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, textColor: TEXT },
		headStyles: { fillColor: '#1f2937', textColor: '#ffffff', fontStyle: 'bold' },
		alternateRowStyles: { fillColor: '#f9fafb' },
		columnStyles: {
			1: { cellWidth: 70, halign: 'center' },
			2: { cellWidth: 70, halign: 'center' }
		}
	});

	return lastTableY(doc, startY) + 26;
}

/**
 * The delivery sheet itself: one row per merch line, grouped by order. The
 * buyer block is printed once per order (blank on the order's following lines)
 * instead of using rowSpan, which does not survive a page break cleanly.
 */
function drawOrders(
	doc: Doc,
	autoTable: AutoTable,
	input: MerchDeliveryPdfInput,
	startY: number,
	left: number
): void {
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(12);
	doc.setTextColor(TEXT);
	doc.text('Detalle por orden', left, startY);

	if (input.orders.length === 0) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(MUTED);
		doc.text('No hay merch pendiente de entrega.', left, startY + 18);
		return;
	}

	const body: string[][] = [];
	// Rows that open an order, so the group gets a separating top border.
	const groupStarts = new Set<number>();
	// Which order each row belongs to, so shading alternates per order instead
	// of per row — a multi-line order has to read as one block.
	const rowGroup: number[] = [];
	input.orders.forEach((order, groupIndex) => {
		groupStarts.add(body.length);
		order.items.forEach((item, i) => {
			rowGroup.push(groupIndex);
			const first = i === 0;
			body.push([
				'', // ticked by hand on the printout
				first ? order.orderId : '',
				first ? formatDateToChile(order.createdAt) : '',
				first ? customerLines(order) : '',
				first ? deliveryLines(order) : '',
				itemLabel(item),
				String(item.quantity),
				money(item.price * item.quantity)
			]);
		});
	});

	autoTable(doc, {
		startY: startY + 8,
		margin: TABLE_MARGIN,
		head: [['OK', 'Orden', 'Fecha', 'Cliente', 'Entrega', 'Producto', 'Cant.', 'Total']],
		body,
		styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, textColor: TEXT, valign: 'top' },
		headStyles: { fillColor: '#1f2937', textColor: '#ffffff', fontStyle: 'bold' },
		columnStyles: {
			0: { cellWidth: 26, halign: 'center' },
			1: { cellWidth: 80 },
			2: { cellWidth: 92 },
			3: { cellWidth: 150 },
			4: { cellWidth: 148 },
			6: { cellWidth: 34, halign: 'center' },
			7: { cellWidth: 58, halign: 'right' }
		},
		didParseCell: (hookData) => {
			if (hookData.section !== 'body') return;
			hookData.cell.styles.fillColor =
				rowGroup[hookData.row.index] % 2 === 1 ? '#f3f4f6' : '#ffffff';
			if (groupStarts.has(hookData.row.index) && hookData.row.index > 0) {
				// Visually separate one order from the next.
				hookData.cell.styles.lineWidth = { top: 0.8, right: 0, bottom: 0, left: 0 };
				hookData.cell.styles.lineColor = '#9ca3af';
			}
		},
		didDrawCell: (hookData) => {
			// Empty tick box in the first column of every merch line.
			if (hookData.section !== 'body' || hookData.column.index !== 0) return;
			const size = 9;
			const x = hookData.cell.x + (hookData.cell.width - size) / 2;
			const y = hookData.cell.y + 5;
			doc.setDrawColor('#6b7280');
			doc.setLineWidth(0.6);
			doc.rect(x, y, size, size, 'S');
		}
	});
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
