import { auth } from "$lib/server/lucia";
import { fail, redirect, type RequestHandler } from "@sveltejs/kit";

export async function POST({ locals }) {
    const session = await locals?.auth?.validate();
    if (!session) return new Response(null, { status: 401 });
    await auth?.invalidateSession(session?.sessionId); // invalidate session
    locals?.auth?.setSession(null); // remove cookie
    const options = {
        status: 200,
        headers: {
            'Content-Type': 'application/json', 
        } 
    }
    throw redirect(302, '/');
}