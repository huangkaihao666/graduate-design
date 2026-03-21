import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SpotsController } from './spots.controller';
import { SpotsService } from './spots.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SpotsController],
  providers: [SpotsService],
  exports: [SpotsService],
})
export class SpotsModule {}
