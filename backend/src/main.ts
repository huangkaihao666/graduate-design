import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';

// 确保 backend/.env 在 Nest 启动时加载（含 COZE_API_KEY 等）
loadEnv({ path: resolve(__dirname, '../.env') });

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  HttpExceptionFilter,
  TransformInterceptor,
  ValidationPipe,
} from './common';
import { appConfig } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  // 增加请求体大小限制（支持 Base64 图片上传）
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '10mb' }));

  // Enable CORS - 支持多个开发端口
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
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

  // Set global prefix（在 Swagger 之后，但排除 socket.io）
  app.setGlobalPrefix('api/v1', {
    exclude: ['/socket.io/*path'],
  });

  await app.listen(appConfig.port);

  console.log(
    `🚀 Application is running on: http://localhost:${appConfig.port}/api/v1`,
  );
  console.log(
    `📚 Swagger API 文档: http://localhost:${appConfig.port}/api/docs`,
  );
  console.log(`🔌 WebSocket 服务: ws://localhost:${appConfig.port}/socket.io/`);
}

bootstrap();
