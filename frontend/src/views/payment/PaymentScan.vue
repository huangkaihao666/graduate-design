<template>
  <div class="pay-scan-page">
    <a-spin :spinning="loading">
      <div v-if="error" class="state-box">
        <a-result status="error" :title="error" />
      </div>
      <div v-else-if="summary" class="state-box">
        <h1>订单支付</h1>
        <a-descriptions bordered :column="1" size="middle" class="desc">
          <a-descriptions-item label="订单号">{{ summary.orderNo }}</a-descriptions-item>
          <a-descriptions-item label="套餐">{{ summary.packageName }}</a-descriptions-item>
          <a-descriptions-item label="应付金额"
            >¥{{ Number(summary.totalAmount || 0).toLocaleString() }}</a-descriptions-item
          >
        </a-descriptions>
        <a-alert v-if="summary.paid" type="success" message="该订单已支付" show-icon class="mt" />
        <template v-else>
          <p class="tip">确认款项无误后点击下方按钮完成支付（演示环境）。</p>
          <a-button type="primary" size="large" :loading="confirming" @click="confirm">
            确认支付
          </a-button>
        </template>
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { paymentsApi } from '@/api/payments';
import { message } from 'ant-design-vue';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const loading = ref(true);
const error = ref('');
const confirming = ref(false);
const summary = ref<{
  orderNo: string;
  packageName: string;
  totalAmount: number;
  paymentStatus: string;
  paid: boolean;
} | null>(null);

const qOrderNo = () => String(route.query.orderNo || '');
const qTs = () => String(route.query.ts || '');
const qSign = () => String(route.query.sign || '');

onMounted(async () => {
  if (!qOrderNo() || !qTs() || !qSign()) {
    error.value = '链接参数不完整，请从下单页重新获取二维码';
    loading.value = false;
    return;
  }
  try {
    const data = (await paymentsApi.getLandingSummary({
      orderNo: qOrderNo(),
      ts: qTs(),
      sign: qSign(),
    })) as {
      orderNo: string;
      packageName: string;
      totalAmount: number;
      paymentStatus: string;
      paid: boolean;
    };
    summary.value = data;
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: string }).message)
        : '加载失败';
    error.value = msg;
  } finally {
    loading.value = false;
  }
});

const confirm = async () => {
  confirming.value = true;
  try {
    const res = (await paymentsApi.confirmLanding({
      orderNo: qOrderNo(),
      ts: qTs(),
      sign: qSign(),
    })) as { ok?: boolean; alreadyPaid?: boolean };
    if (res?.alreadyPaid) {
      message.success('订单已支付');
    } else {
      message.success('支付成功');
    }
    if (summary.value) {
      summary.value.paid = true;
      summary.value.paymentStatus = 'paid';
    }
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: string }).message)
        : '支付失败';
    message.error(msg);
  } finally {
    confirming.value = false;
  }
};
</script>

<style scoped lang="less">
.pay-scan-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e2e8f0 100%);
}

.state-box {
  max-width: 480px;
  width: 100%;
  background: #fff;
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);

  h1 {
    margin: 0 0 20px;
    font-size: 22px;
    font-weight: 700;
  }
}

.desc {
  margin-bottom: 16px;
}

.mt {
  margin-top: 16px;
}

.tip {
  color: #64748b;
  margin: 16px 0;
  line-height: 1.6;
}
</style>
