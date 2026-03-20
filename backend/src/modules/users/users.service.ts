import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

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

  async setActive(id: number, isActive: boolean): Promise<any> {
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
    });
  }

  async resetPassword(id: number, newPassword: string): Promise<any> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
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
    // 注意：
    // - Prisma schema 中已有 avatar 字段（见 prisma/schema.prisma）
    // - 如果本地 Prisma Client 类型还没有 avatar，可以先临时使用 any 绕过类型检查，
    //   后续执行 `pnpm run prisma:generate` 重新生成客户端即可去掉 as any
    return this.prisma.user.update({
      where: { id },
      data: {
        avatar: base64Avatar,
      } as any,
    });
  }
}
