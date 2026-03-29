<template>
  <div class="csr-page">
    <div class="page-header">
      <h1>定制旅拍需求</h1>
      <p>填写期望的拍摄时间、地点、风格等并发布；摄影师接单后需您同意才会确认合作。</p>
      <a-button type="primary" @click="openCreate">发布新需求</a-button>
    </div>

    <a-spin :spinning="loading">
      <div v-if="!list.length" class="empty">暂无需求，点击上方发布到平台等待摄影师接单。</div>
      <div v-else class="cards">
        <a-card v-for="r in list" :key="r.id" class="item" :title="r.title || '定制旅拍'">
          <template #extra>
            <a-tag :color="statusColor(r.status)">{{ statusText(r.status) }}</a-tag>
          </template>
          <p class="no">编号：{{ r.requestNo }}</p>
          <p>地点：{{ r.location }} · 风格：{{ r.style }}</p>
          <p>
            期望拍摄日：{{ r.shootingDate }} · 行程 {{ r.duration }} 天 · {{ r.numberOfPeople }} 人
          </p>
          <p v-if="r.budgetHint">预算参考：¥{{ r.budgetHint.toLocaleString() }}</p>
          <p v-if="r.description" class="desc">{{ r.description }}</p>
          <p v-if="r.photographer" class="ph">
            接单摄影师：{{ r.photographer.name }}
            <span v-if="r.claimMessage" class="msg">（留言：{{ r.claimMessage }}）</span>
          </p>
          <div class="actions">
            <template v-if="r.status === 'open'">
              <a-space wrap>
                <a-popconfirm title="撤销后需求将关闭，确定？" @confirm="doCancel(r.id)">
                  <a-button size="small" danger>撤销需求</a-button>
                </a-popconfirm>
                <a-popconfirm
                  title="将永久删除该需求，不可恢复，确定？"
                  ok-text="删除"
                  cancel-text="取消"
                  @confirm="doRemove(r.id)"
                >
                  <a-button size="small" danger type="default">删除</a-button>
                </a-popconfirm>
              </a-space>
            </template>
            <template v-if="r.status === 'pending_user_confirm'">
              <a-button type="primary" size="small" @click="doConfirm(r.id)">同意该摄影师</a-button>
              <a-popconfirm
                title="拒绝后需求将重新开放给其他摄影师，确定？"
                @confirm="doReject(r.id)"
              >
                <a-button size="small" style="margin-left: 8px">不同意</a-button>
              </a-popconfirm>
            </template>
            <template v-if="r.status === 'confirmed'">
              <a-space wrap class="confirmed-actions">
                <a-tag color="success">已确认合作</a-tag>
                <a-button type="link" size="small" @click="goOrders">我的订单</a-button>
                <a-button v-if="chatEligible(r)" type="primary" size="small" @click="goChat(r)">
                  联系摄影师
                </a-button>
                <a-popconfirm
                  title="将删除本条定制需求，并同步删除关联的预约订单（不可恢复）。确定？"
                  ok-text="删除"
                  cancel-text="取消"
                  @confirm="doRemove(r.id)"
                >
                  <a-button size="small" danger type="link">删除记录</a-button>
                </a-popconfirm>
              </a-space>
            </template>
            <template v-if="r.status === 'cancelled'">
              <a-space wrap>
                <span class="muted">已撤销</span>
                <a-popconfirm
                  title="从列表中永久删除该记录，确定？"
                  ok-text="删除"
                  cancel-text="取消"
                  @confirm="doRemove(r.id)"
                >
                  <a-button size="small" danger type="link">删除记录</a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </div>
        </a-card>
      </div>
    </a-spin>

    <a-modal
      v-model:open="modalOpen"
      title="发布定制需求"
      ok-text="发布"
      :confirm-loading="submitting"
      width="560px"
      @ok="submitCreate"
    >
      <a-form layout="vertical" class="form">
        <a-form-item label="标题（可选）">
          <a-input v-model:value="form.title" placeholder="如：三亚海边婚纱照" />
        </a-form-item>
        <a-form-item label="补充说明（可选）">
          <a-textarea
            v-model:value="form.description"
            :rows="3"
            placeholder="特殊想法、服装偏好等"
          />
        </a-form-item>
        <a-form-item label="拍摄地点" required>
          <a-input v-model:value="form.location" placeholder="城市或具体区域" />
        </a-form-item>
        <a-form-item label="风格" required>
          <a-input v-model:value="form.style" placeholder="如 romantic / 韩系清新" />
        </a-form-item>
        <a-form-item label="期望拍摄日" required>
          <a-input v-model:value="form.shootingDate" placeholder="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item label="行程天数">
          <a-input-number v-model:value="form.duration" :min="1" :max="30" style="width: 100%" />
        </a-form-item>
        <a-form-item label="人数">
          <a-input-number
            v-model:value="form.numberOfPeople"
            :min="1"
            :max="20"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="预算参考（元，可选）">
          <a-input-number v-model:value="form.budgetHint" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="联系人" required>
          <a-input v-model:value="form.contactName" />
        </a-form-item>
        <a-form-item label="手机号" required>
          <a-input v-model:value="form.phone" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import {
  customShootRequestsApi,
  type CreateCustomShootBody,
  type CustomShootRequestRow,
} from '@/api/customShootRequests';
import {
  mergeBookingOrderIntoLocalHistory,
  removeOrderFromLocalHistory,
} from '@/utils/mergeOnlineOrderHistory';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);
const list = ref<CustomShootRequestRow[]>([]);
const modalOpen = ref(false);
const submitting = ref(false);

const form = reactive<CreateCustomShootBody>({
  title: '',
  description: '',
  location: '',
  style: '',
  shootingDate: '',
  duration: 1,
  numberOfPeople: 2,
  budgetHint: undefined,
  contactName: '',
  phone: '',
});

