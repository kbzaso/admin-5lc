<script lang="ts">
	import '../app.css';
	import Footer from '$lib/components/Footer.svelte';
	import { Toaster } from "$lib/components/ui/sonner";
</script>

<div class="container mx-auto px-4 mb-4 flex flex-col">
	<Toaster position="top-right"/>
	<slot />
	<div class="mt-auto pt-4 mb-4">
		<Footer />
	</div>
</div>
