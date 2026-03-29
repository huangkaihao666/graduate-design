import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOrJwtAuthGuard } from '../auth/admin-or-jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { AdminInsightsService } from './admin-insights.service';

@ApiTags('Insights')
@Controller('insights')
export class InsightsController {
  constructor(private readonly insights: AdminInsightsService) {}

  @Post('browse')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '记录用户浏览套餐（详情/下单入口），用于运营分析' })
  async logBrowse(
    @Body() body: { packageId?: number; context?: string },
    @Request() req: { user?: { id?: number; sub?: number } },
  ) {
    const uid = req.user?.id ?? req.user?.sub;
    return this.insights.logBrowse(
      Number(body?.packageId),
      typeof uid === 'number' && uid > 0 ? uid : undefined,
      body?.context,
    );
  }
}

@ApiTags('Admin Insights')
@Controller('admin/insights')
export class AdminInsightsController {
  constructor(private readonly insights: AdminInsightsService) {}

  @Get('report')
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '运营洞察报告（订单、收藏、浏览埋点、AI 行为与文案建议）',
  })
  report() {
    return this.insights.buildOperationalReport();
  }
}
