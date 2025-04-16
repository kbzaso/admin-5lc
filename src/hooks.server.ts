import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { handleClerk } from 'clerk-sveltekit/server';
import { CLERK_SECRET_KEY } from '$env/static/private';
import { client } from '$lib/server/prisma';

export const handleUser: Handle = async ({ event, resolve }) => {
	const { locals } = event;
	const userId = locals?.session?.userId;
	const claims = locals?.session?.claims;

	let user = null;

	if (userId) {
		const userResource = fetch(`https://api.clerk.dev/v1/users/${userId}`, {
			headers: {
				Authorization: `Bearer ${CLERK_SECRET_KEY}`
			}
		});
		user = await (await userResource).json();

		try {
			await client.users.upsert({
				where: { id: userId },
				create: {
					id: userId,
					name: user.first_name + ' ' + user.last_name
				},
				update: {
					name: user.first_name + ' ' + user.last_name
				}
			});
		} catch (error) {
			console.error('Error adding user:', error);
		}
	}

	event.locals.session = {
		userId,
		claims,
		user
	};

	return await resolve(event);
};

export const handle: Handle = sequence(
	handleClerk(CLERK_SECRET_KEY, {
		debug: true,
		protectedPaths: ['/eventos', '/merch'],
		signInUrl: '/login'
	}),
	handleUser
);
