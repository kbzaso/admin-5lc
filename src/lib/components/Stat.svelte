<script lang="ts">
	import { PortableText } from '@portabletext/svelte';
	import { urlFor } from '$lib/sanity';
	import { onMount } from 'svelte';
	export let totalMoneyRaised: number;
	export let ticketsSold: number;
	export let studioTicketsAvailable: number;
	export let eventFromSanityStudio: any;

	const percentage = (ticketsSold / (ticketsSold + studioTicketsAvailable)) * 100;

	const stock = ticketsSold + studioTicketsAvailable;

	const totalMoneyFormatted = new Intl.NumberFormat('es-CL', {
		style: 'currency',
		currency: 'CLP'
	}).format(totalMoneyRaised);

	let countdown = '';
	let showCountdown = true;

	onMount(() => {
		const intervalId = setInterval(() => {
			const now = new Date();
			const eventDate = new Date(eventFromSanityStudio.date);
			const diff = eventDate.getTime() - now.getTime();

			if (diff <= 0) {
				showCountdown = false;
				clearInterval(intervalId);
			} else {
				const days = Math.floor(diff / (1000 * 60 * 60 * 24));
				const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
				const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
				const seconds = Math.floor((diff % (1000 * 60)) / 1000);

				countdown = `${days} días ${hours} horas ${minutes} minutos ${seconds} segundos`;
			}
		}, 1000);

		return () => clearInterval(intervalId); // cleanup on component unmount
	});
</script>

<div class="flex md:flex-row flex-col justify-between gap-4">
	<div class="hidden lg:inline-block">
		<img
			class="rounded-lg"
			alt="afiche del evento"
			src={urlFor(eventFromSanityStudio.poster).height(300).quality(80).url()}
		/>
	</div>
	<div class="grow  md:w-32 border border-neutral-content/25 rounded-lg p-4">
		<h1 class="text-3xl text-primary text-wrap">{eventFromSanityStudio?.title}</h1>
		<time>
			{new Date(eventFromSanityStudio?.date).toLocaleDateString('es-CL', { dateStyle: 'full' })}
		</time>
		<p class="line-clamp-2 mt-4">
			<PortableText value={eventFromSanityStudio?.description} components={{}} />
		</p>
		<div class="mt-4">
			<span class="text-xs">El evento se {showCountdown ? 'realizará' : 'se realizo'} en:</span>
			{#if eventFromSanityStudio?.boveda}
				<p>
					Bóveda Secreta - <a
						class="text-primary hover:underline text-xs"
						target="_blank"
						rel="noreferrer"
						href="https://goo.gl/maps/85ZfvTdLAoDpt9xr9"
					>
						San Antonio 705, Santiago, Región Metropolitana</a
					>
				</p>
			{:else}
				<p>
					{eventFromSanityStudio?.venue?.venueName} -
					<a
						class="text-primary hover:underline text-xs"
						target="_blank"
						rel="noreferrer"
						href={eventFromSanityStudio?.venue?.venueUrl}
					>
						{eventFromSanityStudio?.venue?.venueAdress}</a
					>
				</p>
			{/if}
		</div>
		{#if showCountdown}
			<div class="flex flex-col mt-4">
				<span class="text-xs"> Para el evento quedan: </span>
				<span class="text-primary">
					{countdown}
				</span>
			</div>
		{/if}
	</div>
	<div class="flex flex-col md:w-fit w-full rounded-lg divide-y-2 shadow bg-gray-800">
		<div class="stat">
			<div class="stat-figure text-secondary">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					class="inline-block w-8 h-8 stroke-current"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/></svg
				>
			</div>
			<div class="stat-title">Entradas vendidas</div>
			<div class="stat-value text-primary">{ticketsSold}</div>
			<div class="stat-desc text-secondary">
				Quedan por vender {studioTicketsAvailable} unidades
			</div>
		</div>

		<div class="stat">
			<div class="stat-value">{percentage.toFixed(2)}%</div>
			<div class="stat-title">De entradas vendidas</div>
			<div class="stat-desc text-secondary">De un total de {stock} entradas</div>
		</div>

		<div class="stat">
			<div class="stat-figure text-primary">
				<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 256 256"
					><path
						fill="currentColor"
						d="M128 88a40 40 0 1 0 40 40a40 40 0 0 0-40-40Zm0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24Zm112-96H16a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h224a8 8 0 0 0 8-8V64a8 8 0 0 0-8-8Zm-46.35 128H62.35A56.78 56.78 0 0 0 24 145.65v-35.3A56.78 56.78 0 0 0 62.35 72h131.3A56.78 56.78 0 0 0 232 110.35v35.3A56.78 56.78 0 0 0 193.65 184ZM232 93.37A40.81 40.81 0 0 1 210.63 72H232ZM45.37 72A40.81 40.81 0 0 1 24 93.37V72ZM24 162.63A40.81 40.81 0 0 1 45.37 184H24ZM210.63 184A40.81 40.81 0 0 1 232 162.63V184Z"
					/></svg
				>
			</div>
			<div class="stat-title">Monto generado</div>
			<div class="stat-value text-primary">{totalMoneyFormatted}</div>
			<!-- <div class="stat-desc">21% more than last month</div> -->
		</div>
	</div>
</div>
