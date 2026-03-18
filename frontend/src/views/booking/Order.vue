<template>
  <div class="order-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>📝 在线预约下单</h1>
      <p>填写下单信息后提交预约，我们会为您安排专业团队跟进</p>
    </div>

    <div class="content-grid" v-if="selectedPackage">
      <!-- 左侧：下单表单 -->
      <div class="left-panel">
        <div class="package-card">
          <div class="package-card-top">
            <div class="package-info">
              <h2 class="package-title">{{ selectedPackage.name }}</h2>
              <div class="package-meta">
                <span>📍 {{ selectedPackage.location }}</span>
                <span>🎨 {{ getStyleName(selectedPackage.style) }}</span>
                <span>📅 {{ selectedPackage.duration }} 天</span>
                <span>👥 最多 {{ selectedPackage.maxPeople }} 人</span>
              </div>
            </div>
            <div class="package-price">
              <div class="price-amount">¥{{ selectedPackage.price.toLocaleString() }}</div>
              <div v-if="selectedPackage.originalPrice" class="origin-price">
                原价 ¥{{ selectedPackage.originalPrice.toLocaleString() }}
              </div>
            </div>
          </div>
          <div class="package-image">
            <a-image
              :src="selectedPackage.coverImage"
              :alt="selectedPackage.name"
              :preview="false"
            />
          </div>
        </div>

        <a-form
          layout="vertical"
          :model="orderForm"
          :rules="orderRules"
          ref="orderFormRef"
          @finish="handleSubmit"
          class="order-form"
        >
          <a-form-item label="预约人姓名" name="contactName">
            <a-input v-model:value="orderForm.contactName" placeholder="请输入您的姓名" />
          </a-form-item>

          <a-form-item label="联系电话" name="phone">
            <a-input
              v-model:value="orderForm.phone"
              placeholder="请输入手机号（11位）"
              :maxlength="11"
            />
          </a-form-item>

          <a-form-item label="邮箱（可选）" name="email">
            <a-input v-model:value="orderForm.email" placeholder="请输入邮箱（可选）" />
          </a-form-item>

          <a-form-item label="拍摄日期" name="shootingDate">
            <a-input v-model:value="orderForm.shootingDate" type="date" />
          </a-form-item>

          <a-form-item label="预约人数" name="numberOfPeople">
            <a-select v-model:value="orderForm.numberOfPeople" placeholder="请选择人数">
              <a-select-option v-for="n in peopleOptions" :key="n" :value="n"
                >{{ n }} 人</a-select-option
              >
            </a-select>
          </a-form-item>

          <a-form-item label="支付方式" name="paymentMethod">
            <a-select v-model:value="orderForm.paymentMethod" placeholder="请选择支付方式">
              <a-select-option value="wechat">微信支付</a-select-option>
              <a-select-option value="alipay">支付宝</a-select-option>
              <a-select-option value="offline">线下支付</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="备注（可选）" name="remark">
            <a-textarea
              v-model:value="orderForm.remark"
              placeholder="例如：希望的拍摄时间、服装偏好、特别需求等"
              :rows="4"
              :maxlength="300"
              show-count
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" html-type="submit" :loading="submitting" class="submit-btn">
                {{ submitting ? '提交中...' : '提交预约' }}
              </a-button>
              <a-button html-type="button" @click="handleReset" :disabled="submitting"
                >重置</a-button
              >
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <!-- 右侧：订单摘要 -->
      <div class="right-panel">
        <div class="summary-card">
          <h3>订单摘要</h3>

          <div class="summary-row">
            <span class="label">套餐</span>
            <span class="value">{{ selectedPackage.name }}</span>
          </div>

          <div class="summary-row">
            <span class="label">预约人数</span>
            <span class="value">{{ orderForm.numberOfPeople }} 人</span>
          </div>

          <div class="summary-row">
            <span class="label">单价</span>
            <span class="value">¥{{ selectedPackage.price.toLocaleString() }}</span>
          </div>

          <div class="summary-row total">
            <span class="label">合计</span>
            <span class="value"
              >¥{{ (selectedPackage.price * orderForm.numberOfPeople).toLocaleString() }}</span
            >
          </div>

          <div class="summary-tips">
            <p>
              温馨提示：当前订单提交为前端模拟（后端订单接口未实现）。您提交后可在本页看到订单编号。
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-else class="loading-state">
      <a-spin size="large" />
      <p>加载套餐信息...</p>
    </div>

    <!-- 提交成功 -->
    <a-modal
      v-model:open="successModalVisible"
      title="预约提交成功"
      :footer="null"
      @cancel="successModalVisible = false"
    >
      <div class="success-content">
        <div class="success-order-no">订单编号：{{ successInfo?.orderNo }}</div>
        <div class="success-summary">
          <div>套餐：{{ successInfo?.packageName }}</div>
          <div>人数：{{ successInfo?.numberOfPeople }} 人</div>
          <div>合计：¥{{ successInfo?.totalAmount?.toLocaleString() }}</div>
        </div>
        <div class="success-actions">
          <a-button type="primary" @click="successModalVisible = false">知道了</a-button>
          <a-button @click="goToOrders">去订单管理</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue';
