import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) throw redirect(302, '/login');
	return {
		user: {
			id: locals.session.user?.id,
			first_name: locals.session.user?.first_name,
			last_name: locals.session.user?.last_name,
			image_url: locals.session.user?.image_url,
			validator: locals.session.user?.public_metadata.validator,
			admin: locals.session.user?.public_metadata.admin,
		}
	};
};
