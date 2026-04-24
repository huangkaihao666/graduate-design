import { Module } from '@nestjs/common';
import { CounselingController } from './counseling.controller';
import { CounselingService } from './counseling.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { CozeService } from '../rooms/coze.service';

@Module({
  imports: [PrismaModule],
  controllers: [CounselingController],
  providers: [CounselingService, CozeService],
})
export class CounselingModule {}
