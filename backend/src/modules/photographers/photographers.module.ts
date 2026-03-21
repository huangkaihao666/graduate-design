import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { PhotographersController } from './photographers.controller';
import { PhotographersService } from './photographers.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [PhotographersController],
  providers: [PhotographersService],
  exports: [PhotographersService],
})
export class PhotographersModule {}
