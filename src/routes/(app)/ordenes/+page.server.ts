import { client } from '$lib/server/prisma';
import { sendOrderConfirmationEmail } from '$lib/server/mailApi';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const orders = await client.order.findMany({
		include: {
			Payment: {
				include: {
					Product: true
				}
			},
			MerchPayment: {
				include: {
					Merch: true
				}
			},
			EmailLog: {
				orderBy: { createdAt: 'desc' }
			}
		},
		orderBy: {
			createdAt: 'desc'
		}
	});

	return { orders };
};

export const actions: Actions = {
	resendConfirmation: async ({ request }) => {
		const formData = await request.formData();
		const orderId = formData.get('orderId') as string;

		const order = await client.order.findUnique({
			where: { id: orderId },
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

		if (!result.ok) console.error('Error resending confirmation email:', result.error);

		try {
			await client.emailLog.create({
				data: {
					emailType: 'order_confirmation',
					orderId: order.id,
					status: result.ok ? 'sent' : 'failed',
					providerId: result.ok ? result.id : undefined,
					error: result.ok ? undefined : result.error
				}
			});
		} catch (error) {
			console.error('Error recording EmailLog:', error);
		}

		if (!result.ok) {
			return { status: 502, body: { error: 'No se pudo reenviar el correo', detail: result.error } };
		}
		return { status: 200, body: { message: 'Correo de confirmación reenviado' } };
	}
};
