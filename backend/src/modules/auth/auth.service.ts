import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    // 检查用户是否已存在
    const existingUser = await this.usersService.findByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new BadRequestException('用户已存在');
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // 创建新用户
    const user = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
    });

    // 生成 token
    const tokens = this.generateTokens(user.id);

    return {
      statusCode: 201,
      message: '注册成功',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: (user as { phone?: string | null }).phone ?? null,
          role: user.role,
          workerPhotographerId: user.workerPhotographerId ?? null,
        },
        ...tokens,
      },
    };
  }

  async login(email: string, password: string) {
    // 查找用户
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 生成 token
    const tokens = this.generateTokens(user.id);

    return {
      statusCode: 200,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: (user as { phone?: string | null }).phone ?? null,
          role: user.role,
          workerPhotographerId: user.workerPhotographerId ?? null,
        },
        ...tokens,
      },
    };
  }

  /** 已登录用户修改密码 */
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

  /** 已登录用户绑定手机号 */
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
    } catch (error) {
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
