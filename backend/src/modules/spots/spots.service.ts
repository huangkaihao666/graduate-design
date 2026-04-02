import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SpotsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 用户端 / 选目的地：公开列表（无需登录） */
  findPublic() {
    return this.prisma.spot.findMany({
      orderBy: [
        { recommended: 'desc' },
        { city: { name: 'asc' } },
        { id: 'asc' },
      ],
      include: { city: true },
    });
  }

  findAll() {
    return this.prisma.spot.findMany({
      orderBy: [{ city: { name: 'asc' } }, { id: 'asc' }],
      include: { city: true },
    });
  }

  async create(data: {
    name: string;
    cityId: number;
    category: string;
    description?: string | null;
    images?: string[] | null;
    recommended?: boolean;
  }) {
    await this.ensureCityExists(data.cityId);
    return this.prisma.spot.create({
      data: {
        name: data.name,
        cityId: data.cityId,
        category: data.category,
        description: data.description?.trim() || null,
        images:
          data.images !== undefined && data.images !== null
            ? (data.images as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        recommended: data.recommended ?? false,
      },
      include: { city: true },
    });
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      cityId: number;
      category: string;
      description: string | null;
      images: string[] | null;
      recommended: boolean;
    }>,
  ) {
    const before = await this.ensureExists(id);
    if (data.cityId !== undefined) {
      await this.ensureCityExists(data.cityId);
    }
    const updated = await this.prisma.spot.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.cityId !== undefined && { cityId: data.cityId }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.description !== undefined && {
          description: data.description?.trim() || null,
        }),
        ...(data.images !== undefined && {
          images:
            data.images !== null && data.images.length
              ? (data.images as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        }),
        ...(data.recommended !== undefined && {
          recommended: data.recommended,
        }),
      },
      include: { city: true },
    });
    const cityChanged =
      data.cityId !== undefined && data.cityId !== before.cityId;
    if (cityChanged) {
      const loc = updated.city.name;
      await this.prisma.travelPackage.updateMany({
        where: { spotId: id },
        data: { location: loc },
      });
    }
    return updated;
  }

  async remove(id: number) {
    await this.ensureExists(id);
    const publishedCount = await this.prisma.travelPackage.count({
      where: { spotId: id, status: 'published' },
    });
    if (publishedCount > 0) {
      throw new BadRequestException(
        `该景点仍有 ${publishedCount} 个已上架套餐，请先在「套餐管理」中将相关套餐下架后再删除景点`,
      );
    }
    return this.prisma.spot.delete({ where: { id } });
  }

  // --- 城市 ---

  findAllCities() {
    return this.prisma.city.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { spots: true } } },
    });
  }

  async createCity(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('城市名称不能为空');
    }
    return this.prisma.city.create({
      data: { name: trimmed },
    });
  }

  async updateCity(id: number, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('城市名称不能为空');
    }
    const before = await this.ensureCityRow(id);
    if (before.name === trimmed) {
      return before;
    }
    const updated = await this.prisma.city.update({
      where: { id },
      data: { name: trimmed },
    });
    await this.prisma.travelPackage.updateMany({
      where: { spot: { cityId: id } },
      data: { location: trimmed },
    });
    return updated;
  }

  async removeCity(id: number) {
    await this.ensureCityRow(id);
    const count = await this.prisma.spot.count({ where: { cityId: id } });
    if (count > 0) {
      throw new BadRequestException(
        `该城市下仍有 ${count} 个景点，请先删除或迁移景点后再删除城市`,
      );
    }
    return this.prisma.city.delete({ where: { id } });
  }

  private async ensureExists(id: number) {
    const row = await this.prisma.spot.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('景点不存在');
    }
    return row;
  }

  private async ensureCityExists(id: number) {
    const row = await this.prisma.city.findUnique({ where: { id } });
    if (!row) {
      throw new BadRequestException('所选城市不存在');
    }
    return row;
  }

  private async ensureCityRow(id: number) {
    const row = await this.prisma.city.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('城市不存在');
    }
    return row;
  }
}
