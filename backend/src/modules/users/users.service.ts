import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  phone: true,
  password: true,
  avatar: true,
  isActive: true,
  role: true,
  workerKind: true,
  workerPhotographerId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type UserTableRow = Prisma.UserGetPayload<{ select: typeof userTableSelect }>;

/** 返回给前端的用户信息（不含密码） */
const userSafeSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  avatar: true,
  isActive: true,
  role: true,
  workerKind: true,
  workerPhotographerId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

/** 与 multer 内存上传字段一致（避免 Express.Multer 在 ESLint 中解析失败） */
export type AvatarUploadFile = {
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(
    createUserDto: CreateUserDto & { password: string },
  ): Promise<any> {
    return this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: createUserDto.password,
        avatar: createUserDto.avatar,
      },
      select: userSafeSelect,
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
      select: userSafeSelect,
    });
  }

  async remove(id: number): Promise<any> {
    return this.prisma.user.delete({
      where: { id },
      select: userSafeSelect,
    });
  }

  /**
   * 管理员删除工作人员：先解绑 workerPhotographerId、删除 photographers 档案，再删用户。
   */
  async removeWorkerAccount(id: number): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, workerPhotographerId: true },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (String(user.role || '').toLowerCase() !== 'worker') {
      throw new BadRequestException('仅可删除工作人员账号');
    }
    const phId = user.workerPhotographerId;
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id },
          data: { workerPhotographerId: null },
        });
        if (phId != null) {
          await tx.photographer.delete({ where: { id: phId } });
        }
        await tx.user.delete({ where: { id } });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003' || e.code === 'P2014') {
          throw new BadRequestException(
            '该工作人员仍有关联数据，无法删除，请先处理订单等业务后再试',
          );
        }
      }
      throw e;
    }
    return { ok: true };
  }

  async setActive(id: number, isActive: boolean): Promise<any> {
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: userSafeSelect,
    });
  }

  async resetPassword(id: number, newPassword: string): Promise<any> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
      select: { id: true },
    });
  }

  /** 当前登录用户绑定手机号（11 位中国大陆号） */
  async bindPhone(userId: number, phone: string) {
    const normalized = phone.trim();
    if (!/^1[3-9]\d{9}$/.test(normalized)) {
      throw new BadRequestException('请输入有效的手机号');
    }
    try {
      const dup = await this.prisma.user.findFirst({
        where: { phone: normalized, NOT: { id: userId } },
        select: { id: true },
      });
      if (dup) {
        throw new BadRequestException('该手机号已被其他账号绑定');
      }
      return this.prisma.user.update({
        where: { id: userId },
        data: { phone: normalized },
        select: userSafeSelect,
      });
    } catch (e: unknown) {
      // 数据库尚未执行 phone 列迁移时，给出明确提示而不是 500
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        String((e as { code?: string }).code) === 'P2022'
      ) {
        throw new BadRequestException(
          '数据库缺少 users.phone 字段，请先执行手机号迁移（ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL）',
        );
      }
      throw e;
    }
  }

  async uploadAvatar(
    id: number,
    file: AvatarUploadFile | undefined,
  ): Promise<any> {
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
      select: userSafeSelect,
    });
  }
}
