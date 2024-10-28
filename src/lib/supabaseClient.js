import { createClient } from '@supabase/supabase-js'
import { PUBLIC_PROJECT_URL, PUBLIC_ANON_KEY } from '$env/static/public';

const SUPABASE_URL = PUBLIC_PROJECT_URL;
const SUPABASE_ANON_KEY = PUBLIC_ANON_KEY;

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export default supabaseClient
