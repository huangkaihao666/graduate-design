import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CitiesController } from './cities.controller';
import { SpotsController } from './spots.controller';
import { SpotsService } from './spots.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SpotsController, CitiesController],
  providers: [SpotsService],
  exports: [SpotsService],
})
export class SpotsModule {}
