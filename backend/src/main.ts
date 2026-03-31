import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { INestApplication } from '@nestjs/common';
import {
  HttpExceptionFilter,
  TransformInterceptor,
  ValidationPipe,
} from './common';
import { appConfig } from './config';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { json, urlencoded } from 'express';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma/prisma.service';

// 加载环境变量
dotenv.config({ path: join(__dirname, '../.env') });

async function seedDevAccounts(app: INestApplication) {
  // 只在开发环境/未显式关闭时执行，避免影响生产
  const env = String(process.env.NODE_ENV || '').toLowerCase();
  const seedEnabled =
    String(process.env.DEV_SEED_ACCOUNTS || 'true').toLowerCase() !== 'false';
  if (env === 'production' || !seedEnabled) return;

  const prisma = app.get(PrismaService);

  // 需求：妆造师账号 hzs@qq.com / 123456
  const email = 'hzs@qq.com';
  const passwordPlain = '123456';
  const name = '妆造师';

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, workerPhotographerId: true },
  });
  if (existing) return;

  const hashed = await bcrypt.hash(passwordPlain, 10);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name,
        password: hashed,
        role: 'worker',
        workerKind: 'makeup',
      },
      select: { id: true },
    });

    // 当前系统的工作人员工作台与审核逻辑依赖 photographer 档案，因此这里同时创建一份 draft 档案
    const ph = await tx.photographer.create({
      data: {
        name,
        shootingStyle: '（妆造师：请在个人中心补充擅长风格）',
        yearsExperience: 0,
        portfolioImages: [] as unknown as Prisma.InputJsonValue,
        availableDates: [] as unknown as Prisma.InputJsonValue,
        restDates: [] as unknown as Prisma.InputJsonValue,
        enabled: false,
        approvalStatus: 'draft',
        approvalReviewNote: null,
        sortOrder: 999,
      },
      select: { id: true },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { workerPhotographerId: ph.id },
      select: { id: true },
    });
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 配置请求体大小限制，支持 Base64 图片上传（默认 1MB，增加到 50MB）
  // Base64 编码会使图片大小增加约 33%，所以需要更大的限制
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global pipes
  app.useGlobalPipes(new ValidationPipe());

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger API 文档配置（在设置全局前缀之前）
  const config = new DocumentBuilder()
    .setTitle('毕业设计项目 API')
    .setDescription('RESTful API 接口文档')
    .setVersion('1.0.0')
    .addTag('Health', '健康检查')
    .addTag('Users', '用户管理')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Set global prefix（在 Swagger 之后）
  app.setGlobalPrefix('api/v1');

  await app.listen(appConfig.port);
  await seedDevAccounts(app);
  console.log(
    `🚀 Application is running on: http://localhost:${appConfig.port}/api/v1`,
  );
  console.log(
    `📚 Swagger API 文档: http://localhost:${appConfig.port}/api/docs`,
  );
}

void bootstrap();
