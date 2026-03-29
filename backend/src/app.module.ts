import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminInsightsModule } from './modules/admin-insights/admin-insights.module';
import { CustomShootRequestsModule } from './modules/custom-shoot-requests/custom-shoot-requests.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { HealthModule } from './modules/health/health.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PackagesModule } from './modules/packages/packages.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PhotographersModule } from './modules/photographers/photographers.module';
import { SpotsModule } from './modules/spots/spots.module';
import { StyleTagsModule } from './modules/style-tags/style-tags.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AdminInsightsModule,
    CustomShootRequestsModule,
    UsersModule,
    AuthModule,
    AiModule,
    FavoritesModule,
    OrdersModule,
    SpotsModule,
    StyleTagsModule,
    PackagesModule,
    PhotographersModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
