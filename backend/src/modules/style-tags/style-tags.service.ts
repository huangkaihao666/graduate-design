import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StyleTagsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 用户端：仅启用的标签 */
  findEnabled() {
    return this.prisma.styleTag.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  /** 管理端：全部 */
  findAll() {
    return this.prisma.styleTag.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
  }

  async create(data: {
    key: string;
    name: string;
    enabled?: boolean;
    sortOrder?: number;
  }) {
    const key = data.key.trim();
    if (!key) {
      throw new ConflictException('key 不能为空');
    }
    const exists = await this.prisma.styleTag.findUnique({ where: { key } });
    if (exists) {
      throw new ConflictException('该 key 已存在');
    }
    return this.prisma.styleTag.create({
      data: {
        key,
        name: data.name.trim(),
        enabled: data.enabled ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      enabled: boolean;
      sortOrder: number;
      key: string;
    }>,
  ) {
    await this.ensureExists(id);
    if (data.key !== undefined) {
      const k = data.key.trim();
      const dup = await this.prisma.styleTag.findFirst({
        where: { key: k, NOT: { id } },
      });
      if (dup) {
        throw new ConflictException('该 key 已存在');
      }
    }
    const patch: Record<string, unknown> = {};
    if (data.key !== undefined) patch.key = data.key.trim();
    if (data.name !== undefined) patch.name = data.name.trim();
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    return this.prisma.styleTag.update({
      where: { id },
      data: patch,
    });
  }

  async remove(id: number) {
    await this.ensureExists(id);
    return this.prisma.styleTag.delete({ where: { id } });
  }

  private async ensureExists(id: number) {
    const row = await this.prisma.styleTag.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('风格标签不存在');
    }
  }
}
