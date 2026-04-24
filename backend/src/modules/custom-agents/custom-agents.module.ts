import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CustomAgentsController } from './custom-agents.controller';
import { CustomAgentsService } from './custom-agents.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [
    PrismaModule,
    RoomsModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [CustomAgentsController],
  providers: [CustomAgentsService],
  exports: [CustomAgentsService],
})
export class CustomAgentsModule {}
