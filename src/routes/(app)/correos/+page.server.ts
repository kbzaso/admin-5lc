import { client } from '$lib/server/prisma';
import type { PageServerLoad } from './$types';

// Capped so this page stays fast as the table grows; revisit with real
// pagination if the log outgrows a single screenful of scanning.
const MAX_ROWS = 500;

export const load: PageServerLoad = async () => {
	const emailLogs = await client.emailLog.findMany({
		include: {
			Order: {
				select: { id: true, orderId: true, customerName: true, customerEmail: true }
			},
			Payment: {
				select: { id: true, client_id: true, customer_name: true, customer_email: true }
			}
		},
		orderBy: { createdAt: 'desc' },
		take: MAX_ROWS
	});

	return { emailLogs };
};
