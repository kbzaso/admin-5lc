<script lang="ts">
	import { Badge } from "$lib/components/ui/badge";
	import { PortableText } from '@portabletext/svelte';
	import { urlFor } from '$lib/sanity';
	import { onMount } from 'svelte';
	export let totalMoneyRaised: number;
	export let ticketsSold: number;
	export let studioTicketsAvailable: number;
	export let eventFromSanityStudio: any;
	export let sellType: string;
	import * as Card from '$lib/components/ui/card/index.js';
	import { TicketPercent, DollarSign, Percent } from 'lucide-svelte';
	import { SELL_TYPE } from '$lib/consts';

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

<div class="flex md:flex-row flex-col justify-between gap-2">
	<div class="md:w-32 grow">
		<Card.Root
			data-x-chunk-name="card-01"
			data-x-chunk-description="Una tarjeta que muestra la información del evento."
			class="flex"
		>
			<div>
				<Card.Header>
					<Card.Title tag="h1" class="text-xl font-medium leading-none text-yellow-400"
						>{eventFromSanityStudio?.title}</Card.Title
					>
					<Card.Description>
						<time>
							{new Date(eventFromSanityStudio?.date).toLocaleDateString('es-CL', {
								dateStyle: 'full'
							})}
						</time>
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-sm font-medium">Descripción:</p>
					<p class="line-clamp-3 text-muted-foreground text-sm">
						<PortableText value={eventFromSanityStudio?.description} components={{}} />
					</p>

					<div class="mt-4">
						<span class="text-sm font-medium"
							>El evento se {showCountdown ? 'realizará' : 'se realizo'} en:</span
						>
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
							<span class="text-sm font-medium"> Para el evento quedan: </span>
							<span class="text-primary">
								{countdown}
							</span>
						</div>
					{/if}
					<Badge class="mt-4">{SELL_TYPE[sellType]}</Badge>
				</Card.Content>
			</div>
			<Card.Footer class="order-first hidden lg:inline-block pl-4 pt-4 pr-0 w-full min-w-fit">
				<img
					class="rounded-lg object-cover w-full h-full"
					alt="afiche del evento"
					src={urlFor(eventFromSanityStudio.poster).height(300).quality(80).url()}
				/>
			</Card.Footer>
		</Card.Root>
	</div>

	<div class="flex flex-col md:w-fit gap-y-2">
		<Card.Root
			data-x-chunk-name="card-01"
			data-x-chunk-description="Una tarjeta que muestra la cantidad de entradas vendidas y las que quedan por vender."
		>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Entradas vendidas</Card.Title>
				<TicketPercent class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{ticketsSold}</div>
				<p class="text-xs text-muted-foreground">
					Quedan por vender {studioTicketsAvailable} unidades.
				</p>
			</Card.Content>
		</Card.Root>
		<Card.Root
			data-x-chunk-name="card-02"
			data-x-chunk-description="Una tarjeta que muestra el porcentaje de venta de entradas."
		>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Porcentaje de venta</Card.Title>
				<Percent class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{percentage.toFixed(2)}%</div>
				<p class="text-xs text-muted-foreground">De un total de {stock} entradas.</p>
			</Card.Content>
		</Card.Root>
		<Card.Root
			data-x-chunk-name="card-03"
			data-x-chunk-description="Una tarjeta que muestra el monto total generado por la venta de entradas."
		>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Monto generado</Card.Title>
				<DollarSign class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{totalMoneyFormatted}</div>
				<p class="text-xs text-muted-foreground">Sin descuentos aplicados.</p>
			</Card.Content>
		</Card.Root>
	</div>
</div>
