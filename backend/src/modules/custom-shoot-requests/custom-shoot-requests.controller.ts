import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomShootRequestsService } from './custom-shoot-requests.service';

@ApiTags('CustomShootRequests')
@ApiBearerAuth()
@Controller('custom-shoot-requests')
@UseGuards(JwtAuthGuard)
export class CustomShootRequestsController {
  constructor(private readonly svc: CustomShootRequestsService) {}

  private uid(req: { user: { id?: number; sub?: number } }) {
    const u = req.user;
    return Number(u?.id ?? u?.sub);
  }

  @Post()
  @ApiOperation({ summary: '发布定制旅拍需求（用户）' })
  create(
    @Request() req: { user: { id?: number; sub?: number } },
    @Body()
    body: {
      title?: string;
      description?: string;
      location: string;
      style: string;
      shootingDate: string;
      duration?: number;
      numberOfPeople?: number;
      budgetHint?: number | null;
      contactName: string;
      phone: string;
    },
  ) {
    return this.svc.create(this.uid(req), body);
  }

  @Get('mine')
  @ApiOperation({ summary: '我的定制需求（用户）' })
  listMine(@Request() req: { user: { id?: number; sub?: number } }) {
    return this.svc.listMine(this.uid(req));
  }

  @Get('market')
  @ApiOperation({ summary: '接单广场（工作人员）' })
  listMarket(@Request() req: { user: { id?: number; sub?: number } }) {
    return this.svc.listMarket(this.uid(req));
  }

  @Get(':id')
  @ApiOperation({ summary: '需求详情（发布者或相关摄影师）' })
  getOne(
    @Request() req: { user: { id?: number; sub?: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.getOne(id, this.uid(req));
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      '删除定制需求（待接单/已撤销/已确认；已确认会同时删除关联预约订单）',
  })
  remove(
    @Request() req: { user: { id?: number; sub?: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.remove(this.uid(req), id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: '撤销需求（用户）' })
  cancel(
    @Request() req: { user: { id?: number; sub?: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.cancel(this.uid(req), id);
  }

  @Patch(':id/claim')
  @ApiOperation({ summary: '接单（工作人员，待用户确认）' })
  claim(
    @Request() req: { user: { id?: number; sub?: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { claimMessage?: string },
  ) {
    return this.svc.claim(this.uid(req), id, body?.claimMessage);
  }

  @Patch(':id/withdraw-claim')
  @ApiOperation({ summary: '撤回接单（用户确认前）' })
  withdraw(
    @Request() req: { user: { id?: number; sub?: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.withdrawClaim(this.uid(req), id);
  }

  @Patch(':id/confirm-photographer')
  @ApiOperation({ summary: '同意接单摄影师，进入已确认（用户）' })
  confirm(
    @Request() req: { user: { id?: number; sub?: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.confirmPhotographer(this.uid(req), id);
  }

  @Patch(':id/reject-photographer')
  @ApiOperation({ summary: '不同意当前摄影师，需求回到待接单（用户）' })
  reject(
    @Request() req: { user: { id?: number; sub?: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.rejectPhotographer(this.uid(req), id);
  }
}
