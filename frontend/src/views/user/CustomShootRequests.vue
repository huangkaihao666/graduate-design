<template>
  <div class="csr-page">
    <div class="page-hero">
      <h1>个性预约 · 定制旅拍需求</h1>
      <p class="lead">
        若您已有明确想法与档期，希望由摄影师按您的风格与地点来拍摄，可在此发布需求。平台将为您匹配本店摄影师，接单后需您确认才会正式合作。
      </p>
      <p class="lead">
        请尽量写清拍摄地点、风格偏好、期望日期与人数。已发布的需求与关联预约订单请在「我的订单」顶部切换至「个性预约」查看与操作；本页仅用于发布新需求。
      </p>
      <p class="lead">若您更倾向固定套餐与标准流程，请从「套餐浏览」选择后进入套餐预约下单。</p>
    </div>

    <a-card class="publish-card" :bordered="false">
      <template #title>
        <span class="publish-card-title">发布定制需求</span>
      </template>
      <a-form layout="vertical" class="form">
        <a-form-item label="拍摄城市" required>
          <a-input v-model:value="form.location" placeholder="城市或具体区域" />
        </a-form-item>
        <a-form-item label="拍摄风格" required>
          <a-input v-model:value="form.style" placeholder="如韩系清新/古风典雅" />
        </a-form-item>
        <a-form-item label="期望拍摄日期" required extra="请在日历中选择，格式为 YYYY-MM-DD">
          <a-date-picker
            v-model:value="shootingDateDayjs"
            format="YYYY-MM-DD"
            style="width: 100%"
            placeholder="请选择期望拍摄日"
            :locale="datePickerLocaleZhCN"
            :disabled-date="disabledShootingDate"
          />
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
        <a-form-item label="手机号" required extra="11 位数字，以 1 开头（中国大陆手机号）">
          <a-input
            v-model:value="form.phone"
            maxlength="11"
            inputmode="numeric"
            autocomplete="tel"
            placeholder="如 13800138000"
            @blur="sanitizePhone"
          />
        </a-form-item>
        <a-form-item label="补充说明（可选）">
          <a-textarea
            v-model:value="form.description"
            :rows="3"
            placeholder="特殊想法、服装偏好等"
          />
        </a-form-item>
        <a-form-item>
          <a-space wrap>
            <a-button type="primary" class="pink-btn" :loading="submitting" @click="submitCreate">
              发布需求
            </a-button>
            <a-button class="pink-btn-outline" @click="resetForm">重置表单</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { customShootRequestsApi, type CreateCustomShootBody } from '@/api/customShootRequests';
import { useAuthStore } from '@/store/auth';
import { mergeBookingOrderIntoLocalHistory } from '@/utils/mergeOnlineOrderHistory';
import { message } from 'ant-design-vue';
import datePickerLocaleZhCN from 'ant-design-vue/es/date-picker/locale/zh_CN';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

dayjs.locale('zh-cn');

/** 中国大陆手机号：1 开头，第二位 3–9，共 11 位 */
const CN_MOBILE_REGEX = /^1[3-9]\d{9}$/;

const authStore = useAuthStore();
const router = useRouter();
const submitting = ref(false);

/** 期望拍摄日（日历选择，提交时写入 form.shootingDate 为 YYYY-MM-DD） */
const shootingDateDayjs = ref<Dayjs | null>(null);

function disabledShootingDate(current: Dayjs) {
  return current != null && current < dayjs().startOf('day');
}

function sanitizePhone() {
  form.phone = (form.phone || '').replace(/\D/g, '').slice(0, 11);
}

const form = reactive<CreateCustomShootBody>({
  description: '',
  location: '',
  style: '',
  shootingDate: '',
  duration: undefined,
  numberOfPeople: undefined,
  budgetHint: undefined,
  contactName: '',
  phone: '',
});

/** 静默同步：已确认需求的关联订单写入本地，供「我的订单」展示；本页不展示列表 */
async function syncLinkedOrdersFromMine() {
  try {
    const rows = await customShootRequestsApi.listMine();
    for (const r of rows) {
      if (r.status === 'confirmed' && r.linkedBookingOrder) {
        mergeBookingOrderIntoLocalHistory(r.linkedBookingOrder);
      }
    }
  } catch {
    /* 静默 */
  }
}

