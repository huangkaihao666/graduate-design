import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { RoomsModule } from '@/modules/rooms/rooms.module';
import { CustomAgentsModule } from '@/modules/custom-agents/custom-agents.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule, RoomsModule, CustomAgentsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
