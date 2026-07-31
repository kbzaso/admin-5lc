import type { Actions, PageServerLoad } from './$types';
import { client } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';
import { sanity } from '$lib/sanity';
import {
	sendEventCancellationBatch,
	sendFeedbackRequestBatch,
	sendOrderConfirmationEmail,
	sendTicketConfirmationEmail,
	sendTicketTransferEmail
} from '$lib/server/mailApi';
import { DEFAULT_FEEDBACK_QUESTIONS, FEEDBACK_QUESTION_COUNT } from '$lib/feedbackQuestions';
// PUBLIC_-prefixed vars live in the public env module, not the private one.
import { env as publicEnv } from '$env/dynamic/public';
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
		 cancelled,
		 cancelledAt,
		 cancelledReason,
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

// Buyers who get the event-cancellation email: real attendees (paid or
// manually added) whose payment hasn't already been refunded or moved.
const cancellationRecipientsWhere = (productId: string) => ({
	productId,
	payment_status: { in: ['success', 'system'] },
	refund: false,
	changeEvent: false
});

// Who gets the post-event feedback email: people who actually walked in.
// ticketValidated is a counter of scanned tickets, so > 0 means at least one
// person on this payment attended — asking a no-show how the event was would
// just add noise to the averages.
const feedbackRecipientsWhere = (productId: string) => ({
	productId,
	payment_status: { in: ['success', 'system'] },
	refund: false,
	changeEvent: false,
	ticketValidated: { gt: 0 }
});

// Replacement options offered to buyers of a cancelled event. Sourced from
// Sanity (not the Product table) so events that haven't sold anything yet
// still show up, and restricted to the same método de venta as the cancelled
// event so its tickets map onto the target's tiers.
interface EligibleTargetEvent {
	id: string;
	name: string;
	date: string;
	sell_type: string | null;
}

const getEligibleTargetEvents = async (
	currentId: string,
	sellType: string | null
): Promise<EligibleTargetEvent[]> => {
	const query = groq`*[_type == "event" && _id != $currentId && cancelled != true && active == true && defined(date) && dateTime(date) > dateTime(now()) && sell_type == $sellType] | order(date asc) {
		"id": _id,
		"name": title,
		date,
		sell_type,
	}`;
	return await sanity.fetch(query, { currentId, sellType: sellType ?? null });
};

