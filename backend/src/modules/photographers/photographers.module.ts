import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PhotographersController } from './photographers.controller';
import { PhotographersService } from './photographers.service';

@Module({
  imports: [PrismaModule],
  controllers: [PhotographersController],
  providers: [PhotographersService],
  exports: [PhotographersService],
})
export class PhotographersModule {}
