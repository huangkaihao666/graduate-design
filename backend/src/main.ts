import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  HttpExceptionFilter,
  TransformInterceptor,
  ValidationPipe,
} from './common';
import { appConfig } from './config';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { json, urlencoded } from 'express';

// 加载环境变量
dotenv.config({ path: join(__dirname, '../.env') });

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
  console.log(
    `🚀 Application is running on: http://localhost:${appConfig.port}/api/v1`,
  );
  console.log(
    `📚 Swagger API 文档: http://localhost:${appConfig.port}/api/docs`,
  );
}

bootstrap();
