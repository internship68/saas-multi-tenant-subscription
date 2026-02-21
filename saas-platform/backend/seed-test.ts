import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
    const orgId = 'org-test-webhook';

    const existingOrg = await prisma.organization.findUnique({ where: { id: orgId } });

    if (!existingOrg) {
        const org = await prisma.organization.create({
            data: { id: orgId, name: 'Webhook Test Org' }
        });
        console.log('Seeded Org:', org.id);
    }

    const existingSub = await prisma.subscription.findUnique({ where: { id: 'sub-test-1' } });

    if (!existingSub) {
        // Current period start: today, end: 30 days from now
        const now = new Date();
        const end = new Date(now);
        end.setDate(now.getDate() + 30);

        const sub = await prisma.subscription.create({
            data: {
                id: 'sub-test-1',
                organizationId: orgId,
                plan: 'FREE',
                status: 'ACTIVE',
                currentPeriodStart: now,
                currentPeriodEnd: end,
            }
        });
        console.log('Seeded Sub:', sub.id);
    } else {
        // Reset to ACTIVE/FREE in case we are re-testing
        await prisma.subscription.update({
            where: { id: 'sub-test-1' },
            data: { status: 'ACTIVE', plan: 'FREE' }
        });
        console.log('Reset Sub: sub-test-1');
    }

    // Clear previous test events to ensure clean test
    await prisma.webhookEvent.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.auditLog.deleteMany({});

    console.log('Database state ready for test.');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
