import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CANONICAL_STYLE_KEYS,
  CANONICAL_STYLE_TAGS,
} from './canonical-style-tags';

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

  /**
   * 确保六种标准风格存在且名称/排序与预设一致；不删除、不停用管理员新增的其它标签
   */
  async syncCanonical() {
    for (const s of CANONICAL_STYLE_TAGS) {
      await this.prisma.styleTag.upsert({
        where: { key: s.key },
        create: {
          key: s.key,
          name: s.name,
          enabled: true,
          sortOrder: s.sortOrder,
        },
        update: {
          name: s.name,
          sortOrder: s.sortOrder,
        },
      });
    }
    return this.findAll();
  }

  async create(data: {
    key: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    images?: string[] | null;
    enabled?: boolean;
    sortOrder?: number;
  }) {
    const key = data.key.trim();
    if (!key) {
      throw new ConflictException('key 不能为空');
    }
    if (!/^[a-z][a-z0-9_]{0,48}$/i.test(key)) {
      throw new ConflictException(
        'key 需以字母开头，仅含字母、数字、下划线，最长 50',
      );
    }
    const exists = await this.prisma.styleTag.findUnique({ where: { key } });
    if (exists) {
      throw new ConflictException('该 key 已存在');
    }
    const maxOrder = await this.prisma.styleTag.aggregate({
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? 0) + 10;
    return this.prisma.styleTag.create({
      data: {
        key,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        icon: data.icon?.trim() || null,
        sampleImages:
          data.images !== undefined &&
          data.images !== null &&
          data.images.length
            ? (data.images as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        enabled: data.enabled ?? true,
        sortOrder: data.sortOrder ?? nextOrder,
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
      description: string | null;
      icon: string | null;
      images: string[] | null;
    }>,
  ) {
    const existing = await this.ensureExists(id);
    if (data.key !== undefined) {
      if (CANONICAL_STYLE_KEYS.has(existing.key)) {
        throw new BadRequestException('系统预设六种风格的 key 不可修改');
      }
      const k = data.key.trim();
      if (!/^[a-z][a-z0-9_]{0,48}$/i.test(k)) {
        throw new ConflictException(
          'key 需以字母开头，仅含字母、数字、下划线，最长 50',
        );
      }
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
    if (data.description !== undefined) {
      patch.description = data.description?.trim() || null;
    }
    if (data.icon !== undefined) {
      patch.icon = data.icon?.trim() || null;
    }
    if (data.images !== undefined) {
      patch.sampleImages =
        data.images !== null && data.images.length
          ? (data.images as Prisma.InputJsonValue)
          : Prisma.JsonNull;
    }
    return this.prisma.styleTag.update({
      where: { id },
      data: patch,
    });
  }

  async remove(id: number) {
    const row = await this.ensureExists(id);
    if (CANONICAL_STYLE_KEYS.has(row.key)) {
      throw new BadRequestException(
        '系统固定六种风格不可删除，可在列表中关闭「启用」',
      );
    }
    return this.prisma.styleTag.delete({ where: { id } });
  }

  private async ensureExists(id: number) {
    const row = await this.prisma.styleTag.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('风格标签不存在');
    }
    return row;
  }
}
