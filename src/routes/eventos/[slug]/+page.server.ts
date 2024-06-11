import type { PageServerLoad } from './$types';
import { client } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';
import { sanity } from '$lib/sanity';
import groq from 'groq';

// Get event from Sanity Studio
const getEvent = async (slugEvent: string) => {
	const query = groq`*[_type == "event" && _id == "${slugEvent}"][0] {
         ticket,
		 title,
		 description,
		 date,
		 poster,
		 venue,
		 boveda,
		 sell_type
      }`;
	const event = await sanity.fetch(query);
	return event;
};

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.session) throw redirect(302, '/login');

    // Get the available tickets on the Studio
	const eventFromSanityStudio = await getEvent(params.slug);

	let studioTicketsAvailable;

	if(eventFromSanityStudio.sell_type === 'ubication'){
			const ticketTypes = eventFromSanityStudio?.ticket.ubication;
			let total = 0;
			for (const key in ticketTypes) {
			  total += ticketTypes[key].amount;
			}
			studioTicketsAvailable = total;
	} else {
			const ticketTypes = eventFromSanityStudio?.ticket.batch ? eventFromSanityStudio?.ticket.batch : eventFromSanityStudio?.ticket;
			let total = 0;
			for (const key in ticketTypes) {
			  total += ticketTypes[key].amount;
			}
			studioTicketsAvailable = total;
	}
    //   Get the total amount of tickets available
    //   const studioTicketsAvailable = sumTicketAmounts(eventFromSanityStudio);

	const eventFromSupabase = async () => {
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
					}
				}
			}
		});
	};
    // Get the total money made from the event
	const totalMoneyRaised = async () => {
		return await client.payment.aggregate({
			where: {
				productId: params.slug,
				payment_status: 'success'
			},
			_sum: {
				price: true
			}
		});
	};
    // Get the total tickets sold from the event
	const ticketsSold = async () => {
		return await client.payment.aggregate({
			where: {
				productId: params.slug,
				payment_status: 'success'
			},
			_sum: {
				ticketAmount: true
			}
		});
	};

	return {
		sell_type: eventFromSanityStudio.sell_type,
		eventFromSupabase: await eventFromSupabase(),
		totalMoneyRaised: await totalMoneyRaised(),
		ticketsSold: await ticketsSold(),
        studioTicketsAvailable,
		eventFromSanityStudio
	};
};
