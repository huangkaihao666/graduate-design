import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CityRegion, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SpotsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 用户端 / 选目的地：公开列表（无需登录） */
  async findPublic() {
    const rows = await this.prisma.spot.findMany({
      include: { city: true },
    });
    return rows.sort((a, b) => {
      if (a.recommended !== b.recommended) {
        return (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0);
      }
      const an = a.city?.name ?? '';
      const bn = b.city?.name ?? '';
      if (an !== bn) return an.localeCompare(bn, 'zh-Hans-CN');
      return a.id - b.id;
    });
  }

  private static sortSpotsByCityNameAndId<
    T extends { id: number; city: { name: string } | null },
  >(rows: T[]): T[] {
    return [...rows].sort((a, b) => {
      const an = a.city?.name ?? '';
      const bn = b.city?.name ?? '';
      if (an !== bn) return an.localeCompare(bn, 'zh-Hans-CN');
      return a.id - b.id;
    });
  }

  /**
   * 管理员全量列表。
   * 不在 SQL 里按 city.name 排序：景点含大图 JSON，MySQL 关联排序易触发 Out of sort memory（1038）。
   */
  async findAll() {
    const rows = await this.prisma.spot.findMany({
      include: { city: true },
    });
    return SpotsService.sortSpotsByCityNameAndId(rows);
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

  private parseCityRegion(
    input: string | undefined,
    fallback: CityRegion,
  ): CityRegion {
    if (input === undefined || input === null) return fallback;
    return input === 'international'
      ? CityRegion.international
      : CityRegion.domestic;
  }

  async createCity(name: string, regionInput?: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('城市名称不能为空');
    }
    const region = this.parseCityRegion(regionInput, CityRegion.domestic);
    try {
      return await this.prisma.city.create({
        data: { name: trimmed, region },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException('该城市已存在，无需重复新增');
      }
      throw e;
    }
  }

  async updateCity(id: number, dto: { name: string; region?: string }) {
    const trimmed = dto.name.trim();
    if (!trimmed) {
      throw new BadRequestException('城市名称不能为空');
    }
    const before = await this.ensureCityRow(id);
    const nextRegion =
      dto.region === undefined
        ? before.region
        : this.parseCityRegion(dto.region, before.region);
    if (before.name === trimmed && before.region === nextRegion) {
      return before;
    }
    const updated = await this.prisma.city.update({
      where: { id },
      data: { name: trimmed, region: nextRegion },
    });
    if (before.name !== trimmed) {
      await this.prisma.travelPackage.updateMany({
        where: { spot: { cityId: id } },
        data: { location: trimmed },
      });
    }
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
