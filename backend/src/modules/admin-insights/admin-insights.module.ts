import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminInsightsService } from './admin-insights.service';
import {
  AdminInsightsController,
  InsightsController,
} from './insights.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [InsightsController, AdminInsightsController],
  providers: [AdminInsightsService],
})
export class AdminInsightsModule {}
