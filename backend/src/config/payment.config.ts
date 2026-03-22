/**
 * 支付相关环境变量（见项目根目录 .env.example）
 */
export const paymentConfig = {
  /** 前端落地页域名，用于未配置微信证书时的扫码链接 */
  publicBaseUrl: process.env.PAYMENT_PUBLIC_BASE_URL || 'http://localhost:5173',
  /** 落地页链接 HMAC 密钥，生产环境务必更换 */
  signSecret:
    process.env.PAYMENT_SIGN_SECRET || 'dev-payment-sign-change-in-production',
};
