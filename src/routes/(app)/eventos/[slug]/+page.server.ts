import type { Actions, PageServerLoad } from './$types';
import { client } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';
import { sanity } from '$lib/sanity';
import { sendOrderConfirmationEmail, sendTicketConfirmationEmail } from '$lib/server/mailApi';
import groq from 'groq';

// Fallback venue info, mirrors 5lc-sveltkit-sanity's $lib/const VENUE — used
// when a Sanity event doesn't carry its own venue override.
const VENUE = {
	NAME: 'Bóveda Secreta',
	ADDRESS: 'San Antonio 705, Santiago. Región Metropolitana'
};

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const datasetName = import.meta.env.VITE_SANITY_DATASET;

import { SANITY_WRITE_ADMIN as tokenWithWriteAccess } from '$env/static/private';

// Get event from Sanity Studio
const getEvent = async (slugEvent: string) => {
	const query = groq`*[_type == "event" && _id == "${slugEvent}"][0] {
         ticket,
		 title,
		 description,
		 date,
		 poster,
		 venue,
		 buys,
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

// Function to sum amounts in Payment.buys
interface Buy {
	amount: number;
}
// Function to create an object with the sum of every buys object inside Payment
interface Payment {
	payment_status: string;
	buys: Record<string, Buy>;
	ticketAmount: number;
	ticketsType?: string | null;
	refund?: boolean;
	changeEvent?: boolean;
}

interface BuysSum {
	[key: string]: Buy;
}

// Refund / change are tracked as boolean flags. Fall back to legacy
// payment_status values for rows written before that split.
const isRefund = (p: Payment) => p.refund === true || p.payment_status === 'refund';
const isChange = (p: Payment) => p.changeEvent === true || p.payment_status === 'change';
const isCountable = (p: Payment) =>
	p?.payment_status === 'success' ||
	p?.payment_status === 'system' ||
	isRefund(p) ||
	isChange(p);

const createBuysSumObject = (payments: Payment[]): BuysSum => {
	const buysSum: BuysSum = {};
	let systemPaymentsSum = 0;
	let refundPaymentsSum = 0;
	let changePaymentsSum = 0;

	payments.filter(isCountable).forEach((payment) => {
		// Refund / change rows still need to be tallied for their own rows,
		// but they don't contribute to the per-tier "attending" totals.
		const refunded = isRefund(payment);
		const changed = isChange(payment);

		if (refunded) refundPaymentsSum += payment.ticketAmount;
		if (changed) changePaymentsSum += payment.ticketAmount;
		if (refunded || changed) return;

		const orderedKeys = [
			'firsts_tickets',
			'seconds_tickets',
			'thirds_tickets',
			'system_payments'
		];
		const sortedEntries = Object.entries(payment.buys).sort(
			([a], [b]) => orderedKeys.indexOf(a) - orderedKeys.indexOf(b)
		);

		for (const [key, value] of sortedEntries) {
			if (!buysSum[key]) {
				buysSum[key] = { amount: 0 };
			}
			buysSum[key].amount += value.amount;
		}

		if (payment.payment_status === 'system') systemPaymentsSum += payment.ticketAmount;
	});

	buysSum['system_payments'] = { amount: systemPaymentsSum };
	buysSum['refund_payments'] = { amount: refundPaymentsSum };
	buysSum['change_payments'] = { amount: changePaymentsSum };

	return buysSum;
};

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.session?.userId) throw redirect(302, '/login');

	// Get the available tickets on the Studio
	const eventFromSanityStudio = await getEvent(params.slug);

	let studioTicketsAvailable;

	if (eventFromSanityStudio?.sell_type === 'ubication') {
		const ticketTypes = eventFromSanityStudio?.ticket.ubication;
		let total = 0;
		for (const key in ticketTypes) {
			total += ticketTypes[key].amount;
		}
		studioTicketsAvailable = total;
	} else {
		const ticketTypes = eventFromSanityStudio?.ticket?.batch
			? eventFromSanityStudio?.ticket?.batch
			: eventFromSanityStudio?.ticket;
		let total = 0;
		for (const key in ticketTypes) {
			total += ticketTypes[key].amount;
		}
		studioTicketsAvailable = total;
	}

	const eventFromSupabase = async () => {
		const product = await client.product.findUnique({
			where: {
				id: params.slug
			},
			include: {
				Payment: {
					orderBy: {
						date: 'desc' // Use 'asc' for ascending order
					},
					include: {
						Comment: {
							select: {
								id: true,
								commentText: true,
								createdAt: true,
								userId: true,
								User: {
									select: {
										id: true,
										name: true
									}
								}
							}
						},
						EmailLog: {
							orderBy: { createdAt: 'desc' }
						},
						// When this payment is a line item of a cart order (tickets + merch),
						// its confirmation email was logged against the Order, not this
						// Payment — surface that history here too so the payment drawer
						// isn't empty for order-flow tickets.
						Order: {
							select: {
								id: true,
								orderId: true,
								EmailLog: { orderBy: { createdAt: 'desc' } }
							}
						}
					}
				}
			}
		});

		// Create the buys sum object
		const buysSumObject = createBuysSumObject((product?.Payment ?? []) as unknown as Payment[]);

		// Sum tickets by ticketsType for ubication events ('General', 'Ringside', etc.)
		// plus separate rows for Sistema, Reembolso and Cambio. Refund / change
		// rows are tallied separately and excluded from the per-type "attending"
		// totals.
		const ubicationSumObject: Record<string, { amount: number }> = {};
		let ubicationSystemSum = 0;
		let ubicationRefundSum = 0;
		let ubicationChangeSum = 0;
		for (const payment of (product?.Payment ?? []) as unknown as Payment[]) {
			if (!isCountable(payment)) continue;

			const refunded = isRefund(payment);
			const changed = isChange(payment);
			if (refunded) ubicationRefundSum += payment.ticketAmount;
			if (changed) ubicationChangeSum += payment.ticketAmount;
			if (refunded || changed) continue;

			const type = payment.ticketsType || 'Otros';
			if (!ubicationSumObject[type]) ubicationSumObject[type] = { amount: 0 };
			ubicationSumObject[type].amount += payment.ticketAmount;
			if (payment.payment_status === 'system') ubicationSystemSum += payment.ticketAmount;
		}
		ubicationSumObject['Sistema'] = { amount: ubicationSystemSum };
		ubicationSumObject['Reembolso'] = { amount: ubicationRefundSum };
		ubicationSumObject['Cambio'] = { amount: ubicationChangeSum };

		return { ...product, buysSumObject, ubicationSumObject };
	};

	// Refund / change tickets don't attend, so exclude them from all attendance
	// and revenue totals. Legacy rows where payment_status === 'refund'/'change'
	// have been backfilled to 'success' with the booleans set.
	const excludeRefundChange = { refund: false, changeEvent: false } as const;

	// Get the total money made from the event
	const totalMoneyRaised = async () => {
		return await client.payment.aggregate({
			where: {
				productId: params.slug,
				payment_status: 'success',
				...excludeRefundChange
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
				payment_status: {
					in: ['success', 'system']
				},
				...excludeRefundChange
			},
			_sum: {
				ticketAmount: true
			}
		});
	};

	const ticketValidated = async () => {
		return await client.payment.aggregate({
			where: {
				productId: params.slug,
				payment_status: 'success',
				...excludeRefundChange
			},
			_sum: {
				ticketValidated: true
			}
		});
	};

	// Future events a payment can be moved to when it's marked as
	// "Cambio de evento".
	const futureEvents = async () => {
		return await client.product.findMany({
			where: {
				date: { gt: new Date() },
				id: { not: params.slug }
			},
			orderBy: { date: 'asc' },
			select: { id: true, name: true, date: true }
		});
	};

	return {
		sell_type: eventFromSanityStudio?.sell_type,
		eventFromSupabase: await eventFromSupabase(),
		totalMoneyRaised: await totalMoneyRaised(),
		ticketsSold: await ticketsSold(),
		studioTicketsAvailable,
		eventFromSanityStudio,
		ticketValidated: await ticketValidated(),
		futureEvents: await futureEvents()
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
	resendTicketConfirmation: async ({ request, params }) => {
		const formData = await request.formData();
		const paymentId = formData.get('paymentId') as string;

		const payment = await client.payment.findUnique({
			where: { id: paymentId },
			include: { Product: true }
		});

		if (!payment) {
			return { status: 404, body: { error: 'Pago no encontrado' } };
		}

		// A payment that belongs to a cart order (tickets + merch) was confirmed
		// via the order-confirmation email, not a standalone ticket email —
		// resend that instead, or the buyer gets the wrong template and loses
		// their merch details.
		if (payment.orderId) {
			const order = await client.order.findUnique({
				where: { id: payment.orderId },
				include: {
					Payment: { include: { Product: true } },
					MerchPayment: { include: { Merch: true } }
				}
			});

			if (!order) {
				return { status: 404, body: { error: 'Orden no encontrada' } };
			}

			const result = await sendOrderConfirmationEmail({
				orderId: order.orderId ?? order.id,
				to: order.customerEmail,
				customerName: order.customerName,
				customerRut: order.customerRut,
				totalAmount: order.totalAmount,
				deliveryOption: order.deliveryOption,
				address: order.address,
				comuna: order.comuna,
				region: order.region,
				tickets: order.Payment.map((p) => ({
					productName: p.Product?.name ?? 'Evento',
					ticketsType: p.ticketsType,
					date: p.Product?.date ? new Date(p.Product.date).toISOString() : null,
					quantity: p.ticketAmount,
					unitPrice: p.price
				})),
				merch: order.MerchPayment.map((item) => ({
					name: item.Merch.name,
					variationLabel: item.variationLabel,
					quantity: item.quantity,
					unitPrice: item.price
				}))
			});

			if (!result.ok) console.error('Error resending order confirmation email:', result.error);

			const emailLog = {
				status: result.ok ? 'sent' : 'failed',
				error: result.ok ? null : result.error
			};
			try {
				await client.emailLog.create({
					data: {
						emailType: 'order_confirmation',
						orderId: order.id,
						status: emailLog.status,
						providerId: result.ok ? result.id : undefined,
						error: emailLog.error ?? undefined
					}
				});
			} catch (error) {
				console.error('Error recording EmailLog:', error);
			}

			if (!result.ok) {
				return {
					status: 502,
					body: { error: 'No se pudo reenviar el correo', detail: result.error, emailLog }
				};
			}
			return { status: 200, body: { message: 'Correo de confirmación reenviado', emailLog } };
		}

		const eventFromSanityStudio = await getEvent(params.slug);

		const result = await sendTicketConfirmationEmail({
			orderId: payment.client_id ?? payment.id,
			to: payment.customer_email,
			customerName: payment.customer_name,
			productName: payment.Product.name,
			eventDate: payment.Product?.date ? new Date(payment.Product.date).toISOString() : null,
			venueName: eventFromSanityStudio?.venue?.venueName || VENUE.NAME,
			venueAddress: eventFromSanityStudio?.venue?.venueAdress || VENUE.ADDRESS,
			ticketAmount: payment.ticketAmount,
			unitPrice: payment.price
		});

		if (!result.ok) console.error('Error resending ticket confirmation email:', result.error);

		const emailLog = { status: result.ok ? 'sent' : 'failed', error: result.ok ? null : result.error };
		try {
			await client.emailLog.create({
				data: {
					emailType: 'ticket_confirmation',
					paymentId: payment.id,
					status: emailLog.status,
					providerId: result.ok ? result.id : undefined,
					error: emailLog.error ?? undefined
				}
			});
		} catch (error) {
			console.error('Error recording EmailLog:', error);
		}

		if (!result.ok) {
			return {
				status: 502,
				body: { error: 'No se pudo reenviar el correo', detail: result.error, emailLog }
			};
		}
		return { status: 200, body: { message: 'Correo de confirmación reenviado', emailLog } };
	},
	addComment: async ({ request, locals }) => {
		const formData = await request.formData();
		const paymentId = formData.get('paymentId');
		const comment = formData.get('comment');
		const userId = locals.session?.userId;

		try {
			const newComment = await client.comment.create({
				data: {
					id: crypto.randomUUID(),
					paymentId: paymentId as string,
					commentText: comment as string,
					userId: userId as string
				}
			});
			return {
				status: 201,
				body: { message: 'Comment added successfully', comment: newComment }
			};
		} catch (error) {
			console.error('Error adding comment:', error);
			return {
				status: 500,
				body: { error: 'Failed to add comment' }
			};
		}
	},
	deleteComment: async ({ request, locals }) => {
		const formData = await request.formData();
		const commentId = formData.get('commentId');
		const userId = locals.session?.userId;

		try {
			// Only delete when the comment belongs to the requesting user. deleteMany
			// scopes the delete by userId so a forged request can't remove someone
			// else's comment; count === 0 means it wasn't theirs (or didn't exist).
			const { count } = await client.comment.deleteMany({
				where: {
					id: commentId as string,
					userId: userId as string
				}
			});

			if (count === 0) {
				return {
					status: 403,
					body: { error: 'You can only delete your own comments' }
				};
			}

			return {
				status: 200,
				body: { message: 'Comment deleted successfully' }
			};
		} catch (error) {
			console.error('Error deleting comment:', error);
			return {
				status: 500,
				body: { error: 'Failed to delete comment' }
			};
		}
	},
	validateTickets: async ({ request }) => {
		const formData = await request.formData();
		const paymentId = formData.get('paymentId');
		const ticketValidated = Number(formData.get('ticketValidated'));

		try {
			const updatePayment = await client.payment.update({
				where: {
					id: paymentId as string
				},
				data: {
					ticketValidated
				}
			});
			return {
				status: 200,
				body: { message: 'Payment updated successfully', payment: updatePayment }
			};
		} catch (error) {
			console.error('Error updating payment:', error);
			return {
				status: 500,
				body: { error: 'Failed to update payment' }
			};
		}
	},
	deletePayment: async ({ request }) => {
		const formData = await request.formData();
		const paymentId = formData.get('paymentId');

		try {
			// Delete all comments associated with the payment
			await client.comment.deleteMany({
				where: {
					paymentId: paymentId as string
				}
			});

			// Delete the payment
			const payment = await client.payment.delete({
				where: {
					id: paymentId as string
				}
			});
			return {
				status: 200,
				body: { message: 'Payment and associated comments deleted successfully', payment }
			};
		} catch (error) {
			console.error('Error deleting payment and associated comments:', error);
			return {
				status: 500,
				body: { error: 'Failed to delete payment and associated comments' }
			};
		}
	},
	updatePayment: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const name = (formData.get('name') as string) || '';
		const email = formData.get('email');
		const phone = formData.get('phone');
		const rut = formData.get('rut');
		const ticketAmount = Number(formData.get('ticketAmount'));
		const price = Number(formData.get('price')) || 0;
		const ticketType = formData.get('ticketType') as 'general_tickets' | 'ringside_tickets';
		const paymentId = formData.get('paymentId');
		const refundStatus = formData.get('refundStatus');
		const targetEventId = (formData.get('targetEventId') as string) || '';

		// Single mutually-exclusive choice: 'none' | 'refund' | 'change'.
		const refundMoney = refundStatus === 'refund';
		const changeEvent = refundStatus === 'change';

		// Moving the payment to another event only applies when it's marked as
		// "Cambio de evento" and a different event was selected.
		const moveToEvent = changeEvent && targetEventId !== '' && targetEventId !== params.slug;

		const paymentData = {
			customer_name: name,
			rut: rut as string | null,
			customer_email: email as string,
			customer_phone: phone as string,
			price,
			ticketAmount,
			ticketsType: ticketType || 'Tandas',
			refund: refundMoney,
			changeEvent: changeEvent
		};

		try {
			let updatePayment;

			if (moveToEvent) {
				const [origin, target] = await Promise.all([
					client.product.findUnique({
						where: { id: params.slug },
						select: { name: true, date: true }
					}),
					client.product.findUnique({
						where: { id: targetEventId },
						select: { id: true }
					})
				]);

				if (!target) {
					return {
						status: 400,
						body: { error: 'Target event not found' }
					};
				}

				const originDate = origin?.date
					? new Intl.DateTimeFormat('es-CL', {
							year: 'numeric',
							month: 'short',
							day: 'numeric'
						}).format(origin.date)
					: '';
				const commentText = `Cambio de evento: este pago proviene de «${origin?.name ?? params.slug}»${originDate ? ` (${originDate})` : ''}.`;

				// Move the payment and leave an audit comment in one transaction so
				// a moved payment always carries its origin.
				[updatePayment] = await client.$transaction([
					client.payment.update({
						where: {
							id: paymentId as string
						},
						data: {
							...paymentData,
							productId: targetEventId
						}
					}),
					client.comment.create({
						data: {
							id: crypto.randomUUID(),
							paymentId: paymentId as string,
							commentText,
							userId: locals.session?.userId as string
						}
					})
				]);
			} else {
				updatePayment = await client.payment.update({
					where: {
						id: paymentId as string
					},
					data: paymentData
				});
			}

			return {
				status: 200,
				body: { message: 'Payment updated successfully', payment: updatePayment }
			};
		} catch (error) {
			console.error('Error updating payment:', error);
			return {
				status: 500,
				body: { error: 'Failed to update payment' }
			};
		}
	},
	addPayment: async ({ request, params }) => {
		const formData = await request.formData();
		const name = (formData.get('name') as string) || '';
		const email = formData.get('email');
		const phone = formData.get('phone');
		const rut = formData.get('rut');
		const ticketAmount = Number(formData.get('ticketAmount'));
		const price = Number(formData.get('price')) || 0;
		const ticketType = formData.get('ticketType') as 'general_tickets' | 'ringside_tickets';
		// Unchecked checkboxes are absent from FormData, so null means "don't
		// touch the Studio stock".
		const discountStock = formData.get('discountStock') !== null;

		const traductions: { [key: string]: string } = {
			ringside_tickets: 'Ringside',
			general_tickets: 'General'
		};

		async function generatePaymentCode(eventName: string, eventId: string): Promise<string> {
			const sanitizedEventName = eventName.replace(/\s+/g, '-').substring(0, 10);
			// Fetch the current count of payments for the event
			const paymentCount = await client.payment.count({
				where: {
					productId: eventId
				}
			});

			// Generate the code using the event name and a zero-padded sequential number
			const sequentialNumber = (paymentCount + 1).toString().padStart(3, '0');
			const paymentCode = `${sanitizedEventName}-${sequentialNumber}`;

			return paymentCode;
		}

		// decrement ticket amount from batch events
		function decrementTicketAmount(
			ticket: Ticket,
			ticketAmount: number,
			sellType: 'batch' | 'ubication',
			ticketType?: 'general_tickets' | 'ringside_tickets'
		): Ticket {
			let ticketTypes: TicketBatch[] = [];
			console.log(ticket?.batch);

			if (sellType === 'batch' && ticket?.batch) {
				ticketTypes = [
					ticket?.batch?.firsts_tickets,
					ticket?.batch?.seconds_tickets,
					ticket?.batch?.thirds_tickets
				];
			} else if (sellType === 'ubication' && ticket?.ubication) {
				if (ticketType && ticket?.ubication[ticketType]) {
					ticketTypes = [ticket?.ubication[ticketType]];
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
			// Postgres fallback for name/date — the confirmation email (and the
			// payment-code generator below) shouldn't hard-fail just because this
			// event doc isn't in the currently configured Sanity dataset.
			const productFromDb = await client.product.findUnique({
				where: { id: params.slug },
				select: { name: true, date: true }
			});
			const eventTitle = eventFromSanityStudio?.title ?? productFromDb?.name ?? 'Evento';

			// MUTATION PARA ACTUALIZAR EL STOCK DEL STUDIO. Solo se construye si
			// el usuario pidió descontar las entradas del stock.
			let mutations;
			let newTicket;
			if (discountStock) {
				if (eventFromSanityStudio?.sell_type === 'ubication') {
					newTicket = decrementTicketAmount(
						eventFromSanityStudio?.ticket,
						ticketAmount,
						eventFromSanityStudio?.sell_type,
						ticketType
					).ubication;
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
						eventFromSanityStudio?.ticket,
						ticketAmount,
						eventFromSanityStudio?.sell_type
					).batch;
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
			}

			// Generate a payment code
			const paymentCode = await generatePaymentCode(eventTitle, params.slug);

			// Create a new payment record
			const newPayment = await client.payment.create({
				data: {
					id: crypto.randomUUID(),
					customer_name: name,
					rut: rut as string | null,
					customer_email: email as string,
					customer_phone: phone as string,
					price,
					payment_status: 'system',
					ticketAmount,
					client_id: paymentCode,
					ticketsType: traductions[ticketType] || 'Tandas',
					buys: {},
					Product: {
						connect: {
							id: params.slug // Assuming params.slug is the productId
						}
					}
				}
			});

			// Send the same confirmation email a buyer gets automatically — this is
			// a real registered attendance (e.g. paid in person), not a draft, so
			// it shouldn't go unconfirmed just because staff entered it manually.
			let createdEmailLog: Awaited<ReturnType<typeof client.emailLog.create>> | null = null;
			try {
				const emailResult = await sendTicketConfirmationEmail({
					orderId: newPayment.client_id ?? newPayment.id,
					to: newPayment.customer_email,
					customerName: newPayment.customer_name,
					productName: eventTitle,
					eventDate: productFromDb?.date ? new Date(productFromDb.date).toISOString() : null,
					venueName: eventFromSanityStudio?.venue?.venueName || VENUE.NAME,
					venueAddress: eventFromSanityStudio?.venue?.venueAdress || VENUE.ADDRESS,
					ticketAmount: newPayment.ticketAmount,
					unitPrice: newPayment.price
				});

				if (!emailResult.ok) {
					console.error('Error sending confirmation email for new payment:', emailResult.error);
				}

				createdEmailLog = await client.emailLog.create({
					data: {
						emailType: 'ticket_confirmation',
						paymentId: newPayment.id,
						status: emailResult.ok ? 'sent' : 'failed',
						providerId: emailResult.ok ? emailResult.id : undefined,
						error: emailResult.ok ? undefined : emailResult.error
					}
				});
			} catch (error) {
				console.error('Error sending confirmation email / recording EmailLog:', error);
			}

			// Actualizamos el stock en sanity (solo si se pidió descontar)
			if (discountStock && mutations) {
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
			}

			// Return a success response. Shape `payment.EmailLog` the same way
			// `load()` would (array, most recent first) so a client-side optimistic
			// update — e.g. pushing this straight into the payments list — has
			// everything SheetToUpdatePayments.svelte expects, without needing a
			// full page reload to see the email status.
			return {
				status: 201,
				body: {
					message: 'Payment added successfully',
					payment: { ...newPayment, EmailLog: createdEmailLog ? [createdEmailLog] : [] },
					emailLog: createdEmailLog
						? { status: createdEmailLog.status, error: createdEmailLog.error }
						: null
				}
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
