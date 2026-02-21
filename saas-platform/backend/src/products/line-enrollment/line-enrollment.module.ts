import { Module } from '@nestjs/common';
import { LineModule } from './line/line.module';

@Module({
    imports: [LineModule],
    controllers: [],
    providers: [],
})
export class LineEnrollmentModule { }
