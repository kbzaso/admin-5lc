import type { Actions, PageServerLoad } from './$types';
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
		 sell_type,
		 "discounts": discounts[] -> {
			code,
			active,
			percentage,
 		 },
      }`;
	const event = await sanity.fetch(query);
	return event;
};

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.session) throw redirect(302, '/login');

	// Get the available tickets on the Studio
	const eventFromSanityStudio = await getEvent(params.slug);

	let studioTicketsAvailable;

	if (eventFromSanityStudio.sell_type === 'ubication') {
		const ticketTypes = eventFromSanityStudio?.ticket.ubication;
		let total = 0;
		for (const key in ticketTypes) {
			total += ticketTypes[key].amount;
		}
		studioTicketsAvailable = total;
	} else {
		const ticketTypes = eventFromSanityStudio?.ticket.batch
			? eventFromSanityStudio?.ticket.batch
			: eventFromSanityStudio?.ticket;
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

export const actions: Actions = {
    addPayment: async ({ request, params }) => {

		const formData = await request.formData()
		const name = formData.get('name') as string || ''
		const email = formData.get('email')
		const phone = formData.get('phone')
		const rut = formData.get('rut')
		const ticketAmount = Number(formData.get('ticketAmount'))
		const price = Number(formData.get('price')) || 0;

        try {

            // Create a new payment record
            const newPayment = await client.payment.create({
				data: {
					id: crypto.randomUUID(),
					customer_name: name,
					rut,
					customer_email: email as string,
					customer_phone: phone as string,
					price,
					payment_status: 'success',
					ticketAmount,
					ticketsType: 'Tandas',
					buys: {
					},
					Product: {
						connect: {
							id: params.slug // Assuming params.slug is the productId
						}
					}
				}
            });

            // Return a success response
            return {
                status: 201,
                body: { message: 'Payment added successfully', payment: newPayment }
            };
        } catch (error) {
            console.error('Error adding payment:', error);
            return {
                status: 500,
                body: { error: 'Failed to add payment' }
            };
        }
    }
};