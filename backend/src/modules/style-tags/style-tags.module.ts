import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { StyleTagsController } from './style-tags.controller';
import { StyleTagsService } from './style-tags.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [StyleTagsController],
  providers: [StyleTagsService],
  exports: [StyleTagsService],
})
export class StyleTagsModule {}
