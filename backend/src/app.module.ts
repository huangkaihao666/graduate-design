import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { AgentsModule } from './modules/agents/agents.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TagsModule } from './modules/tags/tags.module';
import { CounselingModule } from './modules/counseling/counseling.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    RoomsModule,
    AgentsModule,
    AdminModule,
    NotificationsModule,
    TagsModule,
    CounselingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
