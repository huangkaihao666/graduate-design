import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PhotographersModule } from '../photographers/photographers.module';
import { CustomShootRequestsController } from './custom-shoot-requests.controller';
import { CustomShootRequestsService } from './custom-shoot-requests.service';

@Module({
  imports: [PrismaModule, PhotographersModule],
  controllers: [CustomShootRequestsController],
  providers: [CustomShootRequestsService],
})
export class CustomShootRequestsModule {}
