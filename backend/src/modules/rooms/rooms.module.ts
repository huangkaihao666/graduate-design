import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { RoomsGateway } from './rooms.gateway';
import { CozeService } from './coze.service';
import { DebateService } from './debate.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [RoomsService, RoomsGateway, CozeService, DebateService],
  controllers: [RoomsController],
  exports: [RoomsService, RoomsGateway, DebateService],
})
export class RoomsModule {}
