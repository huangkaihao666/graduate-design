import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: '创建预约订单' })
  create(@Body() body: Record<string, unknown>) {
    return this.ordersService.create({
      ...body,
      paidAt: body.paidAt ? new Date(body.paidAt as string | Date) : null,
    } as Prisma.BookingOrderCreateInput);
  }

  @Get()
  @ApiOperation({ summary: '获取订单列表（管理员）' })
  findAll() {
    return this.ordersService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('user/me')
  @ApiOperation({ summary: '当前登录用户获取自己的订单列表' })
  findForCurrentUser(@Request() req: { user: { sub: number } }) {
    return this.ordersService.findForUser(req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('worker')
  @ApiOperation({
    summary:
      '工作人员获取本人相关订单（演示账号未绑定摄影师=全部；已绑定=仅该摄影师/本人接单）',
  })
  findForWorker(@Request() req: { user: { id: number } }) {
    return this.ordersService.findForWorkerUser(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('worker/:id/take')
  @ApiOperation({ summary: '工作人员确认接单（绑定订单到当前工作人员）' })
  takeForWorker(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.takeForWorkerUser(req.user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('worker/:id/reschedule')
  @ApiOperation({ summary: '工作人员修改拍摄时间（改期）' })
  rescheduleForWorker(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newShootingDate: string; note?: string },
  ) {
    return this.ordersService.rescheduleForWorkerUser(req.user.id, id, body);
  }

  @Get('photographers/:id/booked-dates')
  @ApiOperation({ summary: '获取摄影师已被预约的日期列表' })
  getBookedDatesByPhotographer(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getBookedDatesByPhotographer(id);
  }

  @Patch(':id/reschedule-request')
  @ApiOperation({ summary: '用户发起改期申请（免费一次，拍摄日前3天）' })
  requestReschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newShootingDate: string; reason?: string },
  ) {
    return this.ordersService.requestReschedule(id, body);
  }

  @Patch(':id/reschedule-review')
  @ApiOperation({ summary: '管理员审批改期申请（通过/驳回）' })
  reviewRescheduleRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { action: 'approve' | 'reject'; reviewNote?: string },
  ) {
    return this.ordersService.reviewRescheduleRequest(id, body);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新订单状态（管理员）' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
  ) {
    return this.ordersService.updateStatus(id, body.status);
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: '管理员看板统计数据' })
  getDashboardStats() {
    return this.ordersService.getDashboardStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个订单详情' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findById(id);
  }
}
