import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tag.findMany({
      orderBy: [{ weight: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        color: true,
        weight: true,
        _count: { select: { rooms: true } },
      },
    });
  }

  async create(dto: CreateTagDto) {
    const exists = await this.prisma.tag.findUnique({
      where: { name: dto.name },
    });
    if (exists) throw new ConflictException(`标签"${dto.name}"已存在`);
    return this.prisma.tag.create({
      data: {
        name: dto.name,
        color: dto.color ?? '#999999',
        weight: dto.weight ?? 0,
      },
    });
  }

  async update(id: number, dto: UpdateTagDto) {
    await this.findOneOrFail(id);
    if (dto.name) {
      const exists = await this.prisma.tag.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (exists) throw new ConflictException(`标签"${dto.name}"已存在`);
    }
    return this.prisma.tag.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOneOrFail(id);
    await this.prisma.tag.delete({ where: { id } });
    return { success: true };
  }

  private async findOneOrFail(id: number) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException(`标签 ${id} 不存在`);
    return tag;
  }
}
