<script lang="ts">
	import { navigating } from '$app/stores';
	import { Loader2 } from 'lucide-svelte';

	const SHOW_DELAY_MS = 150;
	const EXIT_MS = 140;

	let show = false;
	let exiting = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let exitTimer: ReturnType<typeof setTimeout> | undefined;

	$: {
		if ($navigating) {
			if (exitTimer) {
				clearTimeout(exitTimer);
				exitTimer = undefined;
			}
			exiting = false;
			if (!show && !timer) {
				timer = setTimeout(() => {
					show = true;
					timer = undefined;
				}, SHOW_DELAY_MS);
			}
		} else {
			if (timer) {
				clearTimeout(timer);
				timer = undefined;
			}
			if (show && !exiting) {
				exiting = true;
				exitTimer = setTimeout(() => {
					show = false;
					exiting = false;
					exitTimer = undefined;
				}, EXIT_MS);
			}
		}
	}
</script>

{#if show}
	<div
		class="nav-overlay fixed inset-0 z-100 flex items-center justify-center bg-base-100/60 backdrop-blur-sm pointer-events-none"
		class:nav-overlay-exit={exiting}
		role="status"
		aria-live="polite"
		aria-label="Cargando página"
	>
		<div
			class="nav-overlay-card flex items-center gap-3 rounded-xl border border-base-content/20 bg-base-300 px-4 py-3 shadow-lg"
		>
			<Loader2 class="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
			<span class="text-sm font-medium">Cargando...</span>
		</div>
	</div>
{/if}

<style>
	.nav-overlay-exit {
		animation: nav-overlay-out var(--motion-duration-micro, 140ms)
			var(--ease-linear-exit-crisp, ease-out) both;
	}

	.nav-overlay-exit :global(.nav-overlay-card) {
		animation: nav-card-out var(--motion-duration-micro, 140ms)
			var(--ease-linear-exit-crisp, ease-out) both;
	}

	@keyframes nav-overlay-out {
		to {
			opacity: 0;
		}
	}

	@keyframes nav-card-out {
		to {
			opacity: 0;
			translate: 0 4px;
			scale: 0.98;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.nav-overlay-exit,
		.nav-overlay-exit :global(.nav-overlay-card) {
			animation-duration: 80ms;
			animation-timing-function: linear;
		}

		@keyframes nav-card-out {
			to {
				opacity: 0;
			}
		}
	}
</style>
