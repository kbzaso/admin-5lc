import type { PageServerLoad } from './$types';
import { client } from '$lib/server/prisma';

export const load: PageServerLoad = async () => {
	const products = await client.product.findMany({
        include: {
            Payment: {
                where: {
                    payment_status: 'success'
                },
            }
        }
	});

    const total = await client.payment.aggregate({
        where: {
            payment_status: 'success'
        },
        _sum: {
            price: true
        }
    });

	// console.log(products);
	return {
		products,
        total,
	};
};
