import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ReplyContext {
    state: string;
    lead: {
        gradeLevel?: string | null;
        interestedSubject?: string | null;
        phoneNumber?: string | null;
        parentName?: string | null;
    };
    availableCourses?: string[];
}

export interface ReplyResult {
    replyText: string;
    nextState: string;
    usage?: {
        totalTokens: number;
    };
}

@Injectable()
export class GenerateReplyUseCase {
    private readonly logger = new Logger(GenerateReplyUseCase.name);

    constructor(private readonly configService: ConfigService) { }

    async execute(context: ReplyContext): Promise<ReplyResult> {
        const aiKey = (this.configService.get<string>('GEMINI_API_KEY') || '').trim();
        if (!aiKey) {
            this.logger.error('GEMINI_API_KEY is not configured');
            return this.getFallbackReply(context);
        }

        return this.tryGenerateWithRetry(context, aiKey, 1);
    }

    private async tryGenerateWithRetry(context: ReplyContext, aiKey: string, retriesCount: number): Promise<ReplyResult> {
        try {
            return await this.generateReply(context, aiKey);
        } catch (error: any) {
            if (retriesCount > 0) {
                this.logger.warn(`AI generate reply failed. Retrying... (${retriesCount} left). Error: ${error.message}`);
                return await this.tryGenerateWithRetry(context, aiKey, retriesCount - 1);
            }
            this.logger.error(`AI generate reply failed completely. Using fallback. Error: ${error.message}`);
            return this.getFallbackReply(context);
        }
    }

    private async generateReply(context: ReplyContext, aiKey: string): Promise<ReplyResult> {
        const prompt = `
You are a polite and professional school enrollment assistant.
Your ONLY goal is to collect MISSING information to complete the student's profile.
Required information:
1. Grade level
2. Phone number

Current Profile:
- Grade: ${context.lead.gradeLevel || 'Missing'}
- Phone: ${context.lead.phoneNumber || 'Missing'}
- Subject: ${context.lead.interestedSubject || 'Missing'}
- Parent Name: ${context.lead.parentName || 'Missing'}
- Available Courses: ${context.availableCourses?.join(', ') || 'N/A'}

Current State: ${context.state}

Rules:
- NEVER make up information.
- Provide a responsive message based on the input context.
- Decide the "nextState" based on these DETERMINISTIC rules:
    - If "Grade" is missing: set nextState to "COLLECTING_INFO" and ASK for the grade.
    - If "Grade" is present but "Phone" is missing: set nextState to "COLLECTING_INFO" and ASK for the phone number.
    - If BOTH "Grade" and "Phone" are present: set nextState to "READY_TO_CONTACT" and inform that an admin will call.
- Output strictly in JSON format.

Output format:
{
  "replyText": "your reply text",
  "nextState": "COLLECTING_INFO | READY_TO_CONTACT | HANDOVER_TO_ADMIN"
}
`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${aiKey}`,
            {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: 'application/json'
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 3000,
            }
        );

        const data = response.data;
        const usage = data.usageMetadata;

        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('AI response is empty');
        }

        const resultJson = JSON.parse(data.candidates[0].content.parts[0].text);
        this.logger.log(`Token usage [Reply] - Total: ${usage?.totalTokenCount || 0}`);

        return {
            replyText: resultJson.replyText || this.getFallbackReply(context).replyText,
            nextState: resultJson.nextState || 'COLLECTING_INFO',
            usage: {
                totalTokens: usage?.totalTokenCount || 0
            }
        };
    }

    private getFallbackReply(context: ReplyContext): ReplyResult {
        let replyText = "ขอบคุณที่สนใจครับ เจ้าหน้าที่จะติดต่อกลับโดยเร็วที่สุด";
        let nextState = 'HANDOVER_TO_ADMIN';

        if (!context.lead.gradeLevel) {
            replyText = "สวัสดีครับ ไม่ทราบว่าน้องกำลังเรียนอยู่ชั้นไหนครับ?";
            nextState = 'COLLECTING_INFO';
        } else if (!context.lead.phoneNumber) {
            replyText = "รบกวนขอเบอร์โทรศัพท์สำหรับติดต่อกลับด้วยนะครับ";
            nextState = 'COLLECTING_INFO';
        }

        return { replyText, nextState };
    }
}
