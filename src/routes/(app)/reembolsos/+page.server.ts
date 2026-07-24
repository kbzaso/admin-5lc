import type { Actions, PageServerLoad } from './$types';
import { client } from '$lib/server/prisma';
import { sendRefundCompletedEmail } from '$lib/server/mailApi';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session?.userId) throw redirect(302, '/login');

	const refundRequests = await client.cancellationResponse.findMany({
		where: { choice: 'refund' },
		orderBy: { respondedAt: 'desc' },
		include: {
			Payment: {
				select: {
					id: true,
					customer_name: true,
					customer_email: true,
					client_id: true,
					ticketAmount: true,
					price: true
				}
			},
			CancellationCampaign: {
				include: { Product: { select: { id: true, name: true } } }
			}
		}
	});

	return { refundRequests };
};

export const actions: Actions = {
	markAsTransferred: async ({ request, locals }) => {
		if (!locals.session?.userId) throw redirect(302, '/login');

		const formData = await request.formData();
		const responseId = formData.get('responseId') as string;

		if (!responseId) {
			return { status: 400, body: { error: 'Falta el identificador del reembolso' } };
		}

		try {
			// Guarded update: a refund can only move pending → transferred once,
			// even if two admins click at the same time.
			const updated = await client.cancellationResponse.updateMany({
				where: { id: responseId, choice: 'refund', refundStatus: 'pending' },
				data: {
					refundStatus: 'transferred',
					refundedAt: new Date(),
					refundedByUserId: locals.session.userId
				}
			});

			if (updated.count === 0) {
				return { status: 409, body: { error: 'Este reembolso ya fue procesado' } };
			}

			const response = await client.cancellationResponse.findUnique({
				where: { id: responseId },
				include: {
					Payment: {
						select: {
							id: true,
							customer_name: true,
							customer_email: true,
							client_id: true,
							price: true
						}
					},
					CancellationCampaign: {
						include: { Product: { select: { name: true } } }
					}
				}
			});

			let emailStatus: string | null = null;

			if (response) {
				await client.comment.create({
					data: {
						id: crypto.randomUUID(),
						paymentId: response.paymentId,
						commentText: 'Reembolso transferido al comprador.',
						userId: locals.session.userId
					}
				});

				// Tell the buyer their money is on the way — best-effort, the
				// refund is already marked as transferred above.
				try {
					const emailResult = await sendRefundCompletedEmail({
						orderId: response.Payment.client_id ?? response.paymentId,
						to: response.Payment.customer_email,
						customerName: response.Payment.customer_name,
						eventName: response.CancellationCampaign.Product.name,
						refundAmount: response.Payment.price,
						bankName: response.bankName ?? 'tu banco',
						bankAccountNumberLast4: (response.bankAccountNumber ?? '').slice(-4) || '····'
					});

					if (!emailResult.ok) {
						console.error('Error sending refund completed email:', emailResult.error);
					}

					await client.emailLog.create({
						data: {
							emailType: 'refund_completed',
							paymentId: response.paymentId,
							status: emailResult.ok ? 'sent' : 'failed',
							providerId: emailResult.ok ? emailResult.id : undefined,
							error: emailResult.ok ? undefined : emailResult.error
						}
					});
					emailStatus = emailResult.ok ? 'sent' : 'failed';
				} catch (error) {
					console.error('Error sending refund completed email / EmailLog:', error);
					emailStatus = 'failed';
				}
			}

			return {
				status: 200,
				body: {
					message:
						emailStatus === 'sent'
							? 'Reembolso marcado como transferido y comprador notificado por correo'
							: 'Reembolso marcado como transferido (no se pudo enviar el correo al comprador)',
					emailStatus
				}
			};
		} catch (error) {
			console.error('Error marking refund as transferred:', error);
			return { status: 500, body: { error: 'No se pudo actualizar el reembolso' } };
		}
	}
};
