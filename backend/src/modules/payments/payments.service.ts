import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import QRCode from 'qrcode';
import { paymentConfig } from '../../config/payment.config';
import { OrdersService } from '../orders/orders.service';
import { WechatPayV3Service } from './wechat-pay-v3.service';

export type OnlinePayMode = 'wechat_native' | 'landing';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly wechatPay: WechatPayV3Service,
  ) {}

  private landingSign(orderNo: string, ts: string): string {
    return crypto
      .createHmac('sha256', paymentConfig.signSecret)
      .update(`${orderNo}|${ts}`)
      .digest('hex');
  }

  private verifyLanding(orderNo: string, ts: string, sign: string): boolean {
    const maxAge = 24 * 60 * 60 * 1000;
    const t = Number(ts);
    if (!Number.isFinite(t) || Date.now() - t > maxAge) {
      return false;
    }
    const expect = this.landingSign(orderNo, ts);
    try {
      const a = Buffer.from(expect, 'hex');
      const b = Buffer.from(sign, 'hex');
      if (a.length !== b.length || a.length === 0) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  private async toQrDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
  }

  /**
   * 金额：订单 totalAmount 为「元」整数，微信传「分」
   */
  private yuanToFen(yuan: number): number {
    if (!Number.isFinite(yuan) || yuan < 0) {
      throw new BadRequestException('订单金额无效');
    }
    return Math.round(yuan * 100);
  }

  private makeOutTradeNo(orderId: number): string {
    const raw = `O${orderId}T${Date.now()}`;
    const safe = raw.replace(/[^A-Za-z0-9]/g, '');
    return safe.slice(0, 32);
  }

  /**
   * 创建在线支付二维码（微信 Native 或落地页）
   */
  async createOnlinePrepay(
    orderId: number,
    channel: 'wechat' | 'alipay',
  ): Promise<{
    mode: OnlinePayMode;
    qrCodeDataUrl: string;
    codeUrl: string;
    orderNo: string;
    outTradeNo: string;
    hint: string;
  }> {
    const order = await this.ordersService.findById(orderId);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.paymentStatus === 'paid' || order.paymentStatus === 'completed') {
      throw new BadRequestException('订单已支付或已完成');
    }
    if (order.paymentMethod === 'offline') {
      throw new BadRequestException('订单为线下支付，无需在线扫码');
    }

    const outTradeNo = this.makeOutTradeNo(order.id);
    await this.ordersService.updatePaymentNo(order.id, outTradeNo);

    const amountFen = this.yuanToFen(order.totalAmount);
    const description = `${order.packageName}`.slice(0, 120);

    const useWechat =
      channel === 'wechat' &&
      this.wechatPay.isConfigured() &&
      order.paymentMethod === 'wechat';

    if (useWechat) {
      try {
        const codeUrl = await this.wechatPay.nativeTransactions({
          outTradeNo,
          description,
          amountFen,
        });
        const qrCodeDataUrl = await this.toQrDataUrl(codeUrl);
        return {
          mode: 'wechat_native',
          qrCodeDataUrl,
          codeUrl,
          orderNo: order.orderNo,
          outTradeNo,
          hint: '请使用微信「扫一扫」扫描上方二维码完成支付，支付成功后页面将自动更新。',
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '微信下单失败';
        throw new BadRequestException(
          `微信支付下单失败，请检查商户配置或稍后重试：${msg}`,
        );
      }
    }

    // 落地页（未配置微信证书、或支付宝渠道时：真实二维码链接到本站确认页，演示用）
    const ts = String(Date.now());
    const sign = this.landingSign(order.orderNo, ts);
    const base = paymentConfig.publicBaseUrl.replace(/\/$/, '');
    const codeUrl = `${base}/payment/scan?orderNo=${encodeURIComponent(order.orderNo)}&ts=${encodeURIComponent(ts)}&sign=${encodeURIComponent(sign)}`;
    const qrCodeDataUrl = await this.toQrDataUrl(codeUrl);
    const hint =
      channel === 'alipay'
        ? '当前为演示模式：请用手机浏览器扫码，在页面确认后完成支付。接入支付宝官方接口后可使用真实支付宝支付。'
        : '当前为演示模式（未配置微信支付证书）：请用手机微信扫码打开页面，按提示完成支付。配置 WECHAT_PAY_* 后可使用微信官方支付。';

    return {
      mode: 'landing',
      qrCodeDataUrl,
      codeUrl,
      orderNo: order.orderNo,
      outTradeNo,
      hint,
    };
  }

  /**
   * 轮询支付状态（含微信查单）
   */
  async getOnlinePaymentStatus(orderNo: string): Promise<{
    paid: boolean;
    paymentStatus: string;
  }> {
    const order = await this.ordersService.findByOrderNo(orderNo);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.paymentStatus === 'paid' || order.paymentStatus === 'completed') {
      return { paid: true, paymentStatus: order.paymentStatus };
    }

    if (
      order.paymentMethod === 'wechat' &&
      this.wechatPay.isConfigured() &&
      order.paymentNo
    ) {
      try {
        const q = await this.wechatPay.queryByOutTradeNo(order.paymentNo);
        if (q.trade_state === 'SUCCESS') {
          await this.ordersService.markPaidByOrderNo(orderNo);
          return { paid: true, paymentStatus: 'paid' };
        }
      } catch {
        /* 查单失败不阻断，仍返回未支付 */
      }
    }

    return { paid: false, paymentStatus: order.paymentStatus };
  }

  /** 落地页展示摘要（校验签名） */
  async getLandingSummary(orderNo: string, ts: string, sign: string) {
    if (!this.verifyLanding(orderNo, ts, sign)) {
      throw new BadRequestException('链接无效或已过期，请重新下单获取二维码');
    }
    const order = await this.ordersService.findByOrderNo(orderNo);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    return {
      orderNo: order.orderNo,
      packageName: order.packageName,
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      paid:
        order.paymentStatus === 'paid' || order.paymentStatus === 'completed',
    };
  }

  /**
   * 演示/毕设：用户在前端点击「我已完成支付」即标记订单已付（无需真实渠道回调）
   */
  async demoCompletePayment(orderNo: string) {
    const order = await this.ordersService.findByOrderNo(orderNo);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.paymentMethod === 'offline') {
      throw new BadRequestException('该订单为线下支付，请按线下流程处理');
    }
    if (order.paymentStatus === 'paid' || order.paymentStatus === 'completed') {
      return { ok: true, alreadyPaid: true };
    }
    await this.ordersService.markPaidByOrderNo(orderNo);
    return { ok: true, alreadyPaid: false };
  }

  /** 落地页确认支付（演示用，生产需替换为真实回调验签） */
  async confirmLandingPayment(orderNo: string, ts: string, sign: string) {
    if (!this.verifyLanding(orderNo, ts, sign)) {
      throw new BadRequestException('链接无效或已过期');
    }
    const order = await this.ordersService.findByOrderNo(orderNo);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.paymentStatus === 'paid' || order.paymentStatus === 'completed') {
      return { ok: true, alreadyPaid: true };
    }
    await this.ordersService.markPaidByOrderNo(orderNo);
    return { ok: true, alreadyPaid: false };
  }
}
