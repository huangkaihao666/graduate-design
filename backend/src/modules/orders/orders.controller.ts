import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: '创建预约订单' })
  create(@Body() body: any) {
    return this.ordersService.create({
      ...body,
      paidAt: body.paidAt ? new Date(body.paidAt) : null,
    });
  }

  @Get()
  @ApiOperation({ summary: '获取订单列表（管理员）' })
  findAll() {
    return this.ordersService.findAll();
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
}
