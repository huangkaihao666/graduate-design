import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { isLocalAdminBearer } from './local-admin-token.util';

/** 与前端「管理员演示登录」一致：仅允许 Bearer local-admin-token */
@Injectable()
export class LocalAdminBearerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ headers?: { authorization?: string } }>();
    return isLocalAdminBearer(req.headers?.authorization);
  }
}
