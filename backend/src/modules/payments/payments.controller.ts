import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('online/prepay')
  @ApiOperation({ summary: '在线支付：生成二维码（微信 Native 或落地页）' })
  async prepay(
    @Body() body: { orderId: number; channel: 'wechat' | 'alipay' },
  ) {
    const orderId = Number(body.orderId);
    const channel = body.channel === 'alipay' ? 'alipay' : 'wechat';
    if (!orderId || Number.isNaN(orderId)) {
      throw new BadRequestException('orderId 无效');
    }
    return this.paymentsService.createOnlinePrepay(orderId, channel);
  }

  @Get('online/status/:orderNo')
  @ApiOperation({ summary: '查询支付状态（轮询）' })
  async status(@Param('orderNo') orderNo: string) {
    return this.paymentsService.getOnlinePaymentStatus(orderNo);
  }

  @Post('online/demo-complete')
  @ApiOperation({
    summary:
      '演示：标记在线订单已支付（无需真实支付，用于二维码页「我已完成支付」）',
  })
  async demoComplete(@Body() body: { orderNo: string }) {
    if (!body?.orderNo || typeof body.orderNo !== 'string') {
      throw new BadRequestException('orderNo 必填');
    }
    return this.paymentsService.demoCompletePayment(body.orderNo.trim());
  }

  @Get('online/landing-summary')
  @ApiOperation({ summary: '落地页扫码后订单摘要（签名校验）' })
  async landingSummary(
    @Query('orderNo') orderNo: string,
    @Query('ts') ts: string,
    @Query('sign') sign: string,
  ) {
    return this.paymentsService.getLandingSummary(orderNo, ts, sign);
  }

  @Post('online/landing-confirm')
  @ApiOperation({ summary: '落地页确认支付（演示）' })
  async landingConfirm(
    @Body() body: { orderNo: string; ts: string; sign: string },
  ) {
    return this.paymentsService.confirmLandingPayment(
      body.orderNo,
      body.ts,
      body.sign,
    );
  }
}
