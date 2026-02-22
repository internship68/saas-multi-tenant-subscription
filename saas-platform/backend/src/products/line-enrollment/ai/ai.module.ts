import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExtractStudentInfoUseCase } from './application/extract-student-info.usecase';

@Module({
    imports: [ConfigModule],
    providers: [ExtractStudentInfoUseCase],
    exports: [ExtractStudentInfoUseCase],
})
export class AiModule { }
