import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x));
  }
  return [];
}

type PhotographerRow = {
  id: number;
  name: string;
  title: string | null;
  avatar: string | null;
  shootingStyle: string;
  yearsExperience: number;
  bio: string | null;
  portfolioImages: unknown;
  sortOrder: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PhotographersService {
  constructor(private readonly prisma: PrismaService) {}

  private mapPublic(row: PhotographerRow) {
    return {
      id: row.id,
      name: row.name,
      title: row.title ?? undefined,
      avatar: row.avatar ?? undefined,
      shootingStyle: row.shootingStyle,
      yearsExperience: row.yearsExperience,
      bio: row.bio ?? undefined,
      portfolioImages: asStringArray(row.portfolioImages),
      sortOrder: row.sortOrder,
    };
  }

  /** 用户端：仅启用 */
  async findPublic() {
    const rows = await this.prisma.photographer.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map((r) => this.mapPublic(r));
  }

  async findOnePublic(id: number) {
    const row = await this.prisma.photographer.findFirst({
      where: { id, enabled: true },
    });
    if (!row) {
      throw new NotFoundException('摄影师不存在或已下架');
    }
    return this.mapPublic(row);
  }

  async findAllAdmin() {
    const rows = await this.prisma.photographer.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map((r) => ({
      ...this.mapPublic(r),
      enabled: r.enabled,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async create(data: {
    name: string;
    title?: string;
    avatar?: string;
    shootingStyle: string;
    yearsExperience?: number;
    bio?: string;
    portfolioImages?: string[];
    sortOrder?: number;
    enabled?: boolean;
  }) {
    const portfolioImages = data.portfolioImages?.length
      ? data.portfolioImages
      : [];
    return this.prisma.photographer.create({
      data: {
        name: data.name,
        title: data.title,
        avatar: data.avatar,
        shootingStyle: data.shootingStyle,
        yearsExperience: data.yearsExperience ?? 0,
        bio: data.bio,
        portfolioImages: portfolioImages as unknown as Prisma.InputJsonValue,
        sortOrder: data.sortOrder ?? 0,
        enabled: data.enabled ?? true,
      },
    });
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      title: string | null;
      avatar: string | null;
      shootingStyle: string;
      yearsExperience: number;
      bio: string | null;
      portfolioImages: string[];
      sortOrder: number;
      enabled: boolean;
    }>,
  ) {
    await this.ensureExists(id);
    const patch: Prisma.PhotographerUpdateInput = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.title !== undefined) patch.title = data.title;
    if (data.avatar !== undefined) patch.avatar = data.avatar;
    if (data.shootingStyle !== undefined)
      patch.shootingStyle = data.shootingStyle;
    if (data.yearsExperience !== undefined) {
      patch.yearsExperience = data.yearsExperience;
    }
    if (data.bio !== undefined) patch.bio = data.bio;
    if (data.portfolioImages !== undefined) {
      patch.portfolioImages =
        data.portfolioImages as unknown as Prisma.InputJsonValue;
    }
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    if (data.enabled !== undefined) patch.enabled = data.enabled;

    return this.prisma.photographer.update({
      where: { id },
      data: patch,
    });
  }

  async remove(id: number) {
    await this.ensureExists(id);
    await this.prisma.photographer.delete({ where: { id } });
  }

  private async ensureExists(id: number) {
    const row = await this.prisma.photographer.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('摄影师不存在');
    }
  }
}
