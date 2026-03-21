import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AiModule } from './modules/ai/ai.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SpotsModule } from './modules/spots/spots.module';
import { StyleTagsModule } from './modules/style-tags/style-tags.module';
import { PackagesModule } from './modules/packages/packages.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    AiModule,
    FavoritesModule,
    OrdersModule,
    SpotsModule,
    StyleTagsModule,
    PackagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
