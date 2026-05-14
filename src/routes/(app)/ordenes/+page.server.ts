import { client } from '$lib/server/prisma';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const orders = await client.order.findMany({
		include: {
			Payment: {
				include: {
					Product: true
				}
			},
			MerchPayment: {
				include: {
					Merch: true
				}
			}
		},
		orderBy: {
			createdAt: 'desc'
		}
	});

	return { orders };
};
