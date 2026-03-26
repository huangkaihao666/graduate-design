import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

/**
 * 只查询当前数据库里已存在的列。
 * 若 Prisma schema 与数据库不同步（例如 schema 多了未迁移的字段），
 * 不带 select 的 findUnique 会触发 P2022，JWT 等接口会 500。
 */
const userTableSelect = {
  id: true,
  email: true,
  name: true,
  password: true,
  avatar: true,
  isActive: true,
  role: true,
  workerPhotographerId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type UserTableRow = Prisma.UserGetPayload<{ select: typeof userTableSelect }>;

/** 与 multer 内存上传字段一致（避免 Express.Multer 在 ESLint 中解析失败） */
export type AvatarUploadFile = {
  mimetype: string;
  size: number;
  buffer: Buffer;
};

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
    return this.prisma.user.findMany({
      select: userTableSelect,
    });
  }

  async findOne(id: number): Promise<UserTableRow | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: userTableSelect,
    });
  }

  async findByEmail(email: string): Promise<UserTableRow | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: userTableSelect,
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

  async uploadAvatar(
    id: number,
    file: AvatarUploadFile | undefined,
  ): Promise<User> {
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

    return this.prisma.user.update({
      where: { id },
      data: {
        avatar: base64Avatar,
      },
    });
  }
}
