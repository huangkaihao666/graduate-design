import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isLocalAdminBearer } from './local-admin-token.util';

/**
 * 与前端「管理员演示登录」一致：Bearer `local-admin-token` 放行；
 * 否则走正常 JWT 校验（真实用户登录后的 token）。
 */
@Injectable()
export class AdminOrJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | import('rxjs').Observable<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<{ headers?: { authorization?: string } }>();
    if (isLocalAdminBearer(req.headers?.authorization)) {
      return true;
    }
    return super.canActivate(context);
  }
}
