import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SpotsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 用户端 / 选目的地：公开列表（无需登录） */
  findPublic() {
    return this.prisma.spot.findMany({
      orderBy: [{ recommended: 'desc' }, { city: 'asc' }, { id: 'asc' }],
    });
  }

  findAll() {
    return this.prisma.spot.findMany({ orderBy: { id: 'asc' } });
  }

  async create(data: {
    name: string;
    city: string;
    category: string;
    recommended?: boolean;
  }) {
    return this.prisma.spot.create({
      data: {
        name: data.name,
        city: data.city,
        category: data.category,
        recommended: data.recommended ?? false,
      },
    });
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      city: string;
      category: string;
      recommended: boolean;
    }>,
  ) {
    const before = await this.ensureExists(id);
    const updated = await this.prisma.spot.update({
      where: { id },
      data,
    });
    // 修改城市后，同步所有引用该景点的套餐「目的地」字段
    if (data.city !== undefined && data.city !== before.city) {
      await this.prisma.travelPackage.updateMany({
        where: { spotId: id },
        data: { location: data.city },
      });
    }
    return updated;
  }

  async remove(id: number) {
    await this.ensureExists(id);
    // 仅「已上架」套餐占用目的地时禁止删景点；已下架的套餐不阻止（删除景点后其 spotId 会置空）
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

  private async ensureExists(id: number) {
    const row = await this.prisma.spot.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('景点不存在');
    }
    return row;
  }
}
