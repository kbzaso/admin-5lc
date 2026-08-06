import { createClient } from '@supabase/supabase-js';
import { PUBLIC_PROJECT_URL, PUBLIC_ANON_KEY } from '$env/static/public';
import { browser } from '$app/environment';

// createClient() schedules an internal fetch (auth session refresh) on init,
// which SvelteKit flags as an eager SSR fetch. We only use this client for
// realtime subscriptions inside onMount, so skip constructing it on the
// server entirely.
const supabaseClient = browser ? createClient(PUBLIC_PROJECT_URL, PUBLIC_ANON_KEY) : null;

export default supabaseClient;