const statusText = (s: string) => {
  const m: Record<string, string> = {
    open: '待接单',
    pending_user_confirm: '待您确认摄影师',
    confirmed: '已确认合作',
    cancelled: '已撤销',
  };
  return m[s] || s;
};

const statusColor = (s: string) => {
  if (s === 'open') return 'blue';
  if (s === 'pending_user_confirm') return 'orange';
  if (s === 'confirmed') return 'green';
  return 'default';
};

async function load() {
  loading.value = true;
  try {
    list.value = await customShootRequestsApi.listMine();
    for (const r of list.value) {
      if (r.status === 'confirmed' && r.linkedBookingOrder) {
        mergeBookingOrderIntoLocalHistory(r.linkedBookingOrder);
      }
    }
  } catch (e: unknown) {
    const err = e as { statusCode?: number; message?: string | string[] };
    // 4xx/5xx 已在 httpClient 拦截器中提示，避免重复弹窗
    if (err.statusCode && err.statusCode >= 400 && err.statusCode < 600) {
      return;
    }
    const raw = err?.message;
    const detail = Array.isArray(raw)
      ? raw.join('; ')
      : typeof raw === 'string' && raw.trim()
        ? raw
        : '';
    message.error(detail || '加载失败，请确认已执行数据库迁移或稍后重试');
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  form.title = '';
  form.description = '';
  form.location = '';
  form.style = '';
  form.shootingDate = '';
  form.duration = 1;
  form.numberOfPeople = 2;
  form.budgetHint = undefined;
  form.contactName = authStore.user?.name || '';
  form.phone = authStore.user?.phone || '';
  modalOpen.value = true;
}

async function submitCreate() {
  if (!form.location?.trim() || !form.style?.trim() || !form.shootingDate?.trim()) {
    message.warning('请填写地点、风格与期望拍摄日');
    return;
  }
  if (!form.contactName?.trim() || !form.phone?.trim()) {
    message.warning('请填写联系人与手机号');
    return;
  }
  submitting.value = true;
  try {
    await customShootRequestsApi.create({
      ...form,
      title: form.title?.trim() || undefined,
      description: form.description?.trim() || undefined,
      budgetHint: form.budgetHint || undefined,
    });
    message.success('已发布');
    modalOpen.value = false;
    await load();
  } catch {
    /* http 拦截器已提示 */
  } finally {
    submitting.value = false;
  }
}

async function doCancel(id: number) {
  try {
    await customShootRequestsApi.cancel(id);
    message.success('已撤销');
    await load();
  } catch {
    /* */
  }
}

async function doRemove(id: number) {
  try {
    const res = await customShootRequestsApi.remove(id);
    if (res.removedOrderNo) {
      removeOrderFromLocalHistory(res.removedOrderNo);
    }
    message.success('已删除');
    await load();
  } catch {
    /* 409 等由拦截器提示 */
  }
}

async function doConfirm(id: number) {
  try {
    const res = await customShootRequestsApi.confirmPhotographer(id);
    if (res.bookingOrder) {
      mergeBookingOrderIntoLocalHistory(res.bookingOrder);
    }
    message.success('已确认合作：订单已加入「我的订单」，可与摄影师沟通拍摄事宜');
    await load();
  } catch {
    /* */
  }
}

function chatEligible(r: CustomShootRequestRow) {
  const pid = r.photographer?.id ?? r.linkedBookingOrder?.photographerId;
  return !!pid && !!r.linkedBookingOrder?.orderNo;
}

function goChat(r: CustomShootRequestRow) {
  const bo = r.linkedBookingOrder;
  const pid = Number(r.photographer?.id ?? bo?.photographerId ?? 0);
  const orderNo = bo?.orderNo || '';
  if (!orderNo || !Number.isFinite(pid) || pid <= 0) {
    message.warning('暂无法发起会话，请稍后在「我的订单」中联系摄影师');
    return;
  }
  router.push({
    path: '/user/chat',
    query: {
      orderNo,
      peerName: r.photographer?.name || bo?.photographerName || '摄影师',
      shootingDate: String(r.shootingDate || ''),
      photographerId: String(pid),
    },
  });
}

function goOrders() {
  router.push({ path: '/user/orders' });
}

async function doReject(id: number) {
  try {
    await customShootRequestsApi.rejectPhotographer(id);
    message.success('已拒绝，需求重新开放接单');
    await load();
  } catch {
    /* */
  }
}

onMounted(() => {
  if (authStore.user?.role === 'worker') {
    message.info('工作人员请在工作台使用「定制需求广场」');
    void router.replace('/worker/custom-market');
    return;
  }
  void load();
});
</script>

<style scoped lang="less">
.csr-page {
  max-width: none;
  margin: 0;
  padding: 0 0 40px;
}
.page-header {
  margin-bottom: 20px;
  h1 {
    font-size: 22px;
    font-weight: 800;
    margin: 0 0 8px;
  }
  p {
    color: #6b7280;
    margin: 0 0 14px;
    line-height: 1.55;
  }
}
.empty {
  padding: 48px;
  text-align: center;
  color: #9ca3af;
  background: #f9fafb;
  border-radius: 12px;
}
.cards {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.item {
  border-radius: 12px;
}
.no {
  font-size: 12px;
  color: #9ca3af;
}
.desc {
  color: #4b5563;
  white-space: pre-wrap;
}
.ph {
  margin-top: 8px;
  font-weight: 600;
  .msg {
    font-weight: 400;
    color: #6b7280;
  }
}
.actions {
  margin-top: 12px;
}
.confirmed-actions {
  align-items: center;
}
.muted {
  color: #9ca3af;
}
.form {
  margin-top: 8px;
}
</style>
