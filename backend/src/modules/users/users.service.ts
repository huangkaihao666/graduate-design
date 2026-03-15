import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<any> {
    return this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: createUserDto.password,
      },
    });
  }

  async findAll(): Promise<any[]> {
    return this.prisma.user.findMany();
  }

  async findOne(id: number): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: number, updateData: Partial<CreateUserDto>): Promise<any> {
    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: number): Promise<any> {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async uploadAvatar(id: number, file: any): Promise<any> {
    if (!file) {
      throw new BadRequestException('未上传文件');
    }

    // 验证文件类型
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('只能上传图片文件');
    }

    // 验证文件大小（5MB）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('图片大小不能超过 5MB');
    }

    // 将文件转换为Base64
    const base64Avatar = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    // 更新用户头像
    // 注意：Prisma schema 中已有 avatar 字段，如果报错请运行 pnpm run prisma:generate
    return this.prisma.user.update({
      where: { id },
      data: {
        avatar: base64Avatar,
      },
    });
  }
}
