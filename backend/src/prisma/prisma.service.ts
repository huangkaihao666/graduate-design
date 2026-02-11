import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

// 使用 any 类型避免 Prisma 7 导出问题
const { PrismaClient } = require('@prisma/client');

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    // 连接到数据库
    await this.$connect();
  }

  async onModuleDestroy() {
    // 断开数据库连接
    await this.$disconnect();
  }
}
