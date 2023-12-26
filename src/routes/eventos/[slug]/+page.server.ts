import type { PageServerLoad } from './$types';
import { client } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, cookies, locals }) => {
    
    const session = await locals.auth.validate();
	if (!session) throw redirect(302, "/login");

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
