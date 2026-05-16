<script lang="ts">
	import { UserButton, Show } from 'svelte-clerk';
	import { page } from '$app/state';
	import { buttonVariants } from '$lib/components/ui/button';
	import Menu from 'lucide-svelte/icons/menu';
	import X from 'lucide-svelte/icons/x';

	let open = $state(false);

	$effect(() => {
		page.url.pathname;
		open = false;
	});
</script>

<div class="w-full">
	<div class="flex py-6 justify-between items-center">
		<a href="/eventos" class={buttonVariants({ variant: 'ghost', size: 'lg' })} aria-label="Inicio">
			<img
				src="https://cdn.sanity.io/images/izngoptr/production/ee38bb721de0e7b08cae68dcfe5b641c9449881c-71x40.svg?fit=max&auto=format"
				alt="Logo 5LC"
			/>
		</a>

		<div class="hidden md:flex gap-4 items-center">
			{#if page.data.user?.admin}
				<a href="/eventos" class={buttonVariants({ variant: 'secondary' })}>Eventos</a>
				<a href="/ordenes" class={buttonVariants({ variant: 'secondary' })}>Órdenes</a>
			{/if}

			<Show when="signed-in">
				<UserButton />
			</Show>
			<Show when="signed-out">
				No estas logeado
			</Show>
		</div>

		<div class="flex md:hidden items-center gap-2">
			<Show when="signed-in">
				<UserButton />
			</Show>
			<button
				type="button"
				class={buttonVariants({ variant: 'ghost', size: 'icon' })}
				aria-label="Abrir menú"
				aria-expanded={open}
				aria-controls="mobile-menu"
				onclick={() => (open = !open)}
			>
				{#if open}
					<X class="h-6 w-6" aria-hidden="true" />
				{:else}
					<Menu class="h-6 w-6" aria-hidden="true" />
				{/if}
			</button>
		</div>
	</div>

	{#if open}
		<div id="mobile-menu" class="md:hidden flex flex-col gap-2 pb-4">
			{#if page.data.user?.admin}
				<a
					href="/eventos"
					class={`${buttonVariants({ variant: 'secondary' })} justify-start`}
				>
					Entradas
				</a>
				<a
					href="/ordenes"
					class={`${buttonVariants({ variant: 'secondary' })} justify-start`}
				>
					Órdenes
				</a>
			{/if}
			<Show when="signed-out">
				<span class="px-2">No estas logeado</span>
			</Show>
		</div>
	{/if}
</div>