import { useRoute, useRouter } from 'vue-router';
import { packagesApi, type Package } from '@/api/packages';
import { useAuthStore } from '@/store/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const styleMap: Record<string, string> = {
  romantic: '浪漫梦幻',
  artistic: '艺术文艺',
  bohemian: '波西米亚',
  minimalist: '极简现代',
  classical: '古典优雅',
  adventure: '冒险活力',
};

const getStyleName = (style: string) => styleMap[style] || style;

// sessionStorage 的状态持久化（避免用户切路由丢失表单）
const STORAGE_KEY = 'online-order-state';
const ORDER_HISTORY_KEY = 'online-order-history';

const orderFormRef = ref<FormInstance>();
const selectedPackage = ref<Package | null>(null);
const submitting = ref(false);

const successModalVisible = ref(false);
const successInfo = ref<{
  orderNo: string;
  packageName: string;
  numberOfPeople: number;
  totalAmount: number;
} | null>(null);

const orderForm = reactive({
  packageId: 0,
  contactName: '',
  phone: '',
  email: '',
  shootingDate: '',
  numberOfPeople: 1,
  paymentMethod: 'wechat',
  remark: '',
});

const peopleOptions = computed(() => {
  const max = selectedPackage.value?.maxPeople ?? 1;
  return Array.from({ length: max }, (_, idx) => idx + 1);
});

const emailValidator = (_rule: any, value: string) => {
  if (!value) return Promise.resolve();
  // 简单邮箱校验
  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailReg.test(value) ? Promise.resolve() : Promise.reject('请输入有效的邮箱地址');
};

const orderRules = {
  contactName: [{ required: true, message: '请输入预约人姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '手机号格式不正确',
      trigger: 'blur',
    },
  ],
  email: [{ validator: emailValidator, trigger: 'blur' }],
  shootingDate: [{ required: true, message: '请选择拍摄日期', trigger: 'change' }],
  numberOfPeople: [{ required: true, message: '请选择预约人数', trigger: 'change' }],
  paymentMethod: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
  remark: [{ max: 300, message: '备注最多300字', trigger: 'blur' }],
};

const saveStateToStorage = () => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        packageId: orderForm.packageId,
        contactName: orderForm.contactName,
        phone: orderForm.phone,
        email: orderForm.email,
        shootingDate: orderForm.shootingDate,
        numberOfPeople: orderForm.numberOfPeople,
        paymentMethod: orderForm.paymentMethod,
        remark: orderForm.remark,
      })
    );
  } catch (e) {
    console.warn('保存订单状态失败：', e);
  }
};

const restoreStateFromStorage = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (state?.packageId && Number(state.packageId) === Number(orderForm.packageId)) {
      orderForm.contactName = state.contactName || '';
      orderForm.phone = state.phone || '';
      orderForm.email = state.email || '';
      orderForm.shootingDate = state.shootingDate || '';
      orderForm.numberOfPeople = state.numberOfPeople ?? 1;
      orderForm.paymentMethod = state.paymentMethod || 'wechat';
      orderForm.remark = state.remark || '';
    }
  } catch (e) {
    console.warn('恢复订单状态失败：', e);
  }
};

