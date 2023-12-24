import { auth } from "$lib/server/lucia";
import { LuciaError } from "lucia";
import { redirect } from "@sveltejs/kit";

import type { PageServerLoad, Actions } from "./$types";

import { z } from 'zod';
import { setError, superValidate } from 'sveltekit-superforms/server';

const schema = z.object({
  username: z.string().email(),
  password: z.string().min(8),
});


export const load: PageServerLoad = async ({ locals, cookies }) => {
	const session = await locals?.auth?.validate();
	if (session) throw redirect(302, "/eventos");
	
	const form = await superValidate(session, schema);
	return { 
		form 
	}
};

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		const formData = await request.formData();
		
		const form = await superValidate(formData, schema);

		const username = formData.get("username");
		const password = formData.get("password");
		try {
			// find user by key
			// and validate password
			const key = await auth.useKey(
				"username",
				username?.toLowerCase(),
				password
			);
			const session = await auth.createSession({
				userId: key.userId,
				attributes: {}
			});

			locals?.auth?.setSession(session)
		} catch (e) {
			if (
				e instanceof LuciaError
			) {
				// user does not exist
				// or invalid password
				return setError(form, 'username', "Usuario o contraseña incorrectos");
				// return fail(400, {
				// 	message: "Incorrect username or password"
				// });
			}
		}
		// redirect to
		// make sure you don't throw inside a try/catch block!
		throw redirect(302, "/eventos");
	}
};