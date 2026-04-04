import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { AdminInsightsService } from './admin-insights.service';
import {
  AdminInsightsController,
  InsightsController,
} from './insights.controller';

@Module({
  imports: [PrismaModule, AuthModule, AiModule],
  controllers: [InsightsController, AdminInsightsController],
  providers: [AdminInsightsService],
})
export class AdminInsightsModule {}
