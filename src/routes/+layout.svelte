<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<div class="container mx-auto px-4 mb-4 min-h-screen flex flex-col">
	<Navbar />
	<slot />
	<div class="mt-auto pt-4 mb-4">
		<Footer />
	</div>
</div>
