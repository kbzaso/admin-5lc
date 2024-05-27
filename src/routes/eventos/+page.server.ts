import type { PageServerLoad } from './$types';
import { client } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth.validate();
	if (!session) throw redirect(302, "/login");

	const events =  await client.product.findMany({
            orderBy: {
                date: 'desc'
            },
			include: {
				Payment: {
					where: {
						payment_status: 'success'
					}
				},
			},
		});

	const productsWithTotal = events.map(product => {
        const totalPayment = product.Payment.reduce((sum, payment) => sum + payment.price, 0);
        const totalTicketsSold = product.Payment.reduce((sum, payment) => sum + payment.ticketAmount, 0);
        return { ...product, totalPayment, totalTicketsSold };
    });

	return {
		events: productsWithTotal,
		// user: session?.user
	};
};
