import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

export interface WebhookPayload {
    integrationId: string;
    signature: string;
    rawBody: Buffer;
    events: any[];
}

@Injectable()
export class HandleLineWebhookUseCase {
    private readonly logger = new Logger(HandleLineWebhookUseCase.name);

    constructor(private readonly prisma: PrismaService) { }

    async execute(payload: WebhookPayload): Promise<void> {
        const { integrationId, signature, rawBody, events } = payload;

        // ── 1. หา Integration ข้อมูลจาก DB ──────────────────────────────────
        const integration = await this.prisma.lineIntegration.findUnique({
            where: { id: integrationId },
            include: { organization: true },
        });

        if (!integration) {
            this.logger.warn(`Integration not found: ${integrationId}`);
            throw new NotFoundException('Integration not found');
        }

        // ── 2. ตรวจสอบสถานะการเงิน (Feature Gate เบื้องต้นแบบ Hardcode ใน Flow นึ้)
        // จริงๆ เราควรผ่าน Service แต่เพื่อความเร็วเราเช็คผ่าน Prisma ก่อนว่า Active ไหม
        const activeSub = await this.prisma.subscription.findFirst({
            where: {
                organizationId: integration.organizationId,
                status: 'ACTIVE',
            },
        });

        if (!activeSub) {
            this.logger.warn(`Organization ${integration.organizationId} has no active subscription. Blocking webhook.`);
            return; // ไม่ Throw error ปล่อยผ่านไปให้ตีดกลับ 200 LINE จะได้ไม่ retry รบกวน
        }

        // TODO: ในอนาคตเช็คว่า PLAN มีสิทธิใช้ LINE_ENROLLMENT ไหม

        // ── 3. Validate LINE Signature ──────────────────────────────────────
        const expectedSignature = crypto
            .createHmac('SHA256', integration.channelSecret)
            .update(rawBody)
            .digest('base64');

        if (signature !== expectedSignature) {
            this.logger.error(`Invalid LINE signature for integration ${integrationId}`);
            throw new BadRequestException('Invalid signature');
        }

        // ── 4. Process Events ────────────────────────────────────────────────
        for (const event of events) {
            if (event.type === 'message' && event.message.type === 'text') {
                const lineUserId = event.source.userId;
                const text = event.message.text;

                if (!lineUserId) continue;

                // Atomic transaction: Create/Find Lead and Update Conversation State
                await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                    // Check if lead exists
                    let lead = await tx.lineLead.findFirst({
                        where: {
                            organizationId: integration.organizationId,
                            lineUserId: lineUserId,
                        }
                    });

                    // ถ้าไม่เดยมี ให้สร้างใหม่
                    if (!lead) {
                        lead = await tx.lineLead.create({
                            data: {
                                organizationId: integration.organizationId,
                                lineUserId: lineUserId,
                                status: 'NEW',
                            }
                        });
                        this.logger.log(`Created new LineLead: ${lead.id}`);
                    }

                    // สร้างหรืออัปเดต State การพูดคุย
                    const conversation = await tx.lineConversation.upsert({
                        where: {
                            organizationId_lineUserId: {
                                organizationId: integration.organizationId,
                                lineUserId: lineUserId,
                            }
                        },
                        update: {
                            updatedAt: new Date(),
                            // state อาจจะเปลี่ยนอิงตาม Flow (ตอนนี้ปล่อยคงที่ไว้ก่อน)
                        },
                        create: {
                            organizationId: integration.organizationId,
                            lineUserId: lineUserId,
                            state: 'INITIAL',
                        }
                    });

                    this.logger.log(`Received message: "${text}" from ${lineUserId} in org ${integration.organizationId}`);

                    // TODO (Next step):
                    // 1. ส่งข้อความให้ AI (callLLM)
                    // 2. ตอบกลับลูกค้า (replyMessage via LINE SDK)
                });
            }
        }
    }
}
