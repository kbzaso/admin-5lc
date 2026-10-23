<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ScanLine } from 'lucide-svelte';
	import { createEventDispatcher, onDestroy, tick } from 'svelte';
	import jsQR from 'jsqr';

	// Emits `scan` with the decoded text (the Payment.id printed on the buyer's
	// ticket PDF). The caller decides what to do with it.
	const dispatch = createEventDispatcher<{ scan: string }>();

	let open = false;
	let video: HTMLVideoElement | undefined;
	let canvas: HTMLCanvasElement | undefined;
	let stream: MediaStream | null = null;
	let frame = 0;
	let error = '';

	async function start() {
		error = '';
		await tick();
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: { ideal: 'environment' } },
				audio: false
			});
		} catch {
			error = 'No pudimos acceder a la cámara. Revisa los permisos del navegador (requiere HTTPS).';
			return;
		}
		if (!video) return stop();
		video.srcObject = stream;
		video.setAttribute('playsinline', 'true'); // iOS Safari
		await video.play().catch(() => {});
		frame = requestAnimationFrame(tickScan);
	}

	function tickScan() {
		if (!video || !canvas) return;
		if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth) {
			const ctx = canvas.getContext('2d', { willReadFrequently: true });
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
			const img = ctx?.getImageData(0, 0, canvas.width, canvas.height);
			const result = img && jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
			if (result?.data) {
				open = false;
				dispatch('scan', result.data.trim());
				return;
			}
		}
		frame = requestAnimationFrame(tickScan);
	}

	function stop() {
		cancelAnimationFrame(frame);
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
	}

	$: if (open) start();
	$: if (!open) stop();
	onDestroy(stop);
</script>

<Dialog.Root bind:open>
	<Button type="button" variant="outline" class="h-11 gap-2" on:click={() => (open = true)}>
		<ScanLine class="h-4 w-4" aria-hidden="true" />
		Escanear QR
	</Button>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Escanear entrada</Dialog.Title>
			<Dialog.Description>Apunta la cámara al código QR del PDF de la entrada.</Dialog.Description>
		</Dialog.Header>
		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{:else}
			<!-- svelte-ignore a11y-media-has-caption -->
			<video bind:this={video} class="w-full rounded-lg bg-black aspect-square object-cover" muted />
		{/if}
		<canvas bind:this={canvas} class="hidden" />
	</Dialog.Content>
</Dialog.Root>
