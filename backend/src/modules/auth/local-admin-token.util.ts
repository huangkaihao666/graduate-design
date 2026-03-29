/** 与前端「管理员演示登录」一致的固定 Token */
export const LOCAL_ADMIN_BEARER_TOKEN = 'local-admin-token';

/** 从 Authorization 头取出 Bearer 后的 token（忽略大小写与首尾空格） */
export function extractBearerToken(
  authorization: string | undefined,
): string | null {
  if (!authorization?.trim()) return null;
  const m = /^Bearer\s+(\S+)/i.exec(authorization.trim());
  return m ? m[1].trim() : null;
}

export function isLocalAdminBearer(authorization: string | undefined): boolean {
  return extractBearerToken(authorization) === LOCAL_ADMIN_BEARER_TOKEN;
}
