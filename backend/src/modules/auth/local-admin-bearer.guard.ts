import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/** 与前端「管理员演示登录」一致：仅允许 Bearer local-admin-token */
const LOCAL_ADMIN_TOKEN = 'local-admin-token';

@Injectable()
export class LocalAdminBearerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ headers?: { authorization?: string } }>();
    const auth = req.headers?.authorization;
    return auth === `Bearer ${LOCAL_ADMIN_TOKEN}`;
  }
}
