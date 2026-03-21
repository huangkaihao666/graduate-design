import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x));
  }
  return [];
}

type TravelPackageWithSpot = Prisma.TravelPackageGetPayload<{
  include: { spot: true };
}>;

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapRow(row: TravelPackageWithSpot) {
    return {
      id: row.id,
      spotId: row.spotId,
      name: row.name,
      description: row.description ?? '',
      price: row.price,
      originalPrice: row.originalPrice ?? undefined,
      duration: row.duration,
      location: row.location,
      spotName: row.spot?.name,
      style: row.style,
      coverImage: row.coverImage ?? '',
      images: asStringArray(row.images),
      features: asStringArray(row.features),
      includes: asStringArray(row.includes),
      excludes: asStringArray(row.excludes),
      maxPeople: row.maxPeople,
      isPopular: row.isPopular,
      isHot: row.isHot,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** 用户端：仅已上架 */
  async findPublishedList() {
    const rows = await this.prisma.travelPackage.findMany({
      where: { status: 'published' },
      orderBy: { id: 'asc' },
      include: { spot: true },
    });
    const items = rows.map((r) => this.mapRow(r));
    return {
      items,
      pagination: {
        page: 1,
        pageSize: items.length,
        total: items.length,
        totalPages: 1,
      },
    };
  }

  /** 管理端：全部套餐 */
  async findAllAdmin() {
    const rows = await this.prisma.travelPackage.findMany({
      orderBy: { id: 'asc' },
      include: { spot: true },
    });
    return rows.map((r) => this.mapRow(r));
  }

  async findOnePublic(id: number) {
    const row = await this.prisma.travelPackage.findUnique({
      where: { id },
      include: { spot: true },
    });
    if (!row || row.status !== 'published') {
      throw new NotFoundException('套餐不存在或已下架');
    }
    return this.mapRow(row);
  }

  async create(data: {
    spotId: number;
    name: string;
    style: string;
    price: number;
    description?: string;
    duration?: number;
    coverImage?: string;
    images?: string[];
    features?: string[];
    includes?: string[];
    excludes?: string[];
    maxPeople?: number;
    originalPrice?: number | null;
    isPopular?: boolean;
    isHot?: boolean;
    status?: string;
  }) {
    const spot = await this.prisma.spot.findUnique({
      where: { id: data.spotId },
    });
    if (!spot) {
      throw new BadRequestException(
        '无效的景点，请先选择「景点管理」中的目的地',
      );
    }
    const row = await this.prisma.travelPackage.create({
      data: {
        spotId: data.spotId,
        location: spot.city,
        name: data.name,
        style: data.style,
        price: data.price,
        description: data.description ?? '',
        duration: data.duration ?? 1,
        coverImage: data.coverImage ?? '',
        images: data.images ?? [],
        features: data.features ?? [],
        includes: data.includes ?? [],
        excludes: data.excludes ?? [],
        maxPeople: data.maxPeople ?? 2,
        originalPrice: data.originalPrice ?? null,
        isPopular: data.isPopular ?? false,
        isHot: data.isHot ?? false,
        status: data.status ?? 'published',
      },
      include: { spot: true },
    });
    return this.mapRow(row);
  }

  async update(
    id: number,
    data: Partial<{
      spotId: number;
      name: string;
      style: string;
      price: number;
      description: string;
      duration: number;
      coverImage: string;
      images: string[];
      features: string[];
      includes: string[];
      excludes: string[];
      maxPeople: number;
      originalPrice: number | null;
      isPopular: boolean;
      isHot: boolean;
      status: string;
    }>,
  ) {
    await this.ensureExists(id);
    const updateData: Record<string, unknown> = { ...data };
    delete updateData.location;

    if (data.spotId !== undefined) {
      const spot = await this.prisma.spot.findUnique({
        where: { id: data.spotId },
      });
      if (!spot) {
        throw new BadRequestException(
          '无效的景点，请先选择「景点管理」中的目的地',
        );
      }
      updateData.spotId = data.spotId;
      updateData.location = spot.city;
    }

    const row = await this.prisma.travelPackage.update({
      where: { id },
      data: updateData as Prisma.TravelPackageUpdateInput,
      include: { spot: true },
    });
    return this.mapRow(row);
  }

  async toggleStatus(id: number) {
    const row = await this.prisma.travelPackage.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('套餐不存在');
    }
    const next = row.status === 'published' ? 'offline' : 'published';
    const updated = await this.prisma.travelPackage.update({
      where: { id },
      data: { status: next },
      include: { spot: true },
    });
    return this.mapRow(updated);
  }

  private async ensureExists(id: number) {
    const row = await this.prisma.travelPackage.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('套餐不存在');
    }
  }
}
