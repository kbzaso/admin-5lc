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
	import { chipClass } from '$lib';
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

	// What each bar counts: individual tickets, or buys (one per payment).
	let metric: 'tickets' | 'buys' = 'tickets';

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
				count = metric === 'buys' ? 1 : (p.ticketAmount ?? 0);
			} else {
				if ($onlyUnvalidated && !isNotFullyValidated(p)) continue;
				let tickets = 0;
				for (const s of slicesFor(p, isUbication)) {
					if ($selectedCategories[s.category]) tickets += s.amount;
				}
				// In buys mode a payment counts once when any of its tickets
				// fall in a selected category.
				count = metric === 'buys' ? (tickets > 0 ? 1 : 0) : tickets;
			}
			if (count === 0) continue;
			const key = dayKey(p.date);
			byDay.set(key, (byDay.get(key) ?? 0) + count);
		}
		return [...byDay.entries()]
			.map(([key, count]) => ({ key, date: dateFromKey(key), count }))
			.sort((a, b) => a.date.getTime() - b.date.getTime());
	})();

	$: hasValues = dailyTotals.some((d) => d.count > 0);

	$: chartTitle = $showRejected
		? metric === 'buys'
			? 'Compras no exitosas por día'
			: 'Entradas no exitosas por día'
		: metric === 'buys'
			? 'Compras por día'
			: 'Entradas vendidas por día';
	$: emptyMessage = $showRejected
		? 'No hay pagos no exitosos registrados'
		: 'Aún no hay ventas registradas';

	$: metricLabel = metric === 'buys' ? 'compras' : 'entradas';

	$: chartData = {
		labels: dailyTotals.map((d) => dateFormatter.format(d.date)),
		datasets: [
			{
				label: metric === 'buys' ? 'Compras' : 'Entradas',
				data: dailyTotals.map((d) => d.count),
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
					label: (ctx: any) => `${ctx.parsed.y} ${metricLabel}`
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
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<h2 class="text-sm font-medium text-base-content/80">{chartTitle}</h2>
		<div class="flex items-center gap-2" role="group" aria-label="Métrica del gráfico">
			<button
				type="button"
				on:click={() => (metric = 'tickets')}
				class={chipClass(metric === 'tickets')}
			>
				Entradas
			</button>
			<button
				type="button"
				on:click={() => (metric = 'buys')}
				class={chipClass(metric === 'buys')}
			>
				Compras
			</button>
		</div>
	</div>
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
