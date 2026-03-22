import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WechatPayV3Service } from './wechat-pay-v3.service';

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, WechatPayV3Service],
  exports: [PaymentsService],
})
export class PaymentsModule {}