function resetForm() {
  form.description = '';
  form.location = '';
  form.style = '';
  form.shootingDate = '';
  shootingDateDayjs.value = null;
  form.duration = undefined;
  form.numberOfPeople = undefined;
  form.budgetHint = undefined;
  form.contactName = '';
  form.phone = '';
}

async function submitCreate() {
  form.shootingDate = shootingDateDayjs.value ? shootingDateDayjs.value.format('YYYY-MM-DD') : '';
  sanitizePhone();

  if (!form.location?.trim() || !form.style?.trim()) {
    message.warning('请填写拍摄地点与风格');
    return;
  }
  if (!form.shootingDate.trim()) {
    message.warning('请在日历中选择期望拍摄日');
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.shootingDate)) {
    message.warning('期望拍摄日格式须为 YYYY-MM-DD');
    return;
  }
  if (!form.contactName?.trim()) {
    message.warning('请填写联系人');
    return;
  }
  if (!form.phone?.trim()) {
    message.warning('请填写手机号');
    return;
  }
  if (!CN_MOBILE_REGEX.test(form.phone)) {
    message.warning('手机号须为 11 位中国大陆号码（以 1 开头，第二位为 3–9）');
    return;
  }

  submitting.value = true;
  try {
    await customShootRequestsApi.create({
      ...form,
      description: form.description?.trim() || undefined,
      budgetHint: form.budgetHint || undefined,
      phone: form.phone.trim(),
    });
    message.success('已发布');
    resetForm();
    await syncLinkedOrdersFromMine();
  } catch {
    /* http 拦截器已提示 */
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  if (authStore.user?.role === 'worker') {
    message.info('工作人员请在工作台使用「定制需求广场」');
    void router.replace('/worker/custom-market');
    return;
  }
  resetForm();
  void syncLinkedOrdersFromMine();
});
</script>

<style scoped lang="less">
.csr-page {
  max-width: none;
  margin: 0;
  min-height: 100vh;
  padding: 28px 120px 40px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #fff5f7 0%, #ffffff 55%);

  @media (max-width: 768px) {
    padding: 24px 48px 32px;
  }
}
.page-hero {
  max-width: 920px;
  margin: 0 auto 28px;
  text-align: center;

  h1 {
    font-size: 1.65rem;
    font-weight: 800;
    margin: 0 0 16px;
    color: #1e293b;
    background: linear-gradient(90deg, #ff5f84 0%, #ff7eb3 55%, #ffb3d1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .lead {
    color: #64748b;
    margin: 0 0 12px;
    line-height: 1.65;
    font-size: 0.98rem;
    text-align: left;
  }
}

.publish-card {
  max-width: 720px;
  margin: 0 auto;
  border-radius: 16px;
  box-shadow: 0 10px 36px rgba(255, 117, 140, 0.12);
  border: 1px solid rgba(255, 117, 140, 0.12);

  :deep(.ant-card-head) {
    border-bottom: 1px solid rgba(255, 117, 140, 0.1);
    background: linear-gradient(135deg, rgba(255, 117, 140, 0.06) 0%, #fff 100%);
  }

  .publish-card-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: #be185d;
  }
}

.form {
  margin-top: 8px;
}

.pink-btn {
  :deep(&.ant-btn-primary) {
    background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
    border: none;
    box-shadow: none;
  }

  :deep(&.ant-btn-primary:hover),
  :deep(&.ant-btn-primary:focus) {
    background: linear-gradient(135deg, #ff5f84 0%, #ff72ab 100%);
  }
}

.pink-btn-outline {
  :deep(&.ant-btn) {
    color: #d6336c;
    border-color: rgba(255, 117, 140, 0.55);
    background: rgba(255, 117, 140, 0.06);
  }

  :deep(&.ant-btn:hover),
  :deep(&.ant-btn:focus) {
    color: #be185d;
    border-color: rgba(255, 117, 140, 0.85);
    background: rgba(255, 117, 140, 0.1);
  }
}
</style>