// Refund / change are tracked as boolean flags. Fall back to legacy
// payment_status values for rows written before that split.
const isRefund = (p: Payment) => p.refund === true || p.payment_status === 'refund';
const isChange = (p: Payment) => p.changeEvent === true || p.payment_status === 'change';
const isCountable = (p: Payment) =>
	p?.payment_status === 'success' || p?.payment_status === 'system' || isRefund(p) || isChange(p);

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

		const orderedKeys = ['firsts_tickets', 'seconds_tickets', 'thirds_tickets', 'system_payments'];
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

	// History for the "Historial de cambios" tab: every edit made while a
	// payment belonged to this event, plus transfers in/out of it — matched
	// by from/toProductId rather than the payment's current productId so
	// entries stay correct after later edits or a hard delete.
	const paymentChangeLog = async () => {
		return await client.paymentChangeLog.findMany({
			where: {
				OR: [{ fromProductId: params.slug }, { toProductId: params.slug }]
			},
			orderBy: { createdAt: 'desc' },
			include: {
				Payment: {
					select: { id: true, customer_name: true, customer_email: true, client_id: true }
				},
				Users: { select: { id: true, name: true } }
			}
		});
	};

	// Cancellation campaign (if any) for the "Cancelación" tab: eligible
	// replacement events, per-buyer email state and responses.
	const cancellationCampaign = async () => {
		return await client.cancellationCampaign.findUnique({
			where: { productId: params.slug },
			include: {
				CancellationResponse: {
					orderBy: { createdAt: 'asc' },
					include: {
						Payment: {
							select: {
								id: true,
								customer_name: true,
								customer_email: true,
								customer_phone: true,
								client_id: true,
								ticketAmount: true,
								price: true,
								// Every cancellation email (initial + reminders) sent to this
								// buyer, so the admin can see how many times and when they were
								// contacted.
								EmailLog: {
									where: {
										emailType: {
											in: ['event_cancellation', 'event_cancellation_reminder']
										}
									},
									orderBy: { createdAt: 'asc' },
									select: {
										id: true,
										emailType: true,
										status: true,
										createdAt: true
									}
								}
							}
						}
					}
				}
			}
		});
	};

	const cancellationRecipientCount = async () => {
		return await client.payment.count({ where: cancellationRecipientsWhere(params.slug) });
	};

	// Feedback campaign (if any) for the "Feedback" tab: per-recipient send
	// state plus the ratings themselves. Companion rows (isBuyer = false) have
	// no email of their own, so Payment is only used for attribution.
	const feedbackCampaign = async () => {
		return await client.feedbackCampaign.findUnique({
			where: { productId: params.slug },
			include: {
				FeedbackResponse: {
					orderBy: { createdAt: 'asc' },
					include: {
						Payment: {
							select: {
								id: true,
								customer_name: true,
								customer_email: true,
								client_id: true,
								ticketAmount: true
							}
						}
					}
				}
			}
		});
	};

	const feedbackRecipientCount = async () => {
		return await client.payment.count({ where: feedbackRecipientsWhere(params.slug) });
	};

	// The survey only makes sense once the event has actually happened.
	const eventDate = eventFromSanityStudio?.date ? new Date(eventFromSanityStudio.date) : null;
	const eventHasPassed = !!eventDate && eventDate.getTime() < Date.now();

	return {
		sell_type: eventFromSanityStudio?.sell_type,
		eventFromSupabase: await eventFromSupabase(),
		totalMoneyRaised: await totalMoneyRaised(),
		ticketsSold: await ticketsSold(),
		studioTicketsAvailable,
		eventFromSanityStudio,
		ticketValidated: await ticketValidated(),
		futureEvents: await futureEvents(),
		paymentChangeLog: await paymentChangeLog(),
		cancellationCampaign: await cancellationCampaign(),
		cancellationRecipientCount: await cancellationRecipientCount(),
		cancellationEligibleOptions: eventFromSanityStudio?.cancelled
			? await getEligibleTargetEvents(params.slug, eventFromSanityStudio?.sell_type ?? null)
			: [],
		feedbackCampaign: await feedbackCampaign(),
		feedbackRecipientCount: await feedbackRecipientCount(),
		feedbackDefaultQuestions: [...DEFAULT_FEEDBACK_QUESTIONS],
		eventHasPassed
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

		const emailLog = {
			status: result.ok ? 'sent' : 'failed',
			error: result.ok ? null : result.error
		};
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
			// Read-only lookups before the transaction: DATABASE_URL goes through
			// Supabase's pooled PgBouncer connection (transaction mode), which
			// doesn't support Prisma's interactive $transaction(async (tx) => ...)
			// — it needs one connection held across multiple round trips, and the
			// pooler can hand later statements a different connection, producing
			// "Transaction not found" (P2028). So this stays as a batched
			// $transaction([...]) of independent operations, same as before.
			const [before, target] = await Promise.all([
				client.payment.findUniqueOrThrow({
					where: { id: paymentId as string },
					include: { Product: { select: { name: true, date: true } } }
				}),
				moveToEvent
					? client.product.findUnique({
							where: { id: targetEventId },
							select: { id: true, name: true, date: true }
					  })
					: Promise.resolve(null)
			]);

			if (moveToEvent && !target) {
				return {
					status: 400,
					body: { error: 'Target event not found' }
				};
			}

			const changeLogData = {
				paymentId: paymentId as string,
				changeType: moveToEvent ? 'transfer' : 'edit',
				fromProductId: before.productId,
				fromProductName: before.Product?.name ?? null,
				toProductId: moveToEvent ? targetEventId : before.productId,
				toProductName: moveToEvent ? target?.name ?? null : before.Product?.name ?? null,
				before: {
					customer_name: before.customer_name,
					rut: before.rut,
					customer_email: before.customer_email,
					customer_phone: before.customer_phone,
					price: before.price,
					ticketAmount: before.ticketAmount,
					ticketsType: before.ticketsType,
					refund: before.refund,
					changeEvent: before.changeEvent,
					productId: before.productId
				},
				after: {
					...paymentData,
					productId: moveToEvent ? targetEventId : before.productId
				},
				userId: locals.session?.userId ?? null
			};

			const paymentUpdate = client.payment.update({
				where: { id: paymentId as string },
				data: {
					...paymentData,
					...(moveToEvent ? { productId: targetEventId } : {})
				}
			});
			const changeLogCreate = client.paymentChangeLog.create({ data: changeLogData });

			let updatedPayment;

			if (moveToEvent) {
				const originDate = before.Product?.date
					? new Intl.DateTimeFormat('es-CL', {
							year: 'numeric',
							month: 'short',
							day: 'numeric'
					  }).format(before.Product.date)
					: '';
				const commentText = `Cambio de evento: este pago proviene de «${
					before.Product?.name ?? params.slug
				}»${originDate ? ` (${originDate})` : ''}.`;

				[updatedPayment] = await client.$transaction([
					paymentUpdate,
					client.comment.create({
						data: {
							id: crypto.randomUUID(),
							paymentId: paymentId as string,
							commentText,
							userId: locals.session?.userId as string
						}
					}),
					changeLogCreate
				]);
			} else {
				[updatedPayment] = await client.$transaction([paymentUpdate, changeLogCreate]);
			}

			// Let the buyer know their ticket moved, with both the origin and
			// destination event — best-effort, mirroring the other confirmation
			// email flows: a failed send is logged but doesn't fail the request,
			// since the payment/log rows are already committed above.
			if (moveToEvent) {
				try {
					const targetEventFromSanity = await getEvent(targetEventId);
					const emailResult = await sendTicketTransferEmail({
						orderId: before.client_id ?? (paymentId as string),
						to: paymentData.customer_email,
						customerName: paymentData.customer_name,
						fromProductName: before.Product?.name ?? params.slug,
						fromEventDate: before.Product?.date ? before.Product.date.toISOString() : null,
						toProductName: target?.name ?? targetEventId,
						toEventDate: target?.date ? target.date.toISOString() : null,
						venueName: targetEventFromSanity?.venue?.venueName || VENUE.NAME,
						venueAddress: targetEventFromSanity?.venue?.venueAdress || VENUE.ADDRESS,
						ticketAmount: paymentData.ticketAmount,
						unitPrice: paymentData.price
					});

					if (!emailResult.ok) {
						console.error('Error sending ticket transfer email:', emailResult.error);
					}

					await client.emailLog.create({
						data: {
							emailType: 'ticket_transfer',
							paymentId: paymentId as string,
							status: emailResult.ok ? 'sent' : 'failed',
							providerId: emailResult.ok ? emailResult.id : undefined,
							error: emailResult.ok ? undefined : emailResult.error
						}
					});
				} catch (error) {
					console.error('Error sending ticket transfer email / recording EmailLog:', error);
				}
			}

			return {
				status: 200,
				body: { message: 'Payment updated successfully', payment: updatedPayment }
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
	},
	saveCancellationCampaign: async ({ request, params, locals }) => {
		if (!locals.session?.userId) throw redirect(302, '/login');

		const formData = await request.formData();
		const eligibleEventIds = formData.getAll('eligibleEventIds').map(String).filter(Boolean);

		if (eligibleEventIds.length === 0) {
			return {
				status: 400,
				body: { error: 'Selecciona al menos un evento elegible para el cambio' }
			};
		}

		try {
			const eventFromSanity = await getEvent(params.slug);
			if (!eventFromSanity?.cancelled) {
				return {
					status: 400,
					body: { error: 'El evento no está marcado como cancelado en el Studio' }
				};
			}

			// Every selected id must be a currently-valid option: future, not
			// cancelled, and with the same método de venta as this event.
			const options = await getEligibleTargetEvents(
				params.slug,
				eventFromSanity?.sell_type ?? null
			);
			const selected = eligibleEventIds.map((id) => options.find((o) => o.id === id));
			if (selected.some((o) => !o)) {
				return {
					status: 400,
					body: {
						error:
							'Alguno de los eventos seleccionados no es válido (debe ser futuro, no cancelado y con el mismo método de venta)'
					}
				};
			}

			// The options come straight from Sanity, so an event with cero ventas
			// may not have a Product row yet — create/refresh them here so the
			// buyer-side transfer always has a row to move the payment onto.
			await client.$transaction(
				(selected as EligibleTargetEvent[]).map((o) =>
					client.product.upsert({
						where: { id: o.id },
						update: { name: o.name, date: new Date(o.date) },
						create: { id: o.id, name: o.name, date: new Date(o.date) }
					})
				)
			);

			const campaign = await client.cancellationCampaign.upsert({
				where: { productId: params.slug },
				update: { eligibleEventIds },
				create: {
					productId: params.slug,
					eligibleEventIds,
					createdByUserId: locals.session.userId
				}
			});

			return {
				status: 200,
				body: { message: 'Eventos elegibles guardados', campaign }
			};
		} catch (error) {
			console.error('Error saving cancellation campaign:', error);
			return {
				status: 500,
				body: { error: 'No se pudo guardar la campaña de cancelación' }
			};
		}
	},
	sendCancellationEmails: async ({ params, locals }) => {
		if (!locals.session?.userId) throw redirect(302, '/login');

		const siteUrl = publicEnv.PUBLIC_SITE_URL;
		if (!siteUrl) {
			return {
				status: 500,
				body: { error: 'PUBLIC_SITE_URL no está configurado' }
			};
		}

		try {
			const campaign = await client.cancellationCampaign.findUnique({
				where: { productId: params.slug }
			});
			if (!campaign || campaign.eligibleEventIds.length === 0) {
				return {
					status: 400,
					body: { error: 'Guarda primero los eventos elegibles para el cambio' }
				};
			}

			const eventFromSanity = await getEvent(params.slug);
			if (!eventFromSanity?.cancelled) {
				return {
					status: 400,
					body: { error: 'El evento no está marcado como cancelado en el Studio' }
				};
			}

			// One response row (with its link token) per recipient. Retries and
			// re-sends skip rows that already exist thanks to the
			// @@unique([campaignId, paymentId]) constraint, so buyers keep their
			// original link and nobody is emailed twice.
			const recipients = await client.payment.findMany({
				where: cancellationRecipientsWhere(params.slug),
				select: { id: true }
			});
			if (recipients.length === 0) {
				return {
					status: 400,
					body: { error: 'No hay compradores para notificar' }
				};
			}

			await client.cancellationResponse.createMany({
				data: recipients.map((p) => ({
					campaignId: campaign.id,
					paymentId: p.id,
					token: crypto.randomUUID()
				})),
				skipDuplicates: true
			});

			const toSend = await client.cancellationResponse.findMany({
				where: { campaignId: campaign.id, emailStatus: { in: ['pending', 'failed'] } },
				include: {
					Payment: {
						select: {
							id: true,
							customer_email: true,
							customer_name: true,
							ticketAmount: true,
							price: true
						}
					}
				}
			});

			if (toSend.length === 0) {
				return {
					status: 200,
					body: { message: 'Todos los correos ya fueron enviados', sent: 0, failed: 0 }
				};
			}

			let sent = 0;
			let failed = 0;

			for (let i = 0; i < toSend.length; i += 100) {
				const chunk = toSend.slice(i, i + 100);
				const result = await sendEventCancellationBatch({
					cancelledEventName: eventFromSanity.title,
					cancelledEventDate: eventFromSanity.date ?? null,
					cancelledReason: eventFromSanity.cancelledReason ?? null,
					items: chunk.map((r) => ({
						to: r.Payment.customer_email,
						customerName: r.Payment.customer_name,
						ticketAmount: r.Payment.ticketAmount,
						totalPaid: r.Payment.price,
						actionUrl: `${siteUrl}/cancelacion/${r.token}`,
						paymentRef: r.paymentId
					}))
				});

				if (result.ok) {
					const idByPayment = new Map(result.results.map((r) => [r.paymentRef, r.id]));
					const sentIds = chunk.map((r) => r.paymentId).filter((id) => idByPayment.get(id));
					const failedIds = chunk.map((r) => r.paymentId).filter((id) => !idByPayment.get(id));

					await client.$transaction([
						client.cancellationResponse.updateMany({
							where: { campaignId: campaign.id, paymentId: { in: sentIds } },
							data: { emailStatus: 'sent' }
						}),
						client.cancellationResponse.updateMany({
							where: { campaignId: campaign.id, paymentId: { in: failedIds } },
							data: { emailStatus: 'failed' }
						}),
						client.emailLog.createMany({
							data: chunk.map((r) => ({
								emailType: 'event_cancellation',
								paymentId: r.paymentId,
								status: idByPayment.get(r.paymentId) ? 'sent' : 'failed',
								providerId: idByPayment.get(r.paymentId) ?? undefined,
								error: idByPayment.get(r.paymentId) ? undefined : 'batch item failed'
							}))
						})
					]);

					sent += sentIds.length;
					failed += failedIds.length;
				} else {
					await client.$transaction([
						client.cancellationResponse.updateMany({
							where: {
								campaignId: campaign.id,
								paymentId: { in: chunk.map((r) => r.paymentId) }
							},
							data: { emailStatus: 'failed' }
						}),
						client.emailLog.createMany({
							data: chunk.map((r) => ({
								emailType: 'event_cancellation',
								paymentId: r.paymentId,
								status: 'failed',
								error: result.error
							}))
						})
					]);
					failed += chunk.length;
				}
			}

			const remaining = await client.cancellationResponse.count({
				where: { campaignId: campaign.id, emailStatus: { in: ['pending', 'failed'] } }
			});
			if (remaining === 0) {
				await client.cancellationCampaign.update({
					where: { id: campaign.id },
					data: { status: 'sent', sentAt: campaign.sentAt ?? new Date() }
				});
			}

			return {
				status: 200,
				body: {
					message: failed
						? `Correos enviados: ${sent}. Fallidos: ${failed} (reintenta con "Enviar correos")`
						: `Correos enviados: ${sent}`,
					sent,
					failed
				}
			};
		} catch (error) {
			console.error('Error sending cancellation emails:', error);
			return {
				status: 500,
				body: { error: 'No se pudieron enviar los correos de cancelación' }
			};
		}
	},
	// Re-send the cancellation email to buyers who received it but still haven't
	// chosen refund or change. Reuses the same email/link (their original
	// token); logged separately as a reminder and does NOT touch emailStatus,
	// which tracks the first send. Intentionally repeatable — the admin can
	// remind again later.
	remindNonResponders: async ({ params, locals }) => {
		if (!locals.session?.userId) throw redirect(302, '/login');

		const siteUrl = publicEnv.PUBLIC_SITE_URL;
		if (!siteUrl) {
			return { status: 500, body: { error: 'PUBLIC_SITE_URL no está configurado' } };
		}

		try {
			const campaign = await client.cancellationCampaign.findUnique({
				where: { productId: params.slug }
			});
			if (!campaign) {
				return { status: 400, body: { error: 'Aún no se ha enviado la campaña de cancelación' } };
			}

			const eventFromSanity = await getEvent(params.slug);
			if (!eventFromSanity?.cancelled) {
				return {
					status: 400,
					body: { error: 'El evento no está marcado como cancelado en el Studio' }
				};
			}

			const toRemind = await client.cancellationResponse.findMany({
				where: { campaignId: campaign.id, choice: null, emailStatus: 'sent' },
				include: {
					Payment: {
						select: {
							id: true,
							customer_email: true,
							customer_name: true,
							ticketAmount: true,
							price: true
						}
					}
				}
			});

			if (toRemind.length === 0) {
				return {
					status: 200,
					body: { message: 'No hay compradores pendientes de responder', sent: 0, failed: 0 }
				};
			}

			let sent = 0;
			let failed = 0;

			for (let i = 0; i < toRemind.length; i += 100) {
				const chunk = toRemind.slice(i, i + 100);
				const result = await sendEventCancellationBatch({
					cancelledEventName: eventFromSanity.title,
					cancelledEventDate: eventFromSanity.date ?? null,
					cancelledReason: eventFromSanity.cancelledReason ?? null,
					items: chunk.map((r) => ({
						to: r.Payment.customer_email,
						customerName: r.Payment.customer_name,
						ticketAmount: r.Payment.ticketAmount,
						totalPaid: r.Payment.price,
						actionUrl: `${siteUrl}/cancelacion/${r.token}`,
						paymentRef: r.paymentId
					}))
				});

				if (result.ok) {
					const idByPayment = new Map(result.results.map((r) => [r.paymentRef, r.id]));
					await client.emailLog.createMany({
						data: chunk.map((r) => ({
							emailType: 'event_cancellation_reminder',
							paymentId: r.paymentId,
							status: idByPayment.get(r.paymentId) ? 'sent' : 'failed',
							providerId: idByPayment.get(r.paymentId) ?? undefined,
							error: idByPayment.get(r.paymentId) ? undefined : 'batch item failed'
						}))
					});
					sent += chunk.filter((r) => idByPayment.get(r.paymentId)).length;
					failed += chunk.filter((r) => !idByPayment.get(r.paymentId)).length;
				} else {
					await client.emailLog.createMany({
						data: chunk.map((r) => ({
							emailType: 'event_cancellation_reminder',
							paymentId: r.paymentId,
							status: 'failed',
							error: result.error
						}))
					});
					failed += chunk.length;
				}
			}

			return {
				status: 200,
				body: {
					message: failed
						? `Recordatorios enviados: ${sent}. Fallidos: ${failed}`
						: `Recordatorios enviados: ${sent}`,
					sent,
					failed
				}
			};
		} catch (error) {
			console.error('Error sending cancellation reminders:', error);
			return { status: 500, body: { error: 'No se pudieron enviar los recordatorios' } };
		}
	},
	// Create or reword the survey. Questions are editable until the campaign is
	// sent; after that they're frozen, because the answers already collected are
	// only meaningful against the wording their authors actually saw.
	saveFeedbackCampaign: async ({ request, params, locals }) => {
		if (!locals.session?.userId) throw redirect(302, '/login');

		const formData = await request.formData();
		const questions = Array.from({ length: FEEDBACK_QUESTION_COUNT }, (_, i) =>
			String(formData.get(`question${i + 1}`) ?? '').trim()
		);

		if (questions.some((q) => q.length === 0)) {
			return { status: 400, body: { error: 'Todas las preguntas deben tener texto' } };
		}
		if (questions.some((q) => q.length > 160)) {
			return { status: 400, body: { error: 'Cada pregunta debe tener máximo 160 caracteres' } };
		}

		try {
			const existing = await client.feedbackCampaign.findUnique({
				where: { productId: params.slug },
				select: { id: true, status: true }
			});
			if (existing?.status === 'sent') {
				return {
					status: 400,
					body: { error: 'La encuesta ya fue enviada; sus preguntas no se pueden cambiar' }
				};
			}

			const eventFromSanity = await getEvent(params.slug);
			// Product rows only exist once something sold; make sure there's one to
			// hang the campaign off (mirrors saveCancellationCampaign).
			if (eventFromSanity?.title) {
				await client.product.upsert({
					where: { id: params.slug },
					update: {},
					create: {
						id: params.slug,
						name: eventFromSanity.title,
						date: eventFromSanity.date ? new Date(eventFromSanity.date) : null
					}
				});
			}

			const campaign = await client.feedbackCampaign.upsert({
				where: { productId: params.slug },
				update: { questions },
				create: {
					productId: params.slug,
					questions,
					createdByUserId: locals.session.userId
				}
			});

			return { status: 200, body: { message: 'Preguntas guardadas', campaign } };
		} catch (error) {
			console.error('Error saving feedback campaign:', error);
			return { status: 500, body: { error: 'No se pudo guardar la encuesta' } };
		}
	},
	sendFeedbackEmails: async ({ params, locals }) => {
		if (!locals.session?.userId) throw redirect(302, '/login');

		const siteUrl = publicEnv.PUBLIC_SITE_URL;
		if (!siteUrl) {
			return { status: 500, body: { error: 'PUBLIC_SITE_URL no está configurado' } };
		}

		try {
			const campaign = await client.feedbackCampaign.findUnique({
				where: { productId: params.slug }
			});
			if (!campaign) {
				return { status: 400, body: { error: 'Guarda primero las preguntas de la encuesta' } };
			}

			const eventFromSanity = await getEvent(params.slug);
			const eventDate = eventFromSanity?.date ? new Date(eventFromSanity.date) : null;
			if (!eventDate || eventDate.getTime() > Date.now()) {
				return {
					status: 400,
					body: { error: 'La encuesta solo se puede enviar después de la fecha del evento' }
				};
			}

			// One response row (with its link token) per attendee-buyer. Re-sends
			// skip rows that already exist thanks to the
			// @@unique([campaignId, paymentId, recipientEmail]) constraint, so buyers
			// keep their original link and nobody is emailed twice.
			const recipients = await client.payment.findMany({
				where: feedbackRecipientsWhere(params.slug),
				select: { id: true, customer_email: true, ticketAmount: true }
			});
			if (recipients.length === 0) {
				return {
					status: 400,
					body: { error: 'No hay asistentes con entradas validadas para encuestar' }
				};
			}

			await client.feedbackResponse.createMany({
				data: recipients.map((p) => ({
					campaignId: campaign.id,
					paymentId: p.id,
					recipientEmail: p.customer_email,
					isBuyer: true,
					token: crypto.randomUUID(),
					// Only buyers who brought company need a link to forward.
					shareToken: p.ticketAmount > 1 ? crypto.randomUUID() : null
				})),
				skipDuplicates: true
			});

			const toSend = await client.feedbackResponse.findMany({
				where: {
					campaignId: campaign.id,
					isBuyer: true,
					emailStatus: { in: ['pending', 'failed'] }
				},
				include: {
					Payment: { select: { id: true, customer_name: true, ticketAmount: true } }
				}
			});

			if (toSend.length === 0) {
				return {
					status: 200,
					body: { message: 'Todos los correos ya fueron enviados', sent: 0, failed: 0 }
				};
			}

			let sent = 0;
			let failed = 0;

			for (let i = 0; i < toSend.length; i += 100) {
				const chunk = toSend.slice(i, i + 100);
				const result = await sendFeedbackRequestBatch({
					eventName: eventFromSanity.title,
					eventDate: eventFromSanity.date ?? null,
					items: chunk.map((r) => ({
						// recipientEmail is always set on buyer rows.
						to: r.recipientEmail as string,
						customerName: r.Payment.customer_name,
						actionUrl: `${siteUrl}/feedback/${r.token}`,
						shareUrl: r.shareToken ? `${siteUrl}/feedback/${r.shareToken}` : null,
						ticketAmount: r.Payment.ticketAmount,
						responseRef: r.id
					}))
				});

				if (result.ok) {
					const idByResponse = new Map(result.results.map((r) => [r.responseRef, r.id]));
					const sentIds = chunk.map((r) => r.id).filter((id) => idByResponse.get(id));
					const failedIds = chunk.map((r) => r.id).filter((id) => !idByResponse.get(id));

					await client.$transaction([
						client.feedbackResponse.updateMany({
							where: { id: { in: sentIds } },
							data: { emailStatus: 'sent' }
						}),
						client.feedbackResponse.updateMany({
							where: { id: { in: failedIds } },
							data: { emailStatus: 'failed' }
						}),
						client.emailLog.createMany({
							data: chunk.map((r) => ({
								emailType: 'feedback_request',
								paymentId: r.paymentId,
								status: idByResponse.get(r.id) ? 'sent' : 'failed',
								providerId: idByResponse.get(r.id) ?? undefined,
								error: idByResponse.get(r.id) ? undefined : 'batch item failed'
							}))
						})
					]);

					sent += sentIds.length;
					failed += failedIds.length;
				} else {
					await client.$transaction([
						client.feedbackResponse.updateMany({
							where: { id: { in: chunk.map((r) => r.id) } },
							data: { emailStatus: 'failed' }
						}),
						client.emailLog.createMany({
							data: chunk.map((r) => ({
								emailType: 'feedback_request',
								paymentId: r.paymentId,
								status: 'failed',
								error: result.error
							}))
						})
					]);
					failed += chunk.length;
				}
			}

			const remaining = await client.feedbackResponse.count({
				where: {
					campaignId: campaign.id,
					isBuyer: true,
					emailStatus: { in: ['pending', 'failed'] }
				}
			});
			if (remaining === 0) {
				await client.feedbackCampaign.update({
					where: { id: campaign.id },
					data: { status: 'sent', sentAt: campaign.sentAt ?? new Date() }
				});
			}

			return {
				status: 200,
				body: {
					message: failed
						? `Correos enviados: ${sent}. Fallidos: ${failed} (reintenta con "Enviar encuesta")`
						: `Correos enviados: ${sent}`,
					sent,
					failed
				}
			};
		} catch (error) {
			console.error('Error sending feedback emails:', error);
			return { status: 500, body: { error: 'No se pudieron enviar los correos de la encuesta' } };
		}
	},
	// Re-send the survey to attendees who received it but haven't answered.
	// Reuses their original link; logged separately as a reminder and does NOT
	// touch emailStatus, which tracks the first send. Intentionally repeatable.
	remindFeedbackNonResponders: async ({ params, locals }) => {
		if (!locals.session?.userId) throw redirect(302, '/login');

		const siteUrl = publicEnv.PUBLIC_SITE_URL;
		if (!siteUrl) {
			return { status: 500, body: { error: 'PUBLIC_SITE_URL no está configurado' } };
		}

		try {
			const campaign = await client.feedbackCampaign.findUnique({
				where: { productId: params.slug }
			});
			if (!campaign) {
				return { status: 400, body: { error: 'Aún no se ha enviado la encuesta' } };
			}

			const eventFromSanity = await getEvent(params.slug);

			const toRemind = await client.feedbackResponse.findMany({
				where: {
					campaignId: campaign.id,
					isBuyer: true,
					emailStatus: 'sent',
					respondedAt: null
				},
				include: {
					Payment: { select: { id: true, customer_name: true, ticketAmount: true } }
				}
			});

			if (toRemind.length === 0) {
				return {
					status: 200,
					body: { message: 'No hay asistentes pendientes de responder', sent: 0, failed: 0 }
				};
			}

			let sent = 0;
			let failed = 0;

			for (let i = 0; i < toRemind.length; i += 100) {
				const chunk = toRemind.slice(i, i + 100);
				const result = await sendFeedbackRequestBatch({
					eventName: eventFromSanity.title,
					eventDate: eventFromSanity.date ?? null,
					items: chunk.map((r) => ({
						to: r.recipientEmail as string,
						customerName: r.Payment.customer_name,
						actionUrl: `${siteUrl}/feedback/${r.token}`,
						shareUrl: r.shareToken ? `${siteUrl}/feedback/${r.shareToken}` : null,
						ticketAmount: r.Payment.ticketAmount,
						responseRef: r.id
					}))
				});

				if (result.ok) {
					const idByResponse = new Map(result.results.map((r) => [r.responseRef, r.id]));
					await client.emailLog.createMany({
						data: chunk.map((r) => ({
							emailType: 'feedback_request_reminder',
							paymentId: r.paymentId,
							status: idByResponse.get(r.id) ? 'sent' : 'failed',
							providerId: idByResponse.get(r.id) ?? undefined,
							error: idByResponse.get(r.id) ? undefined : 'batch item failed'
						}))
					});
					sent += chunk.filter((r) => idByResponse.get(r.id)).length;
					failed += chunk.filter((r) => !idByResponse.get(r.id)).length;
				} else {
					await client.emailLog.createMany({
						data: chunk.map((r) => ({
							emailType: 'feedback_request_reminder',
							paymentId: r.paymentId,
							status: 'failed',
							error: result.error
						}))
					});
					failed += chunk.length;
				}
			}

			return {
				status: 200,
				body: {
					message: failed
						? `Recordatorios enviados: ${sent}. Fallidos: ${failed}`
						: `Recordatorios enviados: ${sent}`,
					sent,
					failed
				}
			};
		} catch (error) {
			console.error('Error sending feedback reminders:', error);
			return { status: 500, body: { error: 'No se pudieron enviar los recordatorios' } };
		}
	}
};
