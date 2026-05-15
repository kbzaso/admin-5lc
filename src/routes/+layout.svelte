<script lang="ts">
	import '../app.css';
	import Footer from '$lib/components/Footer.svelte';
	import { Toaster } from "$lib/components/ui/sonner";
	import Navbar from '$lib/components/Navbar.svelte';
	import AuthSync from '$lib/components/AuthSync.svelte';
	import NavigationProgress from '$lib/components/NavigationProgress.svelte';
	import { ClerkProvider } from 'svelte-clerk';
	import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
	import { onNavigate } from '$app/navigation';

	onNavigate((navigation) => {
		if (typeof document === 'undefined' || !('startViewTransition' in document)) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<ClerkProvider publishableKey={PUBLIC_CLERK_PUBLISHABLE_KEY}>
	<AuthSync />
	<NavigationProgress />
	<div class="max-w-6xl px-4 mx-auto mb-4 flex flex-col min-h-screen">
		<Navbar />
		<Toaster position="top-right"/>
		<slot />
		<div class="mt-auto pt-4 mb-4">
			<Footer />
		</div>
	</div>
</ClerkProvider>
