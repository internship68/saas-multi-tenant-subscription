import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function snap() {
    const events = await prisma.webhookEvent.findMany();
    const payments = await prisma.payment.findMany();
    const sub = await prisma.subscription.findUnique({ where: { id: 'sub-test-1' } });
    const logs = await prisma.auditLog.findMany();

    console.log('--- DB SNAPSHOT ---');
    console.log('Subscription:', { id: sub?.id, status: sub?.status, plan: sub?.plan });
    console.log('Payments Count:', payments.length);
    if (payments.length > 0) payments.forEach(p => console.log('  Payment:', p.status, p.amount, p.currency));
    console.log('Webhook Events:', events.length);
    if (events.length > 0) events.forEach(e => console.log('  Webhook:', e.type, e.status));
    console.log('Audit Logs:', logs.length);
    if (logs.length > 0) logs.forEach(l => console.log('  Audit:', l.action, l.metadata));
    console.log('-------------------');
}

snap().catch(console.error).finally(() => prisma.$disconnect());
