// One-shot: split legacy `payment_status` ('refund' | 'change') into the
// boolean flags `refund` / `changeEvent`, restoring the origin to 'success'.
//
// Run with:  npx ts-node --esm scripts/backfillRefundChange.ts
//        or: npx tsx scripts/backfillRefundChange.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	const refundRows = await prisma.payment.findMany({
		where: { payment_status: 'refund' },
		select: { id: true }
	});
	const changeRows = await prisma.payment.findMany({
		where: { payment_status: 'change' },
		select: { id: true }
	});

	console.log(`Found ${refundRows.length} refund rows and ${changeRows.length} change rows.`);

	if (refundRows.length) {
		const result = await prisma.payment.updateMany({
			where: { payment_status: 'refund' },
			data: { refund: true, payment_status: 'success' }
		});
		console.log(`Updated ${result.count} refund rows.`);
	}

	if (changeRows.length) {
		const result = await prisma.payment.updateMany({
			where: { payment_status: 'change' },
			data: { changeEvent: true, payment_status: 'success' }
		});
		console.log(`Updated ${result.count} change rows.`);
	}
}

main()
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
