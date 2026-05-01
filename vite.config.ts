import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: [
			'lucide-svelte',
			'mode-watcher',
			'svelte-sonner',
			'svelte-render',
			'svelte-subscribe',
			'svelte-clerk',
			'svelte-headless-table',
			'svelte-legos',
			'sveltekit-superforms',
			'bits-ui',
			'formsnap',
			'cmdk-sv',
			'vaul-svelte',
			'@clerk/clerk-js'
		]
	}
});
