import type { PageServerLoad } from './$types';
import { client } from '$lib/server/prisma';

export const load: PageServerLoad = async ({ params }) => {
	const product = async () => {
        return await client.product.findUnique({
            where: {
                id: params.slug
            },
            include: {
                Payment: {
                    where: {
                        payment_status: 'success'
                    },
                    orderBy: {
                        date: 'desc' // Use 'asc' for ascending order
                    },
                },
            }
        });
    }

    const total = async () => {
        return await client.payment.aggregate({
            where: {
                productId: params.slug,
                payment_status: 'success',
            },
            _sum: {
                price: true
            }
        });
    }

    const tickets = async () => {
        return await client.payment.aggregate({
            where: {
                productId: params.slug,
                payment_status: 'success',
            },
            _sum: {
                ticketAmount: true
            }
        });
    }

	return {
		product: product(),
        total: total(),
        ticketsSold: tickets(),
	};
};
