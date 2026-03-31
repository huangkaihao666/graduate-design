import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.usersService.findByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new BadRequestException('用户已存在');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const registrationType =
      createUserDto.registrationType ??
      (createUserDto.registerAsPhotographer ? 'photographer' : 'user');

    if (registrationType === 'photographer') {
      return this.registerPhotographer(createUserDto, hashedPassword);
    }
    if (registrationType === 'makeup') {
      return this.registerMakeupArtist(createUserDto, hashedPassword);
    }

    const user = await this.usersService.create({
      name: createUserDto.name,
      email: createUserDto.email,
      password: hashedPassword,
      avatar: createUserDto.avatar,
    });

    const tokens = this.generateTokens(user.id);
    const payloadUser = await this.buildAuthUserPayload(user.id);

    return {
      statusCode: 201,
      message: '注册成功',
      data: {
        user: payloadUser,
        ...tokens,
      },
    };
  }

  private async registerPhotographer(
    dto: CreateUserDto,
    hashedPassword: string,
  ) {
    const shootingStyle =
      (dto.shootingStyleForPhotographer || '').trim() ||
      '（请登录后在「个人资料」中补充拍摄风格说明）';

    const newUserId = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          role: 'worker',
          workerKind: 'photographer',
        },
      });

      const ph = await tx.photographer.create({
        data: {
          name: dto.name,
          shootingStyle,
          yearsExperience: 0,
          portfolioImages: [] as unknown as Prisma.InputJsonValue,
          availableDates: [] as unknown as Prisma.InputJsonValue,
          restDates: [] as unknown as Prisma.InputJsonValue,
          enabled: false,
          approvalStatus: 'draft',
          approvalReviewNote: null,
          sortOrder: 999,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { workerPhotographerId: ph.id },
      });

      return user.id;
    });

    const tokens = this.generateTokens(newUserId);
    const payloadUser = await this.buildAuthUserPayload(newUserId);

    return {
      statusCode: 201,
      message: '摄影师账号已创建，请完善资料并提交管理员审核',
      data: {
        user: payloadUser,
        ...tokens,
      },
    };
  }

  private async registerMakeupArtist(
    dto: CreateUserDto,
    hashedPassword: string,
  ) {
    const shootingStyle =
      (dto.shootingStyleForPhotographer || '').trim() ||
      '（化妆师：请在个人中心补充擅长风格）';

    const newUserId = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          role: 'worker',
          workerKind: 'makeup',
        },
      });

      const ph = await tx.photographer.create({
        data: {
          name: dto.name,
          shootingStyle,
          yearsExperience: 0,
          portfolioImages: [] as unknown as Prisma.InputJsonValue,
          availableDates: [] as unknown as Prisma.InputJsonValue,
          restDates: [] as unknown as Prisma.InputJsonValue,
          enabled: false,
          approvalStatus: 'draft',
          approvalReviewNote: null,
          sortOrder: 999,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { workerPhotographerId: ph.id },
      });

      return user.id;
    });

    const tokens = this.generateTokens(newUserId);
    const payloadUser = await this.buildAuthUserPayload(newUserId);

    return {
      statusCode: 201,
      message: '化妆师账号已创建，请完善资料并提交管理员审核',
      data: {
        user: payloadUser,
        ...tokens,
      },
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const tokens = this.generateTokens(user.id);
    const payloadUser = await this.buildAuthUserPayload(user.id);

    return {
      statusCode: 200,
      message: '登录成功',
      data: {
        user: payloadUser,
        ...tokens,
      },
    };
  }

  async getProfile(userId: number) {
    return this.buildAuthUserPayload(userId);
  }

  private async buildAuthUserPayload(userId: number) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    const { password: _pw, ...safe } = user as typeof user & {
      password?: string;
    };
    return this.enrichPhotographerForUser(safe);
  }

  private async enrichPhotographerForUser(user: Record<string, unknown>) {
    const widRaw = user.workerPhotographerId;
    const wid =
      typeof widRaw === 'number' && Number.isFinite(widRaw) ? widRaw : null;
    if (!wid) {
      return {
        ...user,
        photographerApprovalStatus: null,
        photographerApprovalNote: null,
        photographerCanTakeOrders: false,
      };
    }
    const p = await this.prisma.photographer.findUnique({
      where: { id: wid },
      select: { approvalStatus: true, approvalReviewNote: true },
    });
    const st = p?.approvalStatus ?? null;
    return {
      ...user,
      photographerApprovalStatus: st,
      photographerApprovalNote: p?.approvalReviewNote ?? null,
      photographerCanTakeOrders: st === 'approved',
    };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      throw new BadRequestException('当前密码错误');
    }
    const next = String(newPassword || '').trim();
    if (next.length < 6) {
      throw new BadRequestException('新密码至少 6 位');
    }
    if (await bcrypt.compare(next, user.password)) {
      throw new BadRequestException('新密码不能与当前密码相同');
    }
    await this.usersService.resetPassword(userId, next);
    return { statusCode: 200, message: '密码已更新' };
  }

  async bindPhone(userId: number, phone: string) {
    await this.usersService.bindPhone(userId, phone);
    return { statusCode: 200, message: '手机号已绑定' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      });

      const tokens = this.generateTokens(payload.sub);

      return {
        statusCode: 200,
        message: '刷新成功',
        data: tokens,
      };
    } catch {
      throw new UnauthorizedException('刷新 Token 失败');
    }
  }

  private generateTokens(userId: number) {
    const accessToken = this.jwtService.sign(
      { sub: userId },
      {
        secret:
          process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        expiresIn: '24h',
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        expiresIn: '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
    };
  }
}
