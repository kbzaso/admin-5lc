import type { PageServerLoad } from './$types';
import { client } from '$lib/server/prisma';

export const load: PageServerLoad = async () => {
	const products =  await client.product.findMany({
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

	const productsWithTotal = products.map(product => {
        const totalPayment = product.Payment.reduce((sum, payment) => sum + payment.price, 0);
        const totalTicketsSold = product.Payment.reduce((sum, payment) => sum + payment.ticketAmount, 0);
        return { ...product, totalPayment, totalTicketsSold };
    });

	return {
		products: productsWithTotal,
	};
};
