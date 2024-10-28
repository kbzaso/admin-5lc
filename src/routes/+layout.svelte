<script lang="ts">
	import '../app.css';
	import Footer from '$lib/components/Footer.svelte';
	import { Toaster } from "$lib/components/ui/sonner";
</script>

<div class="container mx-auto px-4 mb-4 min-h-screen flex flex-col">
	<Toaster position="bottom-right" class="mb-10" />
	<slot />
	<div class="mt-auto pt-4 mb-4">
		<Footer />
	</div>
</div>