const generateMockPackageById = (id: number): Package => {
  const locations = ['三亚', '大理', '丽江', '厦门', '青岛', '巴厘岛', '普吉岛'];
  const styles = ['romantic', 'artistic', 'bohemian', 'minimalist', 'classical', 'adventure'];
  const durations = [1, 2, 3, 5, 7];
  const basePrices = [2999, 3999, 4999, 5999, 6999, 8999, 12999];
  const maxPeopleList = [2, 4, 6];

  const imageUrls = [
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=800&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&h=800&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1581338834647-b0fb40704e21?w=1200&h=800&fit=crop&auto=format&q=80',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&h=800&fit=crop&auto=format&q=80',
  ];

  const detailImageUrls = [
    [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=900&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&h=900&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1581338834647-b0fb40704e21?w=1200&h=900&fit=crop&auto=format&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&h=900&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=900&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&h=900&fit=crop&auto=format&q=80',
    ],
  ];

  const location = locations[(id - 1) % locations.length];
  const style = styles[(id - 1) % styles.length];
  const duration = durations[(id - 1) % durations.length];
  const basePrice = basePrices[(id - 1) % basePrices.length];
  const hasDiscount = id % 2 === 0;

  const coverImage = imageUrls[(id - 1) % imageUrls.length];
  const images = detailImageUrls[(id - 1) % detailImageUrls.length];

  const maxPeople = maxPeopleList[(id - 1) % maxPeopleList.length];
  const isPopular = id % 3 === 0;
  const isHot = id % 5 === 0;

  return {
    id,
    name: `${location}${duration}日${getStyleName(style)}旅拍套餐`,
    description: `精选${location}最美景点，专业摄影师全程跟拍，${duration}天体验，为您打造难忘的旅拍回忆。`,
    price: hasDiscount ? Math.floor(basePrice * 0.8) : basePrice,
    originalPrice: hasDiscount ? basePrice : undefined,
    duration,
    location,
    style,
    coverImage,
    images,
    features: [
      '专业摄影师全程跟拍',
      '精美婚纱礼服提供',
      '专业化妆造型服务',
      '精修照片30张以上',
      '视频花絮制作',
    ],
    includes: [
      '专业摄影师服务',
      '化妆造型服务',
      '精美婚纱礼服',
      '景点门票',
      '精修照片30张',
      '视频花絮',
    ],
    excludes: ['往返交通', '住宿费用', '餐饮费用'],
    maxPeople,
    isPopular,
    isHot,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const loadSelectedPackage = async () => {
  const idRaw = route.query.packageId;
  const id = Number(idRaw);
  if (!idRaw || Number.isNaN(id) || id <= 0) {
    message.warning('缺少套餐信息，正在返回套餐列表');
    router.push('/booking/packages');
    return;
  }

  orderForm.packageId = id;

  // 默认先用 mock 展示，避免后端接口尚未实现时产生 404/网络错误影响用户体验。
  selectedPackage.value = generateMockPackageById(id);

  // 若你后端已经实现了 /packages/:id，可通过环境变量打开真实请求。
  const useRealPackagesApi = import.meta.env.VITE_ENABLE_REAL_PACKAGES_API === 'true';
  if (!useRealPackagesApi) {
    restoreStateFromStorage();
    return;
  }

  try {
    const pkg = await packagesApi.getPackageDetail(id);
    selectedPackage.value = pkg;
  } catch (e) {
    // 失败就继续使用 mock，不打断页面展示
    console.warn('获取套餐详情失败，已使用 mock：', e);
  }

  // 恢复表单状态（如果上次就是同一个 packageId）
  restoreStateFromStorage();
};

const handleReset = () => {
  orderForm.contactName = '';
  orderForm.phone = '';
  orderForm.email = '';
  orderForm.shootingDate = '';
  orderForm.numberOfPeople = 1;
  orderForm.paymentMethod = 'wechat';
  orderForm.remark = '';
  sessionStorage.removeItem(STORAGE_KEY);
  orderFormRef.value?.resetFields();
};

const handleSubmit = async () => {
  if (!selectedPackage.value) return;

  submitting.value = true;
  try {
    const orderNo = `ORD-${Date.now()}`;
    const totalAmount = selectedPackage.value.price * orderForm.numberOfPeople;

    const order = {
      orderNo,
      packageId: selectedPackage.value.id,
      packageName: selectedPackage.value.name,
      location: selectedPackage.value.location,
      style: selectedPackage.value.style,
      duration: selectedPackage.value.duration,
      unitPrice: selectedPackage.value.price,
      numberOfPeople: orderForm.numberOfPeople,
      shootingDate: orderForm.shootingDate,
      contactName: orderForm.contactName,
      phone: orderForm.phone,
      email: orderForm.email || undefined,
      paymentMethod: orderForm.paymentMethod,
      remark: orderForm.remark || undefined,
      totalAmount,
      createdAt: new Date().toISOString(),
    };

    const raw = sessionStorage.getItem(ORDER_HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : [];
    history.unshift(order);
    sessionStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(history));

    successInfo.value = {
      orderNo,
      packageName: order.packageName,
      numberOfPeople: order.numberOfPeople,
      totalAmount: order.totalAmount,
    };
    successModalVisible.value = true;
    message.success('预约提交成功');

    // 清空当前表单（保留套餐信息）
    handleReset();
  } catch (e: any) {
    message.error(e?.message || '提交失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
};

const goToOrders = () => {
  successModalVisible.value = false;
  router.push('/user/orders');
};

watch(
  () => [
    orderForm.contactName,
    orderForm.phone,
    orderForm.email,
    orderForm.shootingDate,
    orderForm.numberOfPeople,
    orderForm.paymentMethod,
    orderForm.remark,
  ],
  () => saveStateToStorage(),
  { deep: false }
);

watch(
  () => selectedPackage.value,
  (pkg) => {
    if (!pkg) return;
    if (orderForm.numberOfPeople > pkg.maxPeople) {
      orderForm.numberOfPeople = pkg.maxPeople;
    }
  }
);

onMounted(() => {
  authStore.initializeAuth();
  loadSelectedPackage();
});
</script>

<style scoped lang="less">
.order-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 8px;
  }

  p {
    font-size: 1.1rem;
    opacity: 0.95;
    margin: 0;
  }
}

.content-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 26px;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.left-panel,
.right-panel {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.left-panel {
  padding: 26px;
}

.right-panel {
  padding: 26px;
}

.package-card {
  padding: 18px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  margin-bottom: 18px;
  background: linear-gradient(135deg, #fff 0%, #fafafa 100%);
}

.package-card-top {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.package-title {
  margin: 0 0 8px 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #333;
}

.package-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: #666;
  font-size: 0.9rem;

  span {
    white-space: nowrap;
  }
}

.package-price {
  text-align: right;
  min-width: 160px;

  .price-amount {
    color: #ff758c;
    font-size: 1.6rem;
    font-weight: 800;
  }

  .origin-price {
    color: #999;
    font-size: 0.9rem;
    text-decoration: line-through;
    margin-top: 4px;
  }
}

.package-image {
  :deep(.ant-image-img) {
    width: 100%;
    height: 220px;
    object-fit: cover;
    border-radius: 10px;
    display: block;
  }
}

.order-form {
  :deep(.ant-form-item-label > label) {
    font-weight: 600;
    color: #333;
  }

  :deep(.ant-input),
  :deep(.ant-select-selector),
  :deep(.ant-input-textarea) {
    border-radius: 10px;
  }
}

.submit-btn {
  height: 44px;
  min-width: 160px;
}

.summary-card {
  padding: 18px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;

  h3 {
    margin: 0 0 14px 0;
    font-size: 1.1rem;
    font-weight: 800;
    color: #333;
  }
}

.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  color: #555;
  font-size: 0.95rem;

  &.total {
    border-top: 1px solid #f0f0f0;
    margin-top: 8px;
    padding-top: 14px;
    font-size: 1.05rem;

    .value {
      color: #ff758c;
      font-weight: 900;
      font-size: 1.25rem;
    }
  }
}

.summary-tips {
  margin-top: 14px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 10px;
  padding: 12px;
  color: #8a5200;
  font-size: 0.9rem;
  line-height: 1.6;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 360px;
  color: #666;

  p {
    margin-top: 12px;
  }
}

.success-content {
  display: flex;
  flex-direction: column;
  gap: 14px;

  .success-order-no {
    font-size: 1.05rem;
    font-weight: 800;
    color: #333;
  }

  .success-summary {
    color: #666;
    line-height: 1.8;
  }

  .success-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
}
</style>
