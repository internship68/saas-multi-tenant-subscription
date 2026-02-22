import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface StudentInfo {
    gradeLevel: string | null;
    interestedSubject: string | null;
    phoneNumber: string | null;
    parentName: string | null;
    confidence: number;
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
  "confidence": number (0-1)
}

Rules:
1. If info is missing, use null.
2. gradeLevel should be like "ป.1" or "ม.5"
3. confidence reflects how sure you are about the extracted data.

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

        const result = JSON.parse(response.data.candidates[0].content.parts[0].text);
        this.logger.log(`[DEBUG EXTRACTION] Found: ${JSON.stringify(result)}`);
        return {
            gradeLevel: result.gradeLevel ?? null,
            interestedSubject: result.interestedSubject ?? null,
            phoneNumber: result.phoneNumber ?? null,
            parentName: result.parentName ?? null,
            confidence: result.confidence ?? 0,
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
