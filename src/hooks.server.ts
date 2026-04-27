import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { withClerkHandler, clerkClient } from 'svelte-clerk/server';
import { client } from '$lib/server/prisma';

export const handleUser: Handle = async ({ event, resolve }) => {
	const auth = event.locals.auth();
	const userId = auth?.userId;

	let user = null;

	if (userId) {
		try {
			user = await clerkClient.users.getUser(userId);

			await client.users.upsert({
				where: { id: userId },
				create: {
					id: userId,
					name: user.firstName + ' ' + user.lastName
				},
				update: {
					name: user.firstName + ' ' + user.lastName
				}
			});
		} catch (error) {
			console.error('Error fetching/upserting user:', error);
		}
	}

	event.locals.session = {
		userId: userId ?? undefined,
		claims: auth?.sessionClaims,
		user
	};

	return await resolve(event);
};

export const handle: Handle = sequence(
	withClerkHandler(),
	handleUser
);
