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
	import { page } from '$app/stores';
	import {
		slicesFor,
		selectedCategories,
		onlyUnvalidated,
		isNotFullyValidated,
		showRejected,
		isRejectedBucket
	} from '$lib/stores/paymentFilter';

	ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

	export let payments: any[];

	// 'batch' events sell tiers stored in `buys`; 'ubication' events sell zones
	// stored in `ticketsType`. The selected categories are shared with the
	// payments table via the paymentFilter store.
	$: isUbication = $page.data.sell_type === 'ubication';

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
			let count = 0;
			if ($showRejected) {
				// Rejected view: plot the non-success payments, ignoring the
				// category and validation chips (which don't apply to them).
				if (!isRejectedBucket(p)) continue;
				count = p.ticketAmount ?? 0;
			} else {
				if ($onlyUnvalidated && !isNotFullyValidated(p)) continue;
				for (const s of slicesFor(p, isUbication)) {
					if ($selectedCategories[s.category]) count += s.amount;
				}
			}
			if (count === 0) continue;
			const key = dayKey(p.date);
			byDay.set(key, (byDay.get(key) ?? 0) + count);
		}
		return [...byDay.entries()]
			.map(([key, tickets]) => ({ key, date: dateFromKey(key), tickets }))
			.sort((a, b) => a.date.getTime() - b.date.getTime());
	})();

	$: hasValues = dailyTotals.some((d) => d.tickets > 0);

	$: chartTitle = $showRejected
		? 'Entradas no exitosas por día'
		: 'Entradas vendidas por día';
	$: emptyMessage = $showRejected
		? 'No hay pagos no exitosos registrados'
		: 'Aún no hay ventas registradas';

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
	<h2 class="text-sm font-medium text-base-content/80 mb-4">{chartTitle}</h2>
	{#if hasValues}
		<div class="h-72 w-full">
			<Bar data={chartData} options={chartOptions} />
		</div>
	{:else}
		<div class="flex h-72 w-full items-center justify-center text-sm text-base-content/60">
			{emptyMessage}
		</div>
	{/if}
</div>
