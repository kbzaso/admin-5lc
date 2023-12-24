<script lang="ts">
	import { page } from '$app/stores';
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<div class="container mx-auto px-4 mb-4 min-h-screen flex flex-col">
	{#if $page.url.pathname === '/login' || $page.url.pathname === '/signup'}
		<img
			class="w-20 mx-auto mt-4"
			src="https://cdn.sanity.io/images/izngoptr/production/ee38bb721de0e7b08cae68dcfe5b641c9449881c-71x40.svg?fit=max&auto=format"
			alt="Logo 5LC"
		/>
	{:else}
		<Navbar />
	{/if}
	<slot />
	<div class="mt-auto pt-4 mb-4">
		<Footer />
	</div>
</div>
