import { auth } from "$lib/server/lucia";
import { redirect } from "@sveltejs/kit";

import type { PageServerLoad, Actions } from "./$types";

import { z } from 'zod';
import { message, setError, superValidate } from 'sveltekit-superforms/server';
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const schema = z.object({
	username: z.string().email("El correo debe ser válido"),
	name: z.string().min(4, "El nombre debe tener al menos 4 caracteres"),
	password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
	question: z.string()
  });

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals?.auth?.validate();
	if (session) throw redirect(302, "/eventos");
	
	const form = await superValidate(session, schema);

	return {
		form
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		
		const form = await superValidate(formData, schema);

		const username = formData.get("username");
		const name = formData.get("name");
		const password = formData.get("password");
		const question = formData.get("question");

		// if (question !== 'luchita_libreta') {
		// 	return setError(form, 'question', 'La respuesta no es correcta')
		// }
		
		try {
			const user = await auth.createUser({
				key: {
					providerId: "username", // auth method
					providerUserId: username?.toLowerCase(), // unique id when using "username" auth method
					password // hashed by Lucia
				},
				attributes: {
					username,
                    name
				}
			});
			const session = await auth.createSession({
				userId: user.userId,
				attributes: {}
			});
			locals?.auth?.setSession(session); // set session cookie
		} catch (e) {
			// this part depends on the database you're using
			// check for unique constraint error in user table
			console.log(e)
			if (
				e instanceof PrismaClientKnownRequestError 
			) {
				return message(form, 'Error: El correo ya esta en uso')
			}
			return message(form, 'Error: No se ha creado el usuario');
		}
		// redirect to
		// make sure you don't throw inside a try/catch block!
		throw redirect(302, "/eventos");
	}
};