import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface StudentInfo {
    gradeLevel: string | null;
    interestedSubject: string | null;
    phoneNumber: string | null;
    parentName: string | null;
    confidence: number;
    usage?: {
        totalTokens: number;
    };
}

@Injectable()
export class ExtractStudentInfoUseCase {
    private readonly logger = new Logger(ExtractStudentInfoUseCase.name);
    private readonly apiKey: string;

    constructor(private readonly configService: ConfigService) {
        this.apiKey = (this.configService.get<string>('GEMINI_API_KEY') || '').trim();
    }

    async execute(history: { role: string; content: string }[]): Promise<StudentInfo> {
        if (!this.apiKey) {
            this.logger.warn('GEMINI_API_KEY is not set. Returning null info.');
            return this.getFallbackInfo();
        }

        return this.tryExtractWithRetry(history, 1);
    }

    private async tryExtractWithRetry(history: { role: string; content: string }[], retriesCount: number): Promise<StudentInfo> {
        try {
            return await this.extractInfo(history);
        } catch (error: any) {
            if (retriesCount > 0) {
                this.logger.warn(`AI extraction failed. Retrying... (${retriesCount} left). Error: ${error.message}`);
                return await this.tryExtractWithRetry(history, retriesCount - 1);
            }
            this.logger.error(`AI extraction failed completely. Using fallback. Error: ${error.message}`);
            return this.getFallbackInfo();
        }
    }

    private async extractInfo(history: { role: string; content: string }[]): Promise<StudentInfo> {
        const prompt = `
You are an enrollment assistant for a tutoring school. 
Extract structured data from the following conversation history between a user (customer) and an assistant (bot).

Return JSON in this format:
{
  "gradeLevel": string | null,
  "interestedSubject": string | null,
  "phoneNumber": string | null,
  "parentName": string | null,
  "confidence": number (0 to 1)
}

Rules:
1. ONLY extract information that is explicitly stated or very clearly implied.
2. gradeLevel should be localized (e.g., "ป.1", "ม.5").
3. phoneNumbers should be cleaned of non-digit characters.
4. "confidence" is your certainty about the EXTRACTION, not the user's certainty.
5. Provide ONLY the JSON object.

Conversation History:
${history.map(h => `${h.role}: ${h.content}`).join('\n')}
`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
            {
                contents: [{
                    parts: [{ text: 'You are a structured data extractor. Respond only with JSON.\n\n' + prompt }]
                }],
                generationConfig: {
                    temperature: 0,
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
        const result = JSON.parse(data.candidates[0].content.parts[0].text);

        this.logger.log(`[DEBUG EXTRACTION] Found: ${JSON.stringify(result)} | Usage: ${usage?.totalTokenCount || 0}`);

        return {
            gradeLevel: result.gradeLevel ?? null,
            interestedSubject: result.interestedSubject ?? null,
            phoneNumber: result.phoneNumber ?? null,
            parentName: result.parentName ?? null,
            confidence: result.confidence ?? 0,
            usage: {
                totalTokens: usage?.totalTokenCount || 0
            }
        };
    }

    private getFallbackInfo(): StudentInfo {
        return {
            gradeLevel: null,
            interestedSubject: null,
            phoneNumber: null,
            parentName: null,
            confidence: 0,
        };
    }
}
