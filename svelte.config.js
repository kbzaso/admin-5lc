import vercelAdapter from '@sveltejs/adapter-vercel';
import autoAdapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		//
		// Only use adapter-vercel when building on Vercel. Its file tracer (@vercel/nft)
		// globs any absolute-looking string that exists on disk; Clerk's "/users" API path
		// matches /Users on case-insensitive macOS, so local builds crawl the whole home
		// directory and never finish. adapter-auto skips the trace locally.
		adapter: process.env.VERCEL ? vercelAdapter({ runtime: 'nodejs24.x' }) : autoAdapter()
	}
};

export default config;
