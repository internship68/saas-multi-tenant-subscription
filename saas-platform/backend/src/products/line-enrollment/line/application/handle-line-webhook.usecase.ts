import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import * as crypto from 'crypto';
import axios from 'axios';

import { ExtractStudentInfoUseCase, StudentInfo } from '../../ai/application/extract-student-info.usecase';
import { GenerateReplyUseCase, ReplyResult } from '../../ai/application/generate-reply.usecase';

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
        private readonly configService: ConfigService,
        private readonly extractAi: ExtractStudentInfoUseCase,
        private readonly generateReplyAi: GenerateReplyUseCase,
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

        // 4.Process Events
        for (const event of events) {
            if (event.type === 'message' && event.message.type === 'text') {
                const lineUserId = event.source.userId;
                const text = event.message.text;
                const replyToken = event.replyToken;

                if (!lineUserId) continue;

                // --- PHASE 4.1: TX A - SAVE & PREVIEW HISTORY ---
                const { lead, conversation, history } = await this.prisma.$transaction(async (tx: any) => {
                    const orgId = integration.organizationId;

                    // 1. Get or Create Conversation
                    let currentConv = await tx.lineConversation.findUnique({
                        where: { organizationId_lineUserId: { organizationId: orgId, lineUserId } }
                    });
                    if (!currentConv) {
                        currentConv = await tx.lineConversation.create({
                            data: { organizationId: orgId, lineUserId, state: 'NEW' }
                        });
                    }

                    // 2. Get or Create Lead
                    let currentLead = await tx.lineLead.findFirst({
                        where: { organizationId: orgId, lineUserId }
                    });
                    if (!currentLead) {
                        // Fetch profile for new lead
                        let displayName = 'LINE User';
                        try {
                            const profileRes = await axios.get(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
                                headers: { Authorization: `Bearer ${integration.channelAccessToken}` }
                            });
                            displayName = profileRes.data.displayName;
                        } catch (err) { }

                        currentLead = await tx.lineLead.create({
                            data: { organizationId: orgId, lineUserId, studentName: displayName, status: 'NEW' }
                        });
                    }

                    // 3. Save incoming message
                    await tx.lineMessage.create({
                        data: { organizationId: orgId, lineUserId, role: 'user', content: text }
                    });

                    // 4. Get recent history
                    const recentLogs = await tx.lineMessage.findMany({
                        where: { organizationId: orgId, lineUserId },
                        orderBy: { createdAt: 'asc' },
                        take: 10
                    });

                    return { lead: currentLead, conversation: currentConv, history: recentLogs };
                });

                // --- PHASE 4.2: AI PROCESSING (OUTSIDE TX) ---
                let replyText = "ขอบคุณที่ทักทายนะคะ ตอนนี้แอดมินกำลังเร่งตรวจสอบข้อมูลให้ค่ะ อีกสักครู่จะติดต่อกลับไปนะคะ";
                let nextState = conversation.state;
                const aiEnabled = this.configService.get('AI_ENABLED') === 'true';

                let extractionResult: StudentInfo | null = null;
                let replyResult: ReplyResult | null = null;

                const isHandover = conversation.state === 'HANDOVER_TO_ADMIN';

                if (aiEnabled && !isHandover) {
                    try {
                        // 1. Extract Info
                        extractionResult = await this.extractAi.execute(
                            history.map((h: any) => ({ role: h.role, content: h.content }))
                        );

                        // 2. Get Courses (Limit to 5 as requested)
                        const courses = await this.prisma.course.findMany({
                            where: { organizationId: integration.organizationId },
                            take: 5
                        });

                        // 3. Generate Smart Reply
                        replyResult = await this.generateReplyAi.execute({
                            state: conversation.state,
                            lead: {
                                gradeLevel: extractionResult.gradeLevel || lead.gradeLevel,
                                phoneNumber: extractionResult.phoneNumber || lead.phoneNumber,
                                interestedSubject: extractionResult.interestedSubject || lead.interestedSubject,
                                parentName: lead.parentName || extractionResult.parentName,
                            },
                            availableCourses: courses.map(c => c.name)
                        });

                        replyText = replyResult.replyText;
                        nextState = replyResult.nextState;
                        this.logger.log(`AI Gen successful for ${lineUserId}`);
                    } catch (err: any) {
                        this.logger.error(`AI Flow failed: ${err.message}. Using fallback.`);
                    }
                } else if (isHandover) {
                    this.logger.log(`AI skipped for ${lineUserId} (HANDOVER_TO_ADMIN)`);
                    return; // Skip sending any automated reply if admin took over
                }

                // --- PHASE 4.3: TX B - COMMIT UPDATES & USAGE ---
                await this.prisma.$transaction(async (tx: any) => {
                    const orgId = integration.organizationId;

                    // 1. Update Lead (Only if confidence >= 0.6)
                    if (extractionResult && extractionResult.confidence >= 0.6) {
                        const updateData: any = {};
                        if (!lead.gradeLevel && extractionResult.gradeLevel) updateData.gradeLevel = extractionResult.gradeLevel;
                        if (!lead.phoneNumber && extractionResult.phoneNumber) updateData.phoneNumber = extractionResult.phoneNumber;
                        if (!lead.interestedSubject && extractionResult.interestedSubject) updateData.interestedSubject = extractionResult.interestedSubject;

                        // Calculate Score
                        const fields = ['studentName', 'gradeLevel', 'phoneNumber', 'interestedSubject', 'parentName'];
                        let completeness = 0;
                        fields.forEach(f => {
                            if ((lead as any)[f] || (updateData as any)[f] || (extractionResult as any)[f]) completeness += 0.2;
                        });

                        const newScore = (completeness * 0.4) + (extractionResult.confidence * 0.6);
                        updateData.score = newScore;
                        updateData.aiConfidence = extractionResult.confidence;

                        if (Object.keys(updateData).length > 0) {
                            await tx.lineLead.update({
                                where: { id: lead.id },
                                data: updateData
                            });
                        }
                    }

                    // 1.1 Notification Trigger (Admin Alert)
                    if (nextState === 'READY_TO_CONTACT' && !lead.notifiedAt) {
                        await tx.lineLead.update({
                            where: { id: lead.id },
                            data: { notifiedAt: new Date() }
                        });

                        await tx.auditLog.create({
                            data: {
                                organizationId: orgId,
                                action: 'ADMIN_NOTIFICATION_READY',
                                entityType: 'LineLead',
                                entityId: lead.id,
                                metadata: { message: "Lead is ready for contact!" } as any
                            }
                        });
                        this.logger.log(`Admin notified for lead ${lead.id}`);
                    }

                    // 2. Update Conversation state
                    if (nextState !== conversation.state) {
                        await tx.lineConversation.update({
                            where: { id: conversation.id },
                            data: { state: nextState }
                        });
                    }

                    // 3. Save Assistant Message
                    await tx.lineMessage.create({
                        data: { organizationId: orgId, lineUserId, role: 'assistant', content: replyText }
                    });

                    // 4. Track Usage
                    if (extractionResult?.usage || replyResult?.usage) {
                        const totalTokens = (extractionResult?.usage?.totalTokens || 0) + (replyResult?.usage?.totalTokens || 0);
                        await tx.aiUsage.create({
                            data: {
                                organizationId: orgId,
                                tokensUsed: totalTokens,
                                model: 'gemini-2.0-flash',
                                type: 'WEBHOOK_FLOW'
                            }
                        });
                    }
                });

                // --- PHASE 4.4: EXTERNAL - SEND LINE MESSAGE ---
                try {
                    await axios.post('https://api.line.me/v2/bot/message/reply', {
                        replyToken,
                        messages: [{ type: 'text', text: replyText }]
                    }, {
                        headers: {
                            'Authorization': `Bearer ${integration.channelAccessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (err: any) {
                    this.logger.error(`Failed to send LINE reply: ${err.message}`);
                }
            }
        }
    }
}
