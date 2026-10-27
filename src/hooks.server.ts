import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { withClerkHandler, clerkClient } from 'svelte-clerk/server';
import { client } from '$lib/server/prisma';

// Every client-side navigation hits the server, so cache the Clerk user per
// instance briefly instead of calling Clerk + upserting on each request.
const USER_CACHE_TTL_MS = 5 * 60 * 1000;
const userCache = new Map<
	string,
	{ user: Awaited<ReturnType<typeof clerkClient.users.getUser>>; expiresAt: number }
>();

export const handleUser: Handle = async ({ event, resolve }) => {
	const auth = event.locals.auth();
	const userId = auth?.userId;

	let user = null;

	const cached = userId ? userCache.get(userId) : undefined;
	if (cached && cached.expiresAt > Date.now()) {
		user = cached.user;
	} else if (userId) {
		try {
			user = await clerkClient.users.getUser(userId);
			userCache.set(userId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });

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

export const handle: Handle = sequence(withClerkHandler(), handleUser);
