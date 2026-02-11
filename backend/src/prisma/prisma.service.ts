import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
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
