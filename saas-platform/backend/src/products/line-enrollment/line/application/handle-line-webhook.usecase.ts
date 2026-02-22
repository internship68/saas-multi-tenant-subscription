import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import axios from 'axios';

import { ExtractStudentInfoUseCase, StudentInfo } from '../../ai/application/extract-student-info.usecase';

export interface WebhookPayload {
    integrationId: string;
    signature: string;
    rawBody: Buffer;
    events: any[];
}

@Injectable()
export class HandleLineWebhookUseCase {
    private readonly logger = new Logger(HandleLineWebhookUseCase.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly extractAi: ExtractStudentInfoUseCase,
    ) { }

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

        // ── 2. ตรวจสอบสถานะการเงิน (Feature Gate)
        const activeSub = await this.prisma.subscription.findFirst({
            where: {
                organizationId: integration.organizationId,
                status: 'ACTIVE',
            },
        });

        if (!activeSub) {
            this.logger.warn(`Organization ${integration.organizationId} has no active subscription. Blocking webhook.`);
            return;
        }

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
                const replyToken = event.replyToken;

                if (!lineUserId) continue;

                // Atomic transaction: Create/Find Lead and Update Conversation State
                await this.prisma.$transaction(async (tx) => {
                    // 4.1 Check if lead exists
                    let lead = await tx.lineLead.findFirst({
                        where: {
                            organizationId: integration.organizationId,
                            lineUserId: lineUserId,
                        }
                    });

                    // 4.2 ถ้าไม่เคยมี ให้สร้างใหม่
                    if (!lead) {
                        let displayName = null;
                        try {
                            const profileRes = await axios.get(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
                                headers: { Authorization: `Bearer ${integration.channelAccessToken}` }
                            });
                            displayName = profileRes.data.displayName;
                        } catch (err: any) {
                            this.logger.error(`Failed to fetch LINE profile for ${lineUserId}: ${err.message}`);
                        }

                        lead = await tx.lineLead.create({
                            data: {
                                organizationId: integration.organizationId,
                                lineUserId: lineUserId,
                                studentName: displayName,
                                status: 'NEW',
                            }
                        });

                        await tx.auditLog.create({
                            data: {
                                organizationId: integration.organizationId,
                                action: 'NEW_LINE_LEAD',
                                entityType: 'LineLead',
                                entityId: lead.id,
                                metadata: { lineUserId, displayName, text } as any
                            }
                        });
                    } else {
                        // Returning lead notification
                        await tx.auditLog.create({
                            data: {
                                organizationId: integration.organizationId,
                                action: 'RETURNING_LINE_LEAD',
                                entityType: 'LineLead',
                                entityId: lead.id,
                                metadata: { lineUserId, displayName: lead.studentName, text } as any
                            }
                        });
                    }

                    // 4.3 บันทึกข้อความลงในประวัติ (Message History)
                    await (tx as any).lineMessage.create({
                        data: {
                            organizationId: integration.organizationId,
                            lineUserId: lineUserId,
                            role: 'user',
                            content: text,
                        }
                    });

                    // 4.4 Get conversation history for AI
                    const history = await (tx as any).lineMessage.findMany({
                        where: { organizationId: integration.organizationId, lineUserId },
                        orderBy: { createdAt: 'asc' },
                        take: 10,
                    });

                    // 4.5 AI Extraction Layer (Structured Data)
                    const aiResult: StudentInfo = await this.extractAi.execute(
                        history.map((h: { role: any; content: any; }) => ({ role: h.role, content: h.content }))
                    );

                    // 4.6 Update Lead if AI found something (with confidence threshold)
                    if (aiResult.confidence > 0.6) {
                        const updateData: any = {};
                        if (aiResult.gradeLevel && !lead.grade) updateData.grade = aiResult.gradeLevel;
                        if (aiResult.interestedSubject && !lead.courseInterest) updateData.courseInterest = aiResult.interestedSubject;
                        if (aiResult.phoneNumber && !lead.phone) updateData.phone = aiResult.phoneNumber;

                        if (Object.keys(updateData).length > 0) {
                            await tx.lineLead.update({
                                where: { id: lead.id },
                                data: updateData
                            });
                            this.logger.log(`AI extracted & updated lead ${lead.id}: ${JSON.stringify(updateData)}`);
                        }
                    }

                    // 4.7 Generate Next Reply (Rule-based / AI-powered logic soon)
                    let replyText = "ขอบคุณที่สนใจครับ เจ้าหน้าที่จะติดต่อกลับโดยเร็วที่สุด";

                    if (!lead.grade && !aiResult.gradeLevel) {
                        replyText = "สวัสดีครับ ไม่ทราบว่าน้องกำลังเรียนอยู่ชั้นไหนครับ?";
                    } else if (!lead.phone && !aiResult.phoneNumber) {
                        replyText = "รบกวนขอเบอร์โทรศัพท์สำหรับติดต่อกลับด้วยนะครับ";
                    }

                    // 4.8 Send Reply via LINE API
                    try {
                        await axios.post('https://api.line.me/v2/bot/message/reply', {
                            replyToken: replyToken,
                            messages: [{ type: 'text', text: replyText }]
                        }, {
                            headers: {
                                'Authorization': `Bearer ${integration.channelAccessToken}`,
                                'Content-Type': 'application/json',
                            }
                        });

                        // 4.9 Save assistant message to history
                        await (tx as any).lineMessage.create({
                            data: {
                                organizationId: integration.organizationId,
                                lineUserId: lineUserId,
                                role: 'assistant',
                                content: replyText,
                            }
                        });
                    } catch (err: any) {
                        this.logger.error(`Failed to send LINE reply: ${err.message}`);
                    }
                });
            }
        }
    }
}
