<script lang="ts">
	// Downloads the "merch por entregar" sheet: every paid order that still has
	// an undelivered merch line, with the buyer's contact and shipping details
	// so the pickup table can find the person and tick the box.
	//
	// It exports what the caller passes in — the orders page hands it the rows
	// currently on screen, so search and filters carry over to the PDF.
	import { Button } from '$lib/components/ui/button/index.js';
	import { Download } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import type { MerchDeliveryOrder } from '$lib/pdf/merchDeliveryReport';

	type MerchLine = {
		quantity: number;
		price: number;
		delivered: boolean;
		variationLabel: string | null;
		Merch: { name: string };
	};
	type Order = {
		id: string;
		orderId: string | null;
		status: string;
		createdAt: Date | string;
		customerName: string;
		customerEmail: string;
		customerPhone: string | null;
		customerRut: string | null;
		deliveryOption: string | null;
		address: string | null;
		comuna: string | null;
		region: string | null;
		MerchPayment: MerchLine[];
	};

	export let orders: Order[] = [];

	let exporting = false;

	// Only paid orders, only the lines still owed — same rule the table uses to
	// flag a row as pending. Oldest first: that is the order they get handed over.
	$: pending = orders
		.filter((order) => order.status === 'success')
		.map<MerchDeliveryOrder>((order) => ({
			orderId: order.orderId ?? order.id,
			createdAt: order.createdAt,
			customerName: order.customerName,
			customerEmail: order.customerEmail,
			customerPhone: order.customerPhone,
			customerRut: order.customerRut,
			deliveryOption: order.deliveryOption,
			address: order.address,
			comuna: order.comuna,
			region: order.region,
			items: order.MerchPayment.filter((m) => !m.delivered).map((m) => ({
				name: m.Merch.name,
				variationLabel: m.variationLabel,
				quantity: m.quantity,
				price: m.price
			}))
		}))
		.filter((order) => order.items.length > 0)
		.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

	async function exportPdf() {
		exporting = true;
		try {
			const { downloadMerchDeliveryReport } = await import('$lib/pdf/merchDeliveryReport');
			await downloadMerchDeliveryReport({ orders: pending });
		} catch (e) {
			console.error('[merch] PDF export failed', e);
			toast.error('No se pudo generar el PDF');
		} finally {
			exporting = false;
		}
	}
</script>

<Button
	variant="outline"
	size="sm"
	disabled={pending.length === 0 || exporting}
	title={pending.length > 0
		? `Descargar ${pending.length} ${pending.length === 1 ? 'orden' : 'órdenes'} con merch por entregar`
		: 'No hay merch pendiente de entrega'}
	on:click={exportPdf}
>
	<Download class="mr-2 h-4 w-4" />
	{exporting ? 'Generando...' : 'Merch por entregar (PDF)'}
</Button>
