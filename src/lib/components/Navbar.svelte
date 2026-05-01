<script lang="ts">
	import { UserButton, Show } from 'svelte-clerk';
	import { page } from '$app/state';
</script>

<div class="w-full">
	<div class="flex py-6 justify-between">
		<a href="/eventos" class="btn btn-ghost text-xl">
			<img
				src="https://cdn.sanity.io/images/izngoptr/production/ee38bb721de0e7b08cae68dcfe5b641c9449881c-71x40.svg?fit=max&auto=format"
				alt="Logo 5LC"
			/></a
		>
		<div class="flex gap-4">
			{#if page.data.user?.admin}
				<a href="/eventos" class="btn btn-soft">Entradas</a>
				<a href="/merch" class="btn btn-soft">Merch</a>
			{/if}

			<Show when="signed-in">
				<UserButton />
			</Show>
			<Show when="signed-out">
				No estas logeado
			</Show>
		</div>
	</div>
</div>
