<script lang="ts">
	import { Bar } from 'svelte-chartjs';
	import {
		Chart as ChartJS,
		Title,
		Tooltip,
		Legend,
		BarElement,
		CategoryScale,
		LinearScale,
		type TooltipItem
	} from 'chart.js';

	ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

	export let questions: string[] = [];
	/** Per-question averages on the 1–5 scale; null where nobody answered. */
	export let averages: (number | null)[] = [];
	/** Per-question answer counts, shown in the tooltip. */
	export let counts: number[] = [];

	// Long question texts would be truncated on a single axis line, so wrap them
	// into the string[] form Chart.js renders as multiple lines.
	function wrap(label: string, max = 28): string[] {
		const words = label.split(' ');
		const lines: string[] = [];
		let line = '';
		for (const word of words) {
			if ((line + ' ' + word).trim().length > max && line) {
				lines.push(line);
				line = word;
			} else {
				line = line ? `${line} ${word}` : word;
			}
		}
		if (line) lines.push(line);
		return lines;
	}

	// Traffic-light fill so the weak areas stand out at a glance. The value is
	// also printed next to each question in the panel, so colour is never the
	// only carrier of meaning.
	function colorFor(avg: number | null): string {
		if (avg === null) return 'rgba(255,255,255,0.15)';
		if (avg >= 4) return '#4ade80';
		if (avg >= 3) return '#facc15';
		return '#f87171';
	}

	$: hasAnswers = averages.some((a) => a !== null);

	$: chartData = {
		labels: questions.map((q) => wrap(q)),
		datasets: [
			{
				label: 'Promedio',
				data: averages.map((a) => a ?? 0),
				backgroundColor: averages.map(colorFor),
				borderRadius: 4,
				borderSkipped: false
			}
		]
	};

	$: chartOptions = {
		indexAxis: 'y' as const,
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false },
			tooltip: {
				callbacks: {
					label: (ctx: TooltipItem<'bar'>) => {
						const avg = averages[ctx.dataIndex];
						const n = counts[ctx.dataIndex] ?? 0;
						if (avg === null) return 'Sin respuestas';
						return `${avg.toFixed(1)} de 5 — ${n} ${n === 1 ? 'respuesta' : 'respuestas'}`;
					}
				}
			}
		},
		scales: {
			x: {
				beginAtZero: true,
				max: 5,
				grid: { color: 'rgba(255,255,255,0.08)' },
				ticks: { color: 'rgba(255,255,255,0.7)', stepSize: 1, precision: 0 }
			},
			y: {
				grid: { display: false },
				ticks: { color: 'rgba(255,255,255,0.7)', autoSkip: false }
			}
		}
	};
</script>

{#if hasAnswers}
	<div class="h-[320px] w-full">
		<Bar data={chartData} options={chartOptions} />
	</div>
{:else}
	<p class="text-sm text-muted-foreground">Aún no hay respuestas para graficar.</p>
{/if}
