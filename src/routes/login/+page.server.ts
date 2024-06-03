import { redirect } from "@sveltejs/kit";

import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	return { 

	}
};

export const actions: Actions = {
	default: async () => {
	}
};