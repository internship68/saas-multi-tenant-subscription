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
        this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    }

    async execute(history: { role: string; content: string }[]): Promise<StudentInfo> {
        if (!this.apiKey) {
            this.logger.warn('OPENAI_API_KEY is not set. Returning null info.');
            return {
                gradeLevel: null,
                interestedSubject: null,
                phoneNumber: null,
                parentName: null,
                confidence: 0,
            };
        }

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
2. gradeLevel should be like "ป.1", "ม.3", etc.
3. confidence reflects how sure you are about the extracted data.

Conversation History:
${history.map(h => `${h.role}: ${h.content}`).join('\n')}
`;

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are a structured data extractor. Respond only with JSON.' },
                        { role: 'user', content: prompt },
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const result = JSON.parse(response.data.choices[0].message.content);
            return {
                gradeLevel: result.gradeLevel ?? null,
                interestedSubject: result.interestedSubject ?? null,
                phoneNumber: result.phoneNumber ?? null,
                parentName: result.parentName ?? null,
                confidence: result.confidence ?? 0,
            };
        } catch (err: any) {
            this.logger.error(`Failed to extract student info: ${err.message}`);
            return {
                gradeLevel: null,
                interestedSubject: null,
                phoneNumber: null,
                parentName: null,
                confidence: 0,
            };
        }
    }
}
