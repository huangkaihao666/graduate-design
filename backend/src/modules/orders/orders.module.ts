import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PhotographersModule } from '../photographers/photographers.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [PrismaModule, PhotographersModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
