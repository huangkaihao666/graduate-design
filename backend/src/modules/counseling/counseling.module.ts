import { Module } from '@nestjs/common';
import { CounselingController } from './counseling.controller';
import { CounselingService } from './counseling.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { CozeService } from '../rooms/coze.service';
import { AchievementsModule } from '@/modules/achievements/achievements.module';
import { RagModule } from '@/modules/rag/rag.module';

@Module({
  imports: [PrismaModule, AchievementsModule, RagModule],
  controllers: [CounselingController],
  providers: [CounselingService, CozeService],
})
export class CounselingModule {}
