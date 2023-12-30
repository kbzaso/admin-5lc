import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";
import { th } from "date-fns/locale";

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals?.auth?.validate();
	if (!session) {
		throw redirect(302, "/login")
	} else {
		throw redirect(302, "/eventos")
	}
	// return {
	// 	userId: session.user.userId,
	// 	username: session.user.username
	// };
};