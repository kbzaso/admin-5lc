import type { Actions, PageServerLoad } from './$types';
import { client } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';
import { sanity } from '$lib/sanity';
import groq from 'groq';

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const datasetName = import.meta.env.VITE_SANITY_DATASET;

import { VITE_SANITY_WRITE_ADMIN as tokenWithWriteAccess } from '$env/static/private';

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

	const eventFromSupabase = async () => {
		return await client.product.findUnique({
			where: {
				id: params.slug
			},
			include: {
				Payment: {
					// where: {
					// 	payment_status: 'success'
					// },
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

type TicketBatch = {
	amount: number;
	price: number;
};

type Ticket = {
	batch?: {
		firsts_tickets: TicketBatch;
		seconds_tickets: TicketBatch;
		thirds_tickets: TicketBatch;
	};
	ubication?: {
		general_tickets: TicketBatch;
		ringside_tickets: TicketBatch;
	};
};

export const actions: Actions = {
	addPayment: async ({ request, params }) => {
		const formData = await request.formData();
		const name = (formData.get('name') as string) || '';
		const email = formData.get('email');
		const phone = formData.get('phone');
		const rut = formData.get('rut');
		const ticketAmount = Number(formData.get('ticketAmount'));
		const price = Number(formData.get('price')) || 0;
		const ticketType = formData.get('ticketType') as 'general_tickets' | 'ringside_tickets';

		console.log(ticketType, 'ticketType')

		// decrement ticket amount from batch events
		function decrementTicketAmount(
			ticket: Ticket,
			ticketAmount: number,
			sellType: 'batch' | 'ubication',
			ticketType?: 'general_tickets' | 'ringside_tickets'
		): Ticket {
			let ticketTypes: TicketBatch[] = [];

			if (sellType === 'batch' && ticket.batch) {
				ticketTypes = [
					ticket.batch.firsts_tickets,
					ticket.batch.seconds_tickets,
					ticket.batch.thirds_tickets
				];
			}  else if (sellType === 'ubication' && ticket.ubication) {
				if (ticketType && ticket.ubication[ticketType]) {
				  ticketTypes = [ticket.ubication[ticketType]];
				} else {
				  throw new Error(`Invalid ticket type: ${ticketType}`);
				}
			  }
			for (const type of ticketTypes) {
				if (ticketAmount <= 0) break;

				if (type.amount > 0) {
					const decrement = Math.min(type.amount, ticketAmount);
					type.amount -= decrement;
					ticketAmount -= decrement;
				}
			}

			return ticket;
		}

		try {
			// Get the available tickets on the Studio
			const eventFromSanityStudio = await getEvent(params.slug);

			// MUTATION PARA ACTUALIZAR EL STOCK DEL STUDIO
			let mutations;
			let newTicket;
			if (eventFromSanityStudio.sell_type === 'ubication') {
				newTicket = decrementTicketAmount(
					eventFromSanityStudio.ticket,
					ticketAmount,
					eventFromSanityStudio.sell_type,
					ticketType
				).ubication
				mutations = [
					{
						patch: {
							id: params.slug, // replace with your document ID
							set: {
								ticket: {
									ubication: newTicket
								}
							}
						}
					}
				];
			} else {
				newTicket = decrementTicketAmount(
					eventFromSanityStudio.ticket,
					ticketAmount,
					eventFromSanityStudio.sell_type
				).batch
				mutations = [
					{
						patch: {
							id: params.slug, // replace with your document ID
							set: {
								ticket: {
									batch: newTicket
								}
							}
						}
					}
				];
			}

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
					ticketsType: ticketType || 'Tandas',
					buys: newTicket,
					Product: {
						connect: {
							id: params.slug // Assuming params.slug is the productId
						}
					}
				}
			});

			// Actualizamos el stock en sanity
			await fetch(`https://${projectId}.api.sanity.io/v2022-08-08/data/mutate/${datasetName}`, {
				method: 'POST',
				headers: {
					'Content-type': 'application/json',
					Authorization: `Bearer ${tokenWithWriteAccess}`,
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'POST',
					'Access-Control-Allow-Headers': 'Content-Type'
				},
				body: JSON.stringify({ mutations })
			})
				.then((response) => {
					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}
					return response.json();
				})
				.then((result) => console.log(result))
				.catch((error) => console.error(error));

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
