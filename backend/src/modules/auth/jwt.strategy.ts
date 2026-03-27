import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: any) {
    const id = Number(payload?.sub);
    if (!Number.isFinite(id) || id <= 0) {
      throw new UnauthorizedException('无效的令牌');
    }
    try {
      const user = await this.usersService.findOne(id);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }
      // 不把密码哈希放进 req.user，避免 /auth/profile 等接口泄露
      const { password: _pw, ...safe } = user;
      return {
        ...safe,
        sub: user.id,
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      this.logger.error('JWT 校验查询用户失败', e);
      throw new UnauthorizedException('令牌验证失败');
    }
  }
}
