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

	export let payments: any[];

	const dateFormatter = new Intl.DateTimeFormat('es-CL', {
		day: '2-digit',
		month: 'short'
	});
	const fullDateFormatter = new Intl.DateTimeFormat('es-CL', {
		day: '2-digit',
		month: 'long',
		year: 'numeric'
	});

	function dayKey(value: string | Date): string {
		const d = new Date(value);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
			d.getDate()
		).padStart(2, '0')}`;
	}

	// Build a Date at local midnight from a "YYYY-MM-DD" key. Passing the string
	// straight into `new Date()` would parse it as UTC midnight, which then shifts
	// to the previous day when formatted in Chile's timezone.
	function dateFromKey(key: string): Date {
		const [year, month, day] = key.split('-').map(Number);
		return new Date(year, month - 1, day);
	}

	$: dailyTotals = (() => {
		const byDay = new Map<string, number>();
		for (const p of payments ?? []) {
			if (!p?.date) continue;
			if (p.refund || p.changeEvent) continue;
			if (p.payment_status !== 'success' && p.payment_status !== 'system') continue;
			const key = dayKey(p.date);
			byDay.set(key, (byDay.get(key) ?? 0) + (p.ticketAmount ?? 0));
		}
		return [...byDay.entries()]
			.map(([key, tickets]) => ({ key, date: dateFromKey(key), tickets }))
			.sort((a, b) => a.date.getTime() - b.date.getTime());
	})();

	$: hasValues = dailyTotals.some((d) => d.tickets > 0);

	$: chartData = {
		labels: dailyTotals.map((d) => dateFormatter.format(d.date)),
		datasets: [
			{
				label: 'Entradas',
				data: dailyTotals.map((d) => d.tickets),
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
					title: (items: any[]) => fullDateFormatter.format(dailyTotals[items[0].dataIndex].date),
					label: (ctx: any) => `${ctx.parsed.y} entradas`
				}
			}
		},
		scales: {
			x: {
				grid: { display: false },
				ticks: { color: 'rgba(255,255,255,0.7)' }
			},
			y: {
				beginAtZero: true,
				grid: { color: 'rgba(255,255,255,0.08)' },
				ticks: {
					color: 'rgba(255,255,255,0.7)',
					precision: 0
				}
			}
		}
	};
</script>

<div class="rounded-xl border border-base-content/20 p-4">
	<h2 class="text-sm font-medium text-base-content/80 mb-4">Entradas vendidas por día</h2>
	{#if hasValues}
		<div class="h-72 w-full">
			<Bar data={chartData} options={chartOptions} />
		</div>
	{:else}
		<div class="flex h-72 w-full items-center justify-center text-sm text-base-content/60">
			Aún no hay ventas registradas
		</div>
	{/if}
</div>
