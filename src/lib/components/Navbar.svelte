<script lang="ts">
	import { UserButton, Show } from 'svelte-clerk';
	import { page } from '$app/state';

	let open = $state(false);

	$effect(() => {
		page.url.pathname;
		open = false;
	});
</script>

<div class="w-full">
	<div class="flex py-6 justify-between items-center">
		<a href="/eventos" class="btn btn-ghost text-xl">
			<img
				src="https://cdn.sanity.io/images/izngoptr/production/ee38bb721de0e7b08cae68dcfe5b641c9449881c-71x40.svg?fit=max&auto=format"
				alt="Logo 5LC"
			/>
		</a>

		<div class="hidden md:flex gap-4 items-center">
			{#if page.data.user?.admin}
				<a href="/eventos" class="btn btn-soft">Entradas</a>
				<a href="/ordenes" class="btn btn-soft">Órdenes</a>
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
				class="btn btn-ghost btn-square"
				aria-label="Abrir menú"
				aria-expanded={open}
				aria-controls="mobile-menu"
				onclick={() => (open = !open)}
			>
				{#if open}
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				{/if}
			</button>
		</div>
	</div>

	{#if open}
		<div id="mobile-menu" class="md:hidden flex flex-col gap-2 pb-4">
			{#if page.data.user?.admin}
				<a href="/eventos" class="btn btn-soft justify-start">Entradas</a>
				<a href="/ordenes" class="btn btn-soft justify-start">Órdenes</a>
			{/if}
			<Show when="signed-out">
				<span class="px-2">No estas logeado</span>
			</Show>
		</div>
	{/if}
</div>
