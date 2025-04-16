import { client } from '$lib/server/prisma';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({}) => {
	const eventFromSupabase = async () => {
		const orders = await client.order.findMany({
			include: {
				MerchPayment: {
					include: {
						Merch: true
					}
				}
			}
		});

		return { orders };
	};

	const orders = await eventFromSupabase();
	return orders;
};

export const actions: Actions = {
	default: async () => {}
};
