import type { PageServerLoad } from './$types';
import { client } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';

// export const config = {
// 	isr: {
// 	  expiration: 10,
// 	},
//   };

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session?.userId) throw redirect(302, '/login');

	if (locals.session.user?.publicMetadata?.validator) {
		const nextEvent = await client.product.findFirst({
			where: {
				date: {
					gt: new Date()
				}
			},
			orderBy: {
				date: 'asc'
			}
		});

		if (nextEvent) {
			throw redirect(302, `/eventos/${nextEvent.id}`);
		} else {
			throw redirect(302, '/no-event');
		}
	} else {
		// Sum revenue and tickets per event in the database instead of loading
		// every payment row just to add them up here.
		const [events, totals] = await Promise.all([
			client.product.findMany({
				orderBy: {
					date: 'desc'
				}
			}),
			client.payment.groupBy({
				by: ['productId'],
				where: {
					payment_status: 'success',
					refund: false,
					changeEvent: false
				},
				_sum: {
					price: true,
					ticketAmount: true
				}
			})
		]);

		const totalsByProduct = new Map(totals.map((t) => [t.productId, t._sum]));
		const productsWithTotal = events.map((product) => {
			const sum = totalsByProduct.get(product.id);
			return {
				...product,
				totalPayment: sum?.price ?? 0,
				totalTicketsSold: sum?.ticketAmount ?? 0
			};
		});

		return {
			events: productsWithTotal
		};
	}
};
