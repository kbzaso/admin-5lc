<script lang="ts">
	import { Bar } from 'svelte-chartjs';
	import {
		Chart as ChartJS,
		Title,
		Tooltip,
		Legend,
		BarElement,
		CategoryScale,
		LinearScale
	} from 'chart.js';

	ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

	export let events: any[];
	export let metric: 'revenue' | 'tickets' = 'revenue';

	const priceFormatter = new Intl.NumberFormat('es-CL', {
		style: 'currency',
		currency: 'CLP',
		maximumFractionDigits: 0
	});
	const compactFormatter = new Intl.NumberFormat('es-CL', {
		notation: 'compact',
		maximumFractionDigits: 1
	});
	const dateFormatter = new Intl.DateTimeFormat('es-CL', {
		day: '2-digit',
		month: 'short',
		year: '2-digit'
	});

	$: sorted = [...events]
		.filter((e) => e?.date)
		.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

	$: hasValues = sorted.some(
		(e) => (metric === 'revenue' ? e.totalPayment : e.totalTicketsSold) > 0
	);

	$: chartData = {
		labels: sorted.map((e) => dateFormatter.format(new Date(e.date))),
		datasets: [
			{
				label: metric === 'revenue' ? 'Recaudación' : 'Entradas',
				data: sorted.map((e) =>
					metric === 'revenue' ? (e.totalPayment ?? 0) : (e.totalTicketsSold ?? 0)
				),
				backgroundColor: '#facc15',
				borderRadius: 4,
				borderSkipped: false
			}
		]
	};

	$: chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false },
			tooltip: {
				callbacks: {
					title: (items: any[]) => sorted[items[0].dataIndex]?.name ?? '',
					label: (ctx: any) =>
						metric === 'revenue'
							? priceFormatter.format(ctx.parsed.y)
							: `${ctx.parsed.y} entradas`
				}
			}
		},
		scales: {
			x: {
				grid: { display: false, color: 'rgba(255,255,255,0.08)' },
				ticks: { color: 'rgba(255,255,255,0.7)' }
			},
			y: {
				beginAtZero: true,
				grid: { color: 'rgba(255,255,255,0.08)' },
				ticks: {
					color: 'rgba(255,255,255,0.7)',
					callback: (v: number | string) =>
						metric === 'revenue'
							? `$${compactFormatter.format(Number(v))}`
							: compactFormatter.format(Number(v))
				}
			}
		}
	};
</script>

{#if sorted.length > 0 && hasValues}
	<div class="h-72 w-full">
		<Bar data={chartData} options={chartOptions} />
	</div>
{:else}
	<div class="flex h-72 w-full items-center justify-center text-sm text-base-content/60">
		{sorted.length === 0 ? 'Sin eventos para graficar' : 'Aún no hay datos para este período'}
	</div>
{/if}
