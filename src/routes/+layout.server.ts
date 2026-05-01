import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = locals.session?.user;

	return {
		user: {
			id: user?.id,
			first_name: user?.firstName,
			last_name: user?.lastName,
			image_url: user?.imageUrl,
			validator: user?.publicMetadata?.validator,
			admin: user?.publicMetadata?.admin
		}
	};
};
