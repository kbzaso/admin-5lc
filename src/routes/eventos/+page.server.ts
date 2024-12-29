import type { PageServerLoad } from './$types';
import { client } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) throw redirect(302, '/login');

	if (locals.session.user?.public_metadata.validator) {
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
		const events = await client.product.findMany({
			orderBy: {
				date: 'desc'
			},
			include: {
				Payment: {
					where: {
						payment_status: 'success'
					}
				}
			}
		});

		const productsWithTotal = await Promise.all(events.map(async (product) => {
			const totalPayment = product.Payment.reduce((sum, payment) => sum + payment.price, 0);
			const totalTicketsSold = product.Payment.reduce(
				(sum, payment) => sum + payment.ticketAmount,
				0
			);
			return { ...product, totalPayment, totalTicketsSold };
		}));

		return {
			events: productsWithTotal
		};
	}
};
