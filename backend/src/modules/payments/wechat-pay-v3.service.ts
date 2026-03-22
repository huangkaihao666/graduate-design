import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

/**
 * 微信支付 APIv3（Native 下单 + 查单）
 * 需在环境变量中配置商户号、证书序列号、商户私钥、notify_url 等，见 .env.example
 */
@Injectable()
export class WechatPayV3Service {
  private readonly logger = new Logger(WechatPayV3Service.name);

  isConfigured(): boolean {
    return !!(
      process.env.WECHAT_PAY_APPID &&
      process.env.WECHAT_PAY_MCH_ID &&
      process.env.WECHAT_PAY_CERT_SERIAL_NO &&
      process.env.WECHAT_PAY_PRIVATE_KEY &&
      process.env.WECHAT_PAY_NOTIFY_URL
    );
  }

  private getPrivateKey(): string {
    const raw = process.env.WECHAT_PAY_PRIVATE_KEY || '';
    return raw.replace(/\\n/g, '\n').trim();
  }

  private sign(message: string): string {
    const key = this.getPrivateKey();
    if (!key.includes('BEGIN')) {
      throw new Error('WECHAT_PAY_PRIVATE_KEY 格式错误');
    }
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    sign.end();
    return sign.sign(key, 'base64');
  }

  private buildAuth(
    method: string,
    pathWithQuery: string,
    body: string,
  ): string {
    const ts = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const message = `${method}\n${pathWithQuery}\n${ts}\n${nonce}\n${body}\n`;
    const signature = this.sign(message);
    const mchid = process.env.WECHAT_PAY_MCH_ID!;
    const serial = process.env.WECHAT_PAY_CERT_SERIAL_NO!;
    return `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce}",timestamp="${ts}",serial_no="${serial}",signature="${signature}"`;
  }

  /**
   * Native 下单，返回 code_url（用于生成付款二维码）
   */
  async nativeTransactions(params: {
    outTradeNo: string;
    description: string;
    amountFen: number;
  }): Promise<string> {
    const appid = process.env.WECHAT_PAY_APPID!;
    const mchid = process.env.WECHAT_PAY_MCH_ID!;
    const notifyUrl = process.env.WECHAT_PAY_NOTIFY_URL!;
    const path = '/v3/pay/transactions/native';
    const bodyObj = {
      appid,
      mchid,
      description: params.description.slice(0, 127),
      out_trade_no: params.outTradeNo,
      notify_url: notifyUrl,
      amount: { total: params.amountFen, currency: 'CNY' },
    };
    const body = JSON.stringify(bodyObj);
    const auth = this.buildAuth('POST', path, body);
    const url = `https://api.mch.weixin.qq.com${path}`;
    try {
      const res = await axios.post<{ code_url: string }>(url, body, {
        headers: {
          Authorization: auth,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      if (!res.data?.code_url) {
        throw new Error('微信返回缺少 code_url');
      }
      return res.data.code_url;
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown; status?: number } };
      this.logger.error(
        `微信 Native 下单失败: ${err.response?.status} ${JSON.stringify(err.response?.data)}`,
      );
      throw e;
    }
  }

  /**
   * 按商户订单号查单（轮询支付结果）
   */
  async queryByOutTradeNo(
    outTradeNo: string,
  ): Promise<{ trade_state?: string }> {
    const mchid = process.env.WECHAT_PAY_MCH_ID!;
    const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${encodeURIComponent(mchid)}`;
    const auth = this.buildAuth('GET', path, '');
    const url = `https://api.mch.weixin.qq.com${path}`;
    const res = await axios.get(url, {
      headers: { Authorization: auth, Accept: 'application/json' },
    });
    return res.data as { trade_state?: string };
  }
}
