<script lang="ts">
	import '../app.css';
	import Footer from '$lib/components/Footer.svelte';
	import { Toaster } from "$lib/components/ui/sonner";
	import Navbar from '$lib/components/Navbar.svelte';
</script>

<div class="max-w-6xl px-4 mx-auto mb-4 flex flex-col min-h-screen">
	<Navbar />
	<Toaster position="top-right"/>
	<slot />
	<div class="mt-auto pt-4 mb-4">
		<Footer />
	</div>
</div>
