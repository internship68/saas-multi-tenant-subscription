import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExtractStudentInfoUseCase } from './application/extract-student-info.usecase';
import { GenerateReplyUseCase } from './application/generate-reply.usecase';

@Module({
    imports: [ConfigModule],
    providers: [ExtractStudentInfoUseCase, GenerateReplyUseCase],
    exports: [ExtractStudentInfoUseCase, GenerateReplyUseCase],
})
export class AiModule { }
