<template>
  <div class="orders-container">
    <div class="page-header">
      <h1>📦 我的订单</h1>
      <p>使用下方切换查看「套餐浏览下单」与「个性预约」，搜索与分页均随当前类型生效</p>
    </div>

    <div class="toolbar-wrap">
      <div class="toolbar">
        <a-input
          v-model:value="keyword"
          :placeholder="
            orderViewTab === 'package'
              ? '搜索订单编号 / 手机号 / 套餐名称 / 摄影师'
              : '搜索需求编号 / 标题 / 地点 / 手机号'
          "
          allow-clear
          class="search-input"
        />
        <div class="toolbar-actions">
          <a-button :loading="loading" @click="loadOrders"> 刷新 </a-button>
          <a-popconfirm
            v-if="orderViewTab === 'package'"
            title="确认清空所有本地订单记录吗？"
            ok-text="确认"
            cancel-text="取消"
            @confirm="clearAllOrders"
          >
            <a-button danger :disabled="orders.length === 0">清空</a-button>
          </a-popconfirm>
        </div>
      </div>
      <div class="order-type-switch">
        <a-segmented v-model:value="orderViewTab" :options="orderSegmentOptions" size="middle" />
      </div>
    </div>

    <div v-show="orderViewTab === 'package'" class="content-card section-card">
      <div class="content-header section-bar">
        <div class="section-head">
          <span class="section-title">套餐浏览下单</span>
          <span class="count">共 {{ filteredPackageOrders.length }} 条</span>
        </div>
      </div>

      <div v-if="filteredPackageOrders.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p>暂无套餐预约订单（或没有匹配的搜索结果）</p>
      </div>

      <div v-else class="orders-grid">
        <div v-for="o in pagedPackageOrders" :key="o.orderNo" class="order-card">
          <div class="order-card-top">
            <div class="order-no">订单号：{{ o.orderNo }}</div>
            <div class="order-amount">¥{{ o.totalAmount.toLocaleString() }}</div>
          </div>

          <div class="order-card-meta">
            <div class="meta-item">套餐：{{ o.packageName }}</div>
            <div v-if="o.photographerName" class="meta-item">摄影师：{{ o.photographerName }}</div>
            <div class="meta-item">人数：{{ o.numberOfPeople }} 人</div>
            <div class="meta-item">联系人：{{ o.contactName }}（{{ o.phone }}）</div>
            <div class="meta-item">支付方式：{{ formatPayment(o.paymentMethod) }}</div>
            <div class="meta-item">
              支付状态：
              <span
                class="status-pill"
                :class="{ unpaid: o.paymentStatus === 'unpaid', paid: o.paymentStatus === 'paid' }"
              >
                {{ formatPaymentStatus(o.paymentStatus) }}
              </span>
            </div>
            <div class="meta-item">
              订单确认：
              <span
                class="status-pill"
                :class="{ confirmed: isOrderConfirmed(o), unconfirmed: !isOrderConfirmed(o) }"
              >
                {{ isOrderConfirmed(o) ? '已确认' : '未确认' }}
              </span>
            </div>
            <div v-if="isRescheduled(o)" class="meta-item rescheduled-mark">
              拍摄日期：{{ o.shootingDate }}（已改期）
            </div>
            <div v-if="o.rescheduleRequestStatus" class="meta-item">
              改期状态：{{ formatRescheduleStatus(o.rescheduleRequestStatus) }}
            </div>
          </div>

          <div class="order-card-bottom">
            <div class="created-at">提交时间：{{ formatDate(o.createdAt) }}</div>
            <div class="order-actions">
              <a-button type="text" @click="openDetail(o)">查看详情</a-button>
              <a-button type="text" danger @click="openDeleteModal(o.orderNo)">删除</a-button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="filteredPackageOrders.length > pageSize" class="pagination-wrap">
        <a-pagination
          v-model:current="currentPagePackage"
          :page-size="pageSize"
          :total="filteredPackageOrders.length"
          :show-size-changer="false"
          size="small"
        />
      </div>
    </div>

    <div v-show="orderViewTab === 'custom'" class="content-card section-card">
      <div class="content-header section-bar">
        <div class="section-head">
          <span class="section-title">个性预约</span>
          <span class="count">共 {{ filteredCustomRequests.length }} 条</span>
        </div>
      </div>

      <div v-if="filteredCustomRequests.length === 0" class="empty-state">
        <div class="empty-icon">🎯</div>
        <p>暂无个性预约记录（或没有匹配的搜索结果）</p>
        <a-button type="link" @click="router.push('/user/custom-requests')"
          >去发布定制需求</a-button
        >
      </div>

      <div v-else class="orders-grid">
        <div v-for="r in pagedCustomRequests" :key="'csr-' + r.id" class="order-card csr-card">
          <div class="order-card-top">
            <div class="order-no">需求编号：{{ r.requestNo }}</div>
            <a-tag :color="csrStatusColor(r.status)">{{ csrStatusText(r.status) }}</a-tag>
          </div>
          <div class="order-card-meta">
            <div class="meta-item">地点：{{ r.location }} · 风格：{{ r.style }}</div>
            <div class="meta-item">
              期望拍摄：{{ r.shootingDate }} · {{ r.duration }} 天 · {{ r.numberOfPeople }} 人
            </div>
            <div v-if="r.title" class="meta-item">标题：{{ r.title }}</div>
            <div v-if="r.photographer" class="meta-item csr-ph">
              <span class="csr-meta-k">接单摄影师</span>
              {{ r.photographer.name }}
              <span v-if="r.claimMessage" class="csr-claim-msg"
                >（留言：{{ r.claimMessage }}）</span
              >
            </div>
            <div v-else class="meta-item muted-soft">接单摄影师：暂无（等待接单中）</div>
          </div>
          <div class="order-card-bottom csr-card-bottom">
            <div class="created-at">发布：{{ formatDate(r.createdAt) }}</div>
            <div class="order-actions csr-actions">
              <template v-if="r.status === 'open'">
                <a-button type="text" @click="openCsrEdit(r)">修改需求</a-button>
                <a-popconfirm title="撤销后需求将关闭，确定？" @confirm="cancelCsr(r.id)">
                  <a-button type="text">撤销需求</a-button>
                </a-popconfirm>
                <a-popconfirm
                  title="将永久删除该需求，不可恢复，确定？"
                  ok-text="删除"
                  cancel-text="取消"
                  @confirm="deleteCsrRecord(r)"
                >
                  <a-button type="text" danger>删除记录</a-button>
                </a-popconfirm>
              </template>
              <template v-if="r.status === 'pending_user_confirm'">
                <a-button type="primary" size="small" @click="confirmPhotographerForCsr(r.id)">
                  同意该摄影师
                </a-button>
                <a-popconfirm
                  title="拒绝后需求将重新开放给其他摄影师，确定？"
                  @confirm="rejectPhotographerForCsr(r.id)"
                >
                  <a-button type="text" size="small">不同意</a-button>
                </a-popconfirm>
              </template>
              <a-button
                v-if="r.linkedBookingOrder"
                type="text"
                @click="openDetailFromLinked(r.linkedBookingOrder, r.id)"
              >
                订单详情
              </a-button>
              <a-button
                v-if="r.linkedBookingOrder && canPayLinked(r.linkedBookingOrder)"
                type="text"
                @click="openPaymentFromLinked(r.linkedBookingOrder)"
              >
                去支付
              </a-button>
              <a-button v-if="chatEligibleCsr(r)" type="text" @click="goChatFromCsr(r)">
                联系摄影师
              </a-button>
              <a-popconfirm
                v-if="r.status === 'cancelled' || r.status === 'confirmed'"
                :title="
                  r.status === 'confirmed'
                    ? '将删除本条定制需求，并同步删除关联的预约订单（不可恢复）。确定？'
                    : '从列表中永久删除该记录，确定？'
                "
                ok-text="删除"
                cancel-text="取消"
                @confirm="deleteCsrRecord(r)"
              >
                <a-button type="text" danger>删除记录</a-button>
              </a-popconfirm>
            </div>
          </div>
        </div>
      </div>
      <div v-if="filteredCustomRequests.length > pageSize" class="pagination-wrap">
        <a-pagination
          v-model:current="currentPageCustom"
          :page-size="pageSize"
          :total="filteredCustomRequests.length"
          :show-size-changer="false"
          size="small"
        />
      </div>
    </div>

    <a-modal
      v-model:open="detailVisible"
      title="订单详情"
      :footer="null"
      :width="860"
      @cancel="closeDetail"
    >
      <div v-if="activeOrder" class="detail-modal">
        <div class="detail-header">
          <div class="detail-order-no">订单号：{{ activeOrder.orderNo }}</div>
          <div class="detail-total">合计：¥{{ activeOrder.totalAmount.toLocaleString() }}</div>
        </div>

        <div class="detail-body">
          <div class="detail-section">
            <h3>套餐信息</h3>
            <div class="detail-row">
              <span class="k">套餐名称</span><span class="v">{{ activeOrder.packageName }}</span>
            </div>
            <div class="detail-row">
              <span class="k">地点</span><span class="v">{{ activeOrder.location }}</span>
            </div>
            <div class="detail-row">
              <span class="k">风格</span
              ><span class="v">{{ getStyleName(activeOrder.style) }}</span>
            </div>
            <div class="detail-row">
              <span class="k">行程天数</span><span class="v">{{ activeOrder.duration }} 天</span>
            </div>
            <div v-if="activeOrder.photographerName" class="detail-row">
              <span class="k">指定摄影师</span
              ><span class="v">{{ activeOrder.photographerName }}</span>
            </div>
            <div class="detail-row">
              <span class="k">单价</span
              ><span class="v">¥{{ activeOrder.unitPrice.toLocaleString() }}</span>
            </div>
          </div>

          <div class="detail-section">
            <h3>预约信息</h3>
            <div class="detail-row">
              <span class="k">预约人数</span
              ><span class="v">{{ activeOrder.numberOfPeople }} 人</span>
            </div>
            <div class="detail-row">
              <span class="k">拍摄日期</span>
              <span class="v">
                {{ activeOrder.shootingDate }}
                <a-tag v-if="isRescheduled(activeOrder)" color="green" style="margin-left: 6px"
                  >已改期</a-tag
                >
                <a-button
                  v-if="canRequestReschedule(activeOrder)"
                  type="link"
                  size="small"
                  style="padding: 0 0 0 8px"
                  @click="openRescheduleModal(activeOrder)"
                >
                  申请改期
                </a-button>
              </span>
            </div>
            <div v-if="activeOrder.rescheduleRequestStatus" class="detail-row">
              <span class="k">改期审批</span>
              <span class="v">{{
                formatRescheduleStatus(activeOrder.rescheduleRequestStatus)
              }}</span>
            </div>
            <div v-if="activeOrder.rescheduleReviewNote" class="detail-row">
              <span class="k">审批备注</span>
              <span class="v">{{ activeOrder.rescheduleReviewNote }}</span>
            </div>
            <div class="detail-row">
              <span class="k">支付方式</span
              ><span class="v">{{ formatPayment(activeOrder.paymentMethod) }}</span>
            </div>
            <div class="detail-row">
              <span class="k">支付状态</span
              ><span class="v">
                <span
                  class="status-pill"
                  :class="{
                    unpaid: activeOrder.paymentStatus === 'unpaid',
                    paid: activeOrder.paymentStatus === 'paid',
                  }"
                >
                  {{ formatPaymentStatus(activeOrder.paymentStatus) }}
                </span>
              </span>
            </div>
            <div class="detail-row">
              <span class="k">订单确认</span>
              <span class="v">
                <span
                  class="status-pill"
                  :class="{
                    confirmed: isOrderConfirmed(activeOrder),
                    unconfirmed: !isOrderConfirmed(activeOrder),
                  }"
                >
                  {{ isOrderConfirmed(activeOrder) ? '已确认' : '未确认' }}
                </span>
              </span>
            </div>
            <div v-if="isOrderConfirmed(activeOrder) && activeOrder.workerName" class="detail-row">
              <span class="k">确认人员</span><span class="v">{{ activeOrder.workerName }}</span>
            </div>
            <div class="detail-row">
              <span class="k">支付时间</span
              ><span class="v">{{
                activeOrder.paidAt ? formatDate(activeOrder.paidAt) : '-'
              }}</span>
            </div>
            <div class="detail-row">
              <span class="k">提交时间</span
              ><span class="v">{{ formatDate(activeOrder.createdAt) }}</span>
            </div>
            <div v-if="activeOrder.photographerName" class="detail-row">
              <span class="k">沟通</span>
              <span class="v">
                <a-button
                  type="link"
                  size="small"
                  style="padding-right: 0"
                  @click="goChatWithPhotographer(activeOrder)"
                >
                  联系摄影师
                </a-button>
              </span>
            </div>
            <div v-if="canCheckOnlinePayment(activeOrder)" class="detail-row">
              <span class="k">支付</span>
              <span class="v">
                <a-button
                  type="link"
                  size="small"
                  style="padding-right: 0"
                  @click="openPaymentModal(activeOrder)"
                >
                  去支付
                </a-button>
              </span>
            </div>
          </div>

          <div class="detail-section">
            <h3>联系人</h3>
            <div class="detail-row">
              <span class="k">姓名</span><span class="v">{{ activeOrder.contactName }}</span>
            </div>
            <div class="detail-row">
              <span class="k">手机号</span><span class="v">{{ activeOrder.phone }}</span>
            </div>
            <div class="detail-row">
              <span class="k">邮箱</span><span class="v">{{ activeOrder.email || '-' }}</span>
            </div>
          </div>

          <div class="detail-section">
            <h3>备注</h3>
            <div class="detail-remark">{{ activeOrder.remark || '—' }}</div>
          </div>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="deleteModalVisible"
      title="确认删除订单"
      :width="460"
      ok-text="确认删除"
      cancel-text="取消"
      centered
      @ok="confirmDeleteOrder"
      @cancel="closeDeleteModal"
    >
      <div class="delete-modal-body">删除后不可恢复，确认删除该订单吗？</div>
    </a-modal>

    <a-modal
      v-model:open="paymentModalVisible"
      title="扫码支付"
      :footer="null"
      :width="480"
      @cancel="closePaymentModal"
    >
      <div class="payment-modal-body">
        <a-spin :spinning="paymentLoading">
          <template v-if="paymentInfo">
            <div class="payment-summary">
              <div>订单号：{{ paymentInfo.orderNo }}</div>
              <div>支付方式：{{ formatPayment(paymentInfo.paymentMethod) }}</div>
              <div>应付金额：¥{{ paymentInfo.totalAmount.toLocaleString() }}</div>
            </div>
            <div class="payment-qr-wrap">
              <a-image
                v-if="paymentInfo.qrCodeDataUrl"
                :src="paymentInfo.qrCodeDataUrl"
                :preview="false"
                class="payment-qr-img"
              />
              <div v-else class="payment-qr-empty">二维码加载中...</div>
            </div>
            <div class="payment-hint">
              {{ paymentInfo.hint || '请使用对应支付 App 扫码完成支付' }}
            </div>
            <div class="payment-actions">
              <a-button type="primary" :loading="paymentSubmitting" @click="confirmPaidAndClose">
                已支付
              </a-button>
            </div>
          </template>
        </a-spin>
      </div>
    </a-modal>

    <a-modal
      v-model:open="rescheduleModalVisible"
      title="申请改期（免费一次）"
      :confirm-loading="rescheduleSubmitting"
      ok-text="提交申请"
      cancel-text="取消"
      @ok="submitRescheduleRequest"
      @cancel="closeRescheduleModal"
    >
      <div class="reschedule-modal-body">
        <div v-if="rescheduleTarget" class="reschedule-current">
          当前拍摄日期：{{ rescheduleTarget.shootingDate }}
        </div>
        <div class="reschedule-calendar">
          <div class="calendar-header">
            <a-button size="small" @click="goPrevRescheduleMonth">上个月</a-button>
            <span class="calendar-title">{{ rescheduleCalendarTitle }}</span>
            <a-button size="small" @click="goNextRescheduleMonth">下个月</a-button>
          </div>
          <div class="calendar-legend">
            <span class="legend-item available">可改</span>
            <span class="legend-item booked">已约</span>
            <span class="legend-item rest">休息</span>
            <span class="legend-item unavailable">不可改</span>
          </div>
          <div class="calendar-weekdays">
            <span v-for="w in ['日', '一', '二', '三', '四', '五', '六']" :key="w">{{ w }}</span>
          </div>
          <div class="calendar-grid">
            <button
              v-for="cell in rescheduleCalendarCells"
              :key="cell.date"
              type="button"
              class="calendar-day"
              :class="[
                cell.status,
                {
                  muted: !cell.inCurrentMonth,
                  selected: rescheduleForm.newShootingDate === cell.date,
                },
              ]"
              :disabled="!cell.inCurrentMonth || cell.status !== 'available'"
              @click="selectRescheduleDate(cell.date)"
            >
              <span class="day-num">{{ cell.day }}</span>
              <span class="day-status">
                {{
                  cell.status === 'available'
                    ? '可改'
                    : cell.status === 'booked'
                      ? '已约'
                      : cell.status === 'rest'
                        ? '休息'
                        : '不可改'
                }}
              </span>
            </button>
          </div>
        </div>
        <div class="reschedule-current">
          已选新日期：{{ rescheduleForm.newShootingDate || '未选择' }}
        </div>
        <a-textarea
          v-model:value="rescheduleForm.reason"
          :rows="3"
          :maxlength="120"
          show-count
          placeholder="改期原因（选填）"
          style="margin-top: 10px"
        />
        <div class="reschedule-tip">仅支持拍摄日前3天及以上免费改期一次，需管理员审批。</div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="csrEditVisible"
      title="修改需求"
      :confirm-loading="csrEditSubmitting"
      ok-text="保存"
      cancel-text="取消"
      :width="640"
      destroy-on-close
      @ok="submitCsrEdit"
      @cancel="closeCsrEditModal"
    >
      <a-form layout="vertical" class="csr-edit-form">
        <a-form-item label="标题（可选）">
          <a-input v-model:value="csrEditForm.title" placeholder="如：三亚海边婚纱照" />
        </a-form-item>
        <a-form-item label="补充说明（可选）">
          <a-textarea
            v-model:value="csrEditForm.description"
            :rows="3"
            placeholder="特殊想法、服装偏好等"
          />
        </a-form-item>
        <a-form-item label="拍摄地点" required>
          <a-input v-model:value="csrEditForm.location" placeholder="城市或具体区域" />
        </a-form-item>
        <a-form-item label="风格" required>
          <a-input v-model:value="csrEditForm.style" placeholder="如 romantic / 韩系清新" />
        </a-form-item>
        <a-form-item label="期望拍摄日" required extra="请在日历中选择，格式为 YYYY-MM-DD">
          <a-date-picker
            v-model:value="csrEditShootingDateDayjs"
            format="YYYY-MM-DD"
            style="width: 100%"
            placeholder="请选择期望拍摄日"
            :locale="datePickerLocaleZhCN"
            :disabled-date="disabledCsrEditShootingDate"
          />
        </a-form-item>
        <a-form-item label="行程天数">
          <a-input-number
            v-model:value="csrEditForm.duration"
            :min="1"
            :max="30"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="人数">
          <a-input-number
            v-model:value="csrEditForm.numberOfPeople"
            :min="1"
            :max="20"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="预算参考（元，可选）">
          <a-input-number v-model:value="csrEditForm.budgetHint" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="联系人" required>
          <a-input v-model:value="csrEditForm.contactName" />
        </a-form-item>
        <a-form-item label="手机号" required extra="11 位数字，以 1 开头（中国大陆手机号）">
          <a-input
            v-model:value="csrEditForm.phone"
            maxlength="11"
            inputmode="numeric"
            autocomplete="tel"
            placeholder="如 13800138000"
            @blur="sanitizeCsrEditPhone"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import { TRAVEL_STYLE_LABELS } from '@/constants/travel-style-labels';
import { useAuthStore } from '@/store/auth';
import { paymentsApi } from '@/api/payments';
import { ordersApi } from '@/api/orders';
import { photographersApi } from '@/api/photographers';
import {
  customShootRequestsApi,
  type CreateCustomShootBody,
  type CustomShootRequestRow,
  type LinkedBookingOrder,
} from '@/api/customShootRequests';
import datePickerLocaleZhCN from 'ant-design-vue/es/date-picker/locale/zh_CN';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');
import {
  mergeBookingOrderIntoLocalHistory,
  removeOrderFromLocalHistory,
} from '@/utils/mergeOnlineOrderHistory';

type PaymentMethod = 'wechat' | 'alipay' | 'offline' | string;

interface BookingOrder {
  orderNo: string;
  /** 服务端订单主键，用于发起 prepay */
  orderId?: number;
  packageId: number;
  packageName: string;
  location: string;
  style: string;
  duration: number;
  unitPrice: number;
  numberOfPeople: number;
  shootingDate: string;
  contactName: string;
  phone: string;
  email?: string;
  paymentMethod: PaymentMethod;
  paymentStatus?: string;
  paymentNo?: string;
  paidAt?: string;
  remark?: string;
  photographerId?: number;
  photographerName?: string;
  workerUserId?: number;
  workerName?: string;
  workerTakenAt?: string;
  totalAmount: number;
  createdAt: string;
  rescheduleCount?: number;
  rescheduleRequestStatus?: 'pending' | 'approved' | 'rejected' | string;
  rescheduleRequestedDate?: string;
  rescheduleRequestReason?: string;
  rescheduleRequestedAt?: string;
  rescheduleReviewNote?: string;
  rescheduleReviewedAt?: string;
  /** 来自定制旅拍确认后的关联订单 */
  customShootRequestId?: number | null;
  /** 本地合并标记：custom_shoot 表示由个性预约生成 */
  orderSource?: string;
}

const STORAGE_KEY = 'online-order-history';

const readOrderHistoryStorage = (): string | null => {
  let raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      localStorage.setItem(STORAGE_KEY, raw);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }
  return raw;
};
const writeOrderHistoryStorage = (json: string) => {
  localStorage.setItem(STORAGE_KEY, json);
};

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const keyword = ref('');
const orderViewTab = ref<'package' | 'custom'>('package');
const orderSegmentOptions = [
  { label: '套餐浏览下单', value: 'package' },
  { label: '个性预约', value: 'custom' },
];
const orders = ref<BookingOrder[]>([]);
const customRequests = ref<CustomShootRequestRow[]>([]);
const currentPagePackage = ref(1);
const currentPageCustom = ref(1);
const pageSize = 6;

const detailVisible = ref(false);
const activeOrder = ref<BookingOrder | null>(null);
const paymentModalVisible = ref(false);
const paymentLoading = ref(false);
const paymentSubmitting = ref(false);
let paymentPollTimer: ReturnType<typeof setInterval> | null = null;
const paymentInfo = ref<{
  orderNo: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  qrCodeDataUrl?: string;
  codeUrl?: string;
  hint?: string;
} | null>(null);
const deleteModalVisible = ref(false);
const pendingDeleteOrderNo = ref('');
const rescheduleModalVisible = ref(false);
const rescheduleSubmitting = ref(false);
const rescheduleTarget = ref<BookingOrder | null>(null);
const rescheduleForm = ref({
  newShootingDate: '',
  reason: '',
});
const rescheduleAvailableDates = ref<string[]>([]);
const rescheduleRestDates = ref<string[]>([]);
const rescheduleBookedDates = ref<string[]>([]);
const rescheduleCalendarMonth = ref(new Date());

const csrEditVisible = ref(false);
const csrEditSubmitting = ref(false);
const csrEditId = ref<number | null>(null);
const csrEditShootingDateDayjs = ref<Dayjs | null>(null);
const csrEditForm = reactive<CreateCustomShootBody>({
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

/** 与 CustomShootRequests 发布页一致 */
const CN_MOBILE_REGEX = /^1[3-9]\d{9}$/;

function disabledCsrEditShootingDate(current: Dayjs) {
  return current != null && current < dayjs().startOf('day');
}

function sanitizeCsrEditPhone() {
  csrEditForm.phone = (csrEditForm.phone || '').replace(/\D/g, '').slice(0, 11);
}

function openCsrEdit(r: CustomShootRequestRow) {
  csrEditId.value = r.id;
  csrEditForm.title = r.title ?? '';
  csrEditForm.description = r.description ?? '';
  csrEditForm.location = r.location;
  csrEditForm.style = r.style;
  csrEditForm.shootingDate = r.shootingDate;
  csrEditForm.duration = r.duration;
  csrEditForm.numberOfPeople = r.numberOfPeople;
  csrEditForm.budgetHint = r.budgetHint ?? undefined;
  csrEditForm.contactName = r.contactName;
  csrEditForm.phone = r.phone;
  csrEditShootingDateDayjs.value = r.shootingDate
    ? dayjs(String(r.shootingDate).split('T')[0])
    : null;
  csrEditVisible.value = true;
}

function closeCsrEditModal() {
  csrEditVisible.value = false;
  csrEditId.value = null;
}

async function submitCsrEdit() {
  if (csrEditId.value == null) {
    throw new Error('no id');
  }
  csrEditForm.shootingDate = csrEditShootingDateDayjs.value
    ? csrEditShootingDateDayjs.value.format('YYYY-MM-DD')
    : '';
  sanitizeCsrEditPhone();

  const fail = (msg: string) => {
    message.warning(msg);
    return Promise.reject(new Error('validation'));
  };

  if (!csrEditForm.location?.trim() || !csrEditForm.style?.trim()) {
    return fail('请填写拍摄地点与风格');
  }
  if (!csrEditForm.shootingDate.trim()) {
    return fail('请在日历中选择期望拍摄日');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(csrEditForm.shootingDate)) {
    return fail('期望拍摄日格式须为 YYYY-MM-DD');
  }
  if (!csrEditForm.contactName?.trim()) {
    return fail('请填写联系人');
  }
  if (!csrEditForm.phone?.trim()) {
    return fail('请填写手机号');
  }
  if (!CN_MOBILE_REGEX.test(csrEditForm.phone)) {
    return fail('手机号须为 11 位中国大陆号码（以 1 开头，第二位为 3–9）');
  }

  csrEditSubmitting.value = true;
  try {
    await customShootRequestsApi.update(csrEditId.value, {
      ...csrEditForm,
      title: csrEditForm.title?.trim() || undefined,
      description: csrEditForm.description?.trim() || undefined,
      budgetHint: csrEditForm.budgetHint || undefined,
      phone: csrEditForm.phone.trim(),
    });
    message.success('需求已更新');
    closeCsrEditModal();
    await loadOrders();
  } catch (e) {
    /* http 拦截器已提示；需向上抛出，避免 Modal 在请求失败时仍关闭 */
    throw e;
  } finally {
    csrEditSubmitting.value = false;
  }
}

const styleMap: Record<string, string> = { ...TRAVEL_STYLE_LABELS };

/** 本地订单是否属于个性预约链路（不放在「套餐浏览」列表） */
const isCustomDerivedLocalOrder = (o: BookingOrder) =>
  (o.customShootRequestId != null && Number(o.customShootRequestId) > 0) ||
  o.orderSource === 'custom_shoot';

const csrStatusText = (s: string) => {
  const m: Record<string, string> = {
    open: '待接单',
    pending_user_confirm: '待您确认摄影师',
    confirmed: '已确认合作',
    cancelled: '已撤销',
  };
  return m[s] || s;
};

const csrStatusColor = (s: string) => {
  if (s === 'open') return 'blue';
  if (s === 'pending_user_confirm') return 'orange';
  if (s === 'confirmed') return 'green';
  return 'default';
};

function linkedToBookingOrder(linked: LinkedBookingOrder, csrId?: number): BookingOrder {
  const wt = linked.workerTakenAt;
  const ca = linked.createdAt;
  return {
    orderNo: linked.orderNo,
    orderId: linked.id,
    packageId: linked.packageId ?? 0,
    packageName: linked.packageName,
    location: linked.location,
    style: linked.style,
    duration: linked.duration,
    unitPrice: linked.unitPrice,
    numberOfPeople: linked.numberOfPeople,
    shootingDate: linked.shootingDate,
    contactName: linked.contactName,
    phone: linked.phone,
    email: linked.email ?? undefined,
    paymentMethod: linked.paymentMethod as PaymentMethod,
    paymentStatus: linked.paymentStatus,
    totalAmount: linked.totalAmount,
    photographerId: linked.photographerId ?? undefined,
    photographerName: linked.photographerName ?? undefined,
    workerUserId: linked.workerUserId ?? undefined,
    workerName: linked.workerName ?? undefined,
    workerTakenAt:
      typeof wt === 'string'
        ? wt
        : wt instanceof Date
          ? wt.toISOString()
          : wt
            ? String(wt)
            : undefined,
    createdAt:
      typeof ca === 'string'
        ? ca
        : ca instanceof Date
          ? ca.toISOString()
          : new Date().toISOString(),
    customShootRequestId: linked.customShootRequestId ?? csrId,
    orderSource: 'custom_shoot',
  };
}

const getStyleName = (style: string) => styleMap[style] || style;

const formatPayment = (method: PaymentMethod) => {
  if (method === 'wechat') return '微信支付';
  if (method === 'alipay') return '支付宝';
  if (method === 'offline') return '线下支付';
  return method || '-';
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return Number.isNaN(d.getTime()) ? dateString : d.toLocaleString('zh-CN');
};

const formatPaymentStatus = (status?: string) => {
  if (!status) return '-';
  if (status === 'unpaid') return '待支付';
  if (status === 'paid') return '已支付';
  if (status === 'offline_pending') return '线下待支付';
  return status;
};

const formatRescheduleStatus = (status?: string) => {
  if (!status) return '-';
  if (status === 'pending') return '待审批';
  if (status === 'approved') return '已通过';
  if (status === 'rejected') return '已驳回';
  return status;
};

const isRescheduled = (o: BookingOrder) =>
  (o.rescheduleCount || 0) > 0 || o.rescheduleRequestStatus === 'approved';
const isOrderConfirmed = (o: BookingOrder | null | undefined) =>
  !!o && (Number(o.workerUserId || 0) > 0 || !!String(o.workerTakenAt || '').trim());

const toIsoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const rescheduleAvailableSet = computed(() => new Set(rescheduleAvailableDates.value));
const rescheduleRestSet = computed(() => new Set(rescheduleRestDates.value));
const rescheduleBookedSet = computed(() => new Set(rescheduleBookedDates.value));

const rescheduleCalendarTitle = computed(() => {
  const y = rescheduleCalendarMonth.value.getFullYear();
  const m = rescheduleCalendarMonth.value.getMonth() + 1;
  return `${y}年${m}月`;
});

const getRescheduleDateStatus = (iso: string): 'available' | 'booked' | 'rest' | 'unavailable' => {
  const todayIso = toIsoDate(new Date());
  if (rescheduleBookedSet.value.has(iso)) return 'booked';
  if (rescheduleRestSet.value.has(iso)) return 'rest';
  if (rescheduleAvailableSet.value.has(iso) && iso >= todayIso) return 'available';
  return 'unavailable';
};

const rescheduleCalendarCells = computed(() => {
  const base = new Date(
    rescheduleCalendarMonth.value.getFullYear(),
    rescheduleCalendarMonth.value.getMonth(),
    1
  );
  const firstWeekday = base.getDay();
  const start = new Date(base);
  start.setDate(base.getDate() - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toIsoDate(d);
    return {
      date: iso,
      day: d.getDate(),
      inCurrentMonth: d.getMonth() === base.getMonth(),
      status: getRescheduleDateStatus(iso),
    };
  });
});

const goPrevRescheduleMonth = () => {
  const d = rescheduleCalendarMonth.value;
  rescheduleCalendarMonth.value = new Date(d.getFullYear(), d.getMonth() - 1, 1);
};

const goNextRescheduleMonth = () => {
  const d = rescheduleCalendarMonth.value;
  rescheduleCalendarMonth.value = new Date(d.getFullYear(), d.getMonth() + 1, 1);
};

const selectRescheduleDate = (iso: string) => {
  if (getRescheduleDateStatus(iso) !== 'available') return;
  rescheduleForm.value.newShootingDate = iso;
};

const parseOrders = (raw: string | null): BookingOrder[] => {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list as BookingOrder[];
  } catch {
    return [];
  }
};

const loadOrders = async () => {
  loading.value = true;
  try {
    const [raw, csrList, myOrders] = await Promise.all([
      Promise.resolve(readOrderHistoryStorage()),
      customShootRequestsApi.listMine().catch(() => [] as CustomShootRequestRow[]),
      ordersApi.getMyOrders().catch(() => [] as any[]),
    ]);
    customRequests.value = Array.isArray(csrList) ? csrList : [];
    const localList = parseOrders(raw);
    const serverList = (Array.isArray(myOrders) ? myOrders : []).map((o: any) => ({
      orderNo: String(o.orderNo || ''),
      orderId: Number(o.id || 0) || undefined,
      packageId: Number(o.packageId || 0) || 0,
      packageName: String(o.packageName || ''),
      location: String(o.location || ''),
      style: String(o.style || ''),
      duration: Number(o.duration || 0) || 0,
      unitPrice: Number(o.unitPrice || 0) || 0,
      numberOfPeople: Number(o.numberOfPeople || 1) || 1,
      shootingDate: String(o.shootingDate || ''),
      contactName: String(o.contactName || ''),
      phone: String(o.phone || ''),
      email: o.email || undefined,
      paymentMethod: String(o.paymentMethod || ''),
      paymentStatus: String(o.paymentStatus || ''),
      paymentNo: o.paymentNo || undefined,
      paidAt: o.paidAt || undefined,
      remark: o.remark || undefined,
      photographerId: Number(o.photographerId || 0) || undefined,
      photographerName: o.photographerName || undefined,
      workerUserId: Number(o.workerUserId || 0) || undefined,
      workerName: o.workerName || undefined,
      workerTakenAt: o.workerTakenAt || undefined,
      totalAmount: Number(o.totalAmount || 0) || 0,
      createdAt: String(o.createdAt || new Date().toISOString()),
      rescheduleCount: Number(o.rescheduleCount || 0) || 0,
      rescheduleRequestStatus: o.rescheduleRequestStatus || undefined,
      rescheduleRequestedDate: o.rescheduleRequestedDate || undefined,
      rescheduleRequestReason: o.rescheduleRequestReason || undefined,
      rescheduleRequestedAt: o.rescheduleRequestedAt || undefined,
      rescheduleReviewNote: o.rescheduleReviewNote || undefined,
      rescheduleReviewedAt: o.rescheduleReviewedAt || undefined,
      customShootRequestId: o.customShootRequestId ?? undefined,
      orderSource: o.customShootRequestId ? 'custom_shoot' : undefined,
    })) as BookingOrder[];
    const mergedMap = new Map<string, BookingOrder>();
    for (const item of localList) mergedMap.set(item.orderNo, item);
    for (const item of serverList) {
      if (!item.orderNo) continue;
      const prev = mergedMap.get(item.orderNo);
      mergedMap.set(item.orderNo, prev ? ({ ...prev, ...item } as BookingOrder) : item);
    }
    const list = Array.from(mergedMap.values()).sort((a, b) =>
      String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    );
    const normalized = list.map((o) => ({
      ...o,
      totalAmount: Number(o.totalAmount ?? 0),
      unitPrice: Number(o.unitPrice ?? 0),
      numberOfPeople: Number(o.numberOfPeople ?? 1),
      duration: Number(o.duration ?? 0),
    }));
    const synced = await Promise.all(
      normalized.map(async (o) => {
        if (!o.orderId) return o;
        try {
          const latest: any = await ordersApi.getOrderById(o.orderId);
          return {
            ...o,
            shootingDate: latest?.shootingDate || o.shootingDate,
            workerUserId: Number(latest?.workerUserId ?? o.workerUserId ?? 0) || undefined,
            workerName: latest?.workerName || o.workerName,
            workerTakenAt: latest?.workerTakenAt || o.workerTakenAt,
            rescheduleCount: Number(latest?.rescheduleCount ?? o.rescheduleCount ?? 0),
            rescheduleRequestStatus: latest?.rescheduleRequestStatus || o.rescheduleRequestStatus,
            rescheduleRequestedDate: latest?.rescheduleRequestedDate || o.rescheduleRequestedDate,
            rescheduleReviewNote: latest?.rescheduleReviewNote || o.rescheduleReviewNote,
            rescheduleReviewedAt: latest?.rescheduleReviewedAt || o.rescheduleReviewedAt,
            customShootRequestId:
              latest?.customShootRequestId ?? (o as BookingOrder).customShootRequestId,
          } as BookingOrder;
        } catch {
          return o;
        }
      })
    );
    orders.value = synced;
    writeOrderHistoryStorage(JSON.stringify(synced));
  } catch (e: any) {
    console.error('加载订单失败:', e);
    message.error('加载订单失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

const saveOrdersToStorage = (next: BookingOrder[]) => {
  writeOrderHistoryStorage(JSON.stringify(next));
  orders.value = next;
};

const deleteOrder = (orderNo: string) => {
  const next = orders.value.filter((o) => o.orderNo !== orderNo);
  saveOrdersToStorage(next);
  message.success('订单已删除');
};

const openDeleteModal = (orderNo: string) => {
  pendingDeleteOrderNo.value = orderNo;
  deleteModalVisible.value = true;
};

const closeDeleteModal = () => {
  deleteModalVisible.value = false;
  pendingDeleteOrderNo.value = '';
};

const confirmDeleteOrder = () => {
  if (!pendingDeleteOrderNo.value) return;
  deleteOrder(pendingDeleteOrderNo.value);
  closeDeleteModal();
};

const clearAllOrders = () => {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  orders.value = [];
  message.success('已清空套餐订单本地记录');
  void loadOrders();
};

const goChatWithPhotographer = (o: BookingOrder) => {
  const pid = Number(o.photographerId ?? 0);
  router.push({
    path: '/user/chat',
    query: {
      orderNo: o.orderNo,
      peerName: o.photographerName || '工作人员',
      shootingDate: String(o.shootingDate || ''),
      ...(Number.isFinite(pid) && pid > 0 ? { photographerId: String(pid) } : {}),
    },
  });
};

const openDetail = (order: BookingOrder) => {
  activeOrder.value = order;
  detailVisible.value = true;
};

const closeDetail = () => {
  detailVisible.value = false;
  activeOrder.value = null;
};

const canCheckOnlinePayment = (o: BookingOrder) => {
  const onlineMethods = ['wechat', 'alipay'];
  return onlineMethods.includes(o.paymentMethod as string) && o.paymentStatus === 'unpaid';
};

const canRequestReschedule = (o: BookingOrder) => {
  if (!o.orderId) return false;
  if ((o.rescheduleCount || 0) >= 1) return false;
  if (o.rescheduleRequestStatus === 'pending') return false;
  if (o.paymentStatus === 'cancelled') return false;
  const d = new Date(`${o.shootingDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  return diff >= 3;
};

const openRescheduleModal = (order: BookingOrder) => {
  closeDetail();
  rescheduleTarget.value = order;
  rescheduleForm.value = {
    newShootingDate: '',
    reason: '',
  };
  rescheduleAvailableDates.value = [];
  rescheduleRestDates.value = [];
  rescheduleBookedDates.value = [];
  const [y, m] = String(order.shootingDate || '')
    .split('-')
    .map((x) => Number(x));
  rescheduleCalendarMonth.value = y && m ? new Date(y, m - 1, 1) : new Date();
  rescheduleModalVisible.value = true;
  void loadRescheduleCalendar(order);
};

const closeRescheduleModal = () => {
  rescheduleTarget.value = null;
  rescheduleAvailableDates.value = [];
  rescheduleRestDates.value = [];
  rescheduleBookedDates.value = [];
  rescheduleModalVisible.value = false;
};

const loadRescheduleCalendar = async (order: BookingOrder) => {
  if (!order.photographerId) return;
  try {
    const [p, booked] = await Promise.all([
      photographersApi.getPublicOne(order.photographerId),
      ordersApi.getPhotographerBookedDates(order.photographerId),
    ]);
    const available = Array.isArray(p.availableDates) ? p.availableDates : [];
    const rest = Array.isArray(p.restDates) ? p.restDates : [];
    rescheduleAvailableDates.value = available
      .map((x) => String(x).trim())
      .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
    rescheduleRestDates.value = rest
      .map((x) => String(x).trim())
      .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
    rescheduleBookedDates.value = (Array.isArray(booked) ? booked : [])
      .map((x) => String(x).trim())
      .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
  } catch {
    rescheduleAvailableDates.value = [];
    rescheduleRestDates.value = [];
    rescheduleBookedDates.value = [];
  }
};

const submitRescheduleRequest = async () => {
  const target = rescheduleTarget.value;
  if (!target?.orderId) {
    message.error('订单缺少服务端ID，暂无法申请改期');
    return;
  }
  if (!rescheduleForm.value.newShootingDate) {
    message.warning('请选择新拍摄日期');
    return;
  }
  if (getRescheduleDateStatus(rescheduleForm.value.newShootingDate) !== 'available') {
    message.warning('请在该摄影师可预约档期内选择可改日期');
    return;
  }
  rescheduleSubmitting.value = true;
  try {
    const updated: any = await ordersApi.requestReschedule(target.orderId, {
      newShootingDate: rescheduleForm.value.newShootingDate,
      reason: rescheduleForm.value.reason || undefined,
    });
    const idx = orders.value.findIndex((x) => x.orderNo === target.orderNo);
    if (idx !== -1) {
      orders.value[idx] = {
        ...orders.value[idx],
        rescheduleRequestStatus: updated?.rescheduleRequestStatus || 'pending',
        rescheduleRequestedDate:
          updated?.rescheduleRequestedDate || rescheduleForm.value.newShootingDate,
        rescheduleRequestReason:
          updated?.rescheduleRequestReason || rescheduleForm.value.reason || undefined,
        rescheduleRequestedAt: updated?.rescheduleRequestedAt || new Date().toISOString(),
      };
      writeOrderHistoryStorage(JSON.stringify(orders.value));
    }
    message.success('改期申请已提交，等待管理员审批');
    closeRescheduleModal();
  } catch (e: any) {
    message.error(e?.message || '提交改期申请失败');
  } finally {
    rescheduleSubmitting.value = false;
  }
};

const stopPaymentPoll = () => {
  if (paymentPollTimer) {
    clearInterval(paymentPollTimer);
    paymentPollTimer = null;
  }
};

const markOrderPaidLocal = (orderNo: string) => {
  const raw = readOrderHistoryStorage();
  const history = raw ? parseOrders(raw) : [];
  const idx = history.findIndex((x: any) => x.orderNo === orderNo);
  if (idx === -1) return;
  history[idx] = {
    ...history[idx],
    paymentStatus: 'paid',
    paidAt: new Date().toISOString(),
  };
  writeOrderHistoryStorage(JSON.stringify(history));
  orders.value = history as BookingOrder[];
};

const handlePaymentSuccess = (orderNo: string) => {
  markOrderPaidLocal(orderNo);
  stopPaymentPoll();
  paymentModalVisible.value = false;
  paymentInfo.value = null;
  message.success('支付成功');
  void loadOrders();
};

const startPaymentPoll = () => {
  stopPaymentPoll();
  const orderNo = paymentInfo.value?.orderNo;
  if (!orderNo) return;
  paymentPollTimer = setInterval(async () => {
    try {
      const st = await paymentsApi.getStatus(orderNo);
      if (st.paid) {
        handlePaymentSuccess(orderNo);
      }
    } catch {
      /* ignore */
    }
  }, 2500);
};

const openPaymentModal = async (order: BookingOrder) => {
  if (!order.orderId) {
    message.error('订单缺少支付信息（orderId），请重新下单或联系管理员');
    return;
  }
  paymentLoading.value = true;
  paymentInfo.value = null;
  paymentModalVisible.value = true;
  try {
    const channel = order.paymentMethod === 'alipay' ? 'alipay' : 'wechat';
    const data = await paymentsApi.prepay({
      orderId: order.orderId,
      channel,
    });
    paymentInfo.value = {
      orderNo: order.orderNo,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      qrCodeDataUrl: data.qrCodeDataUrl,
      codeUrl: data.codeUrl,
      hint: data.hint,
    };
    startPaymentPoll();
  } catch (e: any) {
    paymentModalVisible.value = false;
    message.error(e?.message || '获取支付二维码失败');
  } finally {
    paymentLoading.value = false;
  }
};

const confirmPaidAndClose = async () => {
  const orderNo = paymentInfo.value?.orderNo;
  if (!orderNo) return;
  paymentSubmitting.value = true;
  try {
    await paymentsApi.demoComplete({ orderNo });
    handlePaymentSuccess(orderNo);
  } catch (e: any) {
    message.error(e?.message || '操作失败，请稍后重试');
  } finally {
    paymentSubmitting.value = false;
  }
};

const closePaymentModal = () => {
  stopPaymentPoll();
  paymentInfo.value = null;
};

const filteredPackageOrders = computed(() => {
  const base = orders.value.filter((o) => !isCustomDerivedLocalOrder(o));
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return base;
  return base.filter((o) => {
    return (
      (o.orderNo || '').toLowerCase().includes(kw) ||
      (o.phone || '').toLowerCase().includes(kw) ||
      (o.packageName || '').toLowerCase().includes(kw) ||
      (o.photographerName || '').toLowerCase().includes(kw)
    );
  });
});

const filteredCustomRequests = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return customRequests.value;
  return customRequests.value.filter((r) => {
    return (
      (r.requestNo || '').toLowerCase().includes(kw) ||
      (r.title || '').toLowerCase().includes(kw) ||
      (r.location || '').toLowerCase().includes(kw) ||
      (r.style || '').toLowerCase().includes(kw) ||
      (r.phone || '').toLowerCase().includes(kw) ||
      (r.photographer?.name || '').toLowerCase().includes(kw)
    );
  });
});

const pagedPackageOrders = computed(() => {
  const start = (currentPagePackage.value - 1) * pageSize;
  return filteredPackageOrders.value.slice(start, start + pageSize);
});

const pagedCustomRequests = computed(() => {
  const start = (currentPageCustom.value - 1) * pageSize;
  return filteredCustomRequests.value.slice(start, start + pageSize);
});

const ensurePageInRange = () => {
  const tp = Math.max(1, Math.ceil(filteredPackageOrders.value.length / pageSize));
  if (currentPagePackage.value > tp) currentPagePackage.value = tp;
  if (currentPagePackage.value < 1) currentPagePackage.value = 1;
  const tc = Math.max(1, Math.ceil(filteredCustomRequests.value.length / pageSize));
  if (currentPageCustom.value > tc) currentPageCustom.value = tc;
  if (currentPageCustom.value < 1) currentPageCustom.value = 1;
};

const openDetailFromLinked = (linked: LinkedBookingOrder, csrId: number) => {
  openDetail(linkedToBookingOrder(linked, csrId));
};

const canPayLinked = (linked: LinkedBookingOrder) => {
  const o = linkedToBookingOrder(linked);
  return canCheckOnlinePayment(o);
};

const openPaymentFromLinked = (linked: LinkedBookingOrder) => {
  openPaymentModal(linkedToBookingOrder(linked));
};

/** 与定制旅拍需求页一致：需有关联订单号与摄影师 ID 方可发起会话 */
const chatEligibleCsr = (r: CustomShootRequestRow) => {
  const pid = r.photographer?.id ?? r.linkedBookingOrder?.photographerId;
  return !!pid && !!r.linkedBookingOrder?.orderNo;
};

const goChatFromCsr = (r: CustomShootRequestRow) => {
  const bo = r.linkedBookingOrder;
  const pid = Number(r.photographer?.id ?? bo?.photographerId ?? 0);
  const orderNo = bo?.orderNo || '';
  if (!orderNo || !Number.isFinite(pid) || pid <= 0) {
    message.warning('暂无法发起会话，请稍后在确认合作后重试');
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
};

const cancelCsr = async (id: number) => {
  try {
    await customShootRequestsApi.cancel(id);
    message.success('已撤销需求');
    await loadOrders();
  } catch {
    /* */
  }
};

const deleteCsrRecord = async (r: CustomShootRequestRow) => {
  try {
    const res = await customShootRequestsApi.remove(r.id);
    if (res.removedOrderNo) removeOrderFromLocalHistory(res.removedOrderNo);
    message.success('已删除');
    await loadOrders();
  } catch {
    /* */
  }
};

const confirmPhotographerForCsr = async (id: number) => {
  try {
    const res = await customShootRequestsApi.confirmPhotographer(id);
    if (res.bookingOrder) mergeBookingOrderIntoLocalHistory(res.bookingOrder);
    message.success('已确认合作：订单已加入「我的订单」');
    await loadOrders();
  } catch {
    /* */
  }
};

const rejectPhotographerForCsr = async (id: number) => {
  try {
    await customShootRequestsApi.rejectPhotographer(id);
    message.success('已拒绝，需求重新开放接单');
    await loadOrders();
  } catch {
    /* */
  }
};

onMounted(() => {
  authStore.initializeAuth();
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  loadOrders();
});

watch(
  () => [filteredPackageOrders.value.length, filteredCustomRequests.value.length],
  () => {
    ensurePageInRange();
  }
);

watch(keyword, () => {
  currentPagePackage.value = 1;
  currentPageCustom.value = 1;
});

watch(orderViewTab, () => {
  currentPagePackage.value = 1;
  currentPageCustom.value = 1;
});

onUnmounted(() => {
  stopPaymentPoll();
});
</script>

<style scoped lang="less">
.orders-container {
  min-height: 100vh;
  box-sizing: border-box;
  background: linear-gradient(180deg, #fff5f7 0%, #ffffff 32%);
  padding: 28px 120px 40px;

  @media (max-width: 768px) {
    padding: 24px 48px 32px;
  }
}

.page-header {
  text-align: center;
  margin-bottom: 28px;
  color: #334155;
  text-shadow: none;

  h1 {
    font-size: 2.3rem;
    font-weight: 800;
    margin-bottom: 8px;
  }

  p {
    font-size: 1.05rem;
    opacity: 0.9;
    margin: 0;
  }
}

.toolbar-wrap {
  max-width: 1400px;
  margin: 0 auto 20px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}

.order-type-switch {
  width: fit-content;
  max-width: 100%;

  :deep(.ant-segmented) {
    width: auto;
    padding: 3px;
    background: rgba(255, 182, 198, 0.35);
    border-radius: 10px;
    border: 1px solid rgba(255, 117, 140, 0.18);
  }

  :deep(.ant-segmented-item) {
    font-size: 13px;
    min-height: 30px;
    line-height: 28px;
    padding: 0 10px;
    color: #9d174d;
    border-radius: 8px;
  }

  :deep(.ant-segmented-item-selected) {
    background: #fff !important;
    color: #be185d !important;
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(255, 117, 140, 0.2);
  }

  :deep(.ant-segmented-item:hover:not(.ant-segmented-item-selected)) {
    color: #be185d;
  }

  :deep(.ant-segmented-thumb) {
    background: #fff;
    box-shadow: 0 1px 4px rgba(255, 117, 140, 0.18);
  }
}

.search-input {
  flex: 1;
  max-width: 620px;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.content-card {
  max-width: 1400px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.content-card.section-card {
  margin-bottom: 22px;
  /* 与系统主色一致的顶边，套餐/个性预约两区统一 */
  border-top: 3px solid rgba(255, 117, 140, 0.35);
}

.content-header {
  padding: 18px 22px;
  border-bottom: 1px solid #f0f0f0;
}

.section-bar .section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #be185d;
}

.csr-meta-k {
  font-weight: 600;
  color: #be185d;
  margin-right: 0.35em;
}

.csr-claim-msg {
  color: #64748b;
  font-weight: 400;
}

.muted-soft {
  color: #94a3b8;
}

/* 个性预约：时间在上方，操作按钮在下一行横向排列 */
.order-card-bottom.csr-card-bottom {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

.order-card-bottom.csr-card-bottom .order-actions.csr-actions {
  width: 100%;
  flex-wrap: wrap;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  gap: 4px 10px;
}

.order-card-bottom.csr-card-bottom .order-actions.csr-actions > * {
  flex: 0 0 auto;
}

.order-card-bottom.csr-card-bottom .order-actions.csr-actions :deep(.ant-btn) {
  height: auto;
  padding-inline: 6px;
}

.count {
  font-weight: 600;
  color: #666;
}

.empty-state {
  padding: 90px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.6;
  margin-bottom: 12px;
}

.orders-grid {
  padding: 18px 22px 26px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 28px;
}

.pagination-wrap {
  padding: 0 22px 20px;
  display: flex;
  justify-content: flex-end;
}

.order-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  padding: 16px 18px;
  background: linear-gradient(135deg, #fff 0%, #fafafa 100%);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-card-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.order-no {
  font-weight: 800;
  color: #333;
  font-size: 1.02rem;
}

.order-amount {
  font-weight: 900;
  color: #ff758c;
  font-size: 1.1rem;
  white-space: nowrap;
}

.order-card-meta {
  color: #666;
  font-size: 0.93rem;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-item {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 12px;
  margin-left: 4px;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;

  &.unpaid {
    color: #be185d;
    background: #fff1f6;
    border-color: #f9a8d4;
    font-weight: 700;
  }

  &.paid {
    color: #0f766e;
    background: #f0fdfa;
    border-color: #99f6e4;
    font-weight: 700;
  }

  &.confirmed {
    color: #155eef;
    background: #eef4ff;
    border-color: #b2ccff;
    font-weight: 700;
  }

  &.unconfirmed {
    color: #854d0e;
    background: #fff7ed;
    border-color: #fed7aa;
    font-weight: 700;
  }
}

.order-card-bottom {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.created-at {
  color: #999;
  font-size: 0.86rem;
  white-space: nowrap;
}

.order-actions {
  display: flex;
  gap: 8px;
}

.detail-modal {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  border-radius: 14px;
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
  color: white;
}

.detail-order-no {
  font-weight: 900;
  font-size: 1.05rem;
}

.detail-total {
  font-weight: 900;
  font-size: 1.2rem;
}

.detail-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.detail-section {
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  padding: 16px;
  background: #fff;
}

.detail-section h3 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 800;
  color: #333;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
  color: #666;
  font-size: 0.92rem;
}

.detail-row .k {
  color: #999;
  white-space: nowrap;
}

.detail-row .v {
  text-align: right;
  word-break: break-word;
  color: #333;
}

.detail-remark {
  color: #333;
  line-height: 1.7;
  font-size: 0.95rem;
}

.payment-modal-body {
  padding-top: 4px;
}

.payment-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.92rem;
  color: #555;
  margin-bottom: 12px;
}

.payment-qr-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 260px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
}

.payment-qr-img {
  width: 240px;
  height: 240px;
}

.payment-qr-empty {
  color: #999;
  font-size: 0.9rem;
}

.payment-hint {
  margin-top: 10px;
  color: #888;
  font-size: 0.88rem;
  text-align: center;
}

.payment-actions {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}

.delete-modal-body {
  min-height: 66px;
  display: flex;
  align-items: center;
  font-size: 15px;
  color: #334155;
}

.reschedule-modal-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reschedule-current {
  font-size: 0.9rem;
  color: #666;
}

.reschedule-tip {
  font-size: 12px;
  color: #999;
}

.reschedule-calendar {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 10px;
  background: #fff;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.calendar-title {
  font-weight: 700;
  color: #334155;
}

.calendar-legend {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.legend-item {
  font-size: 12px;
  border-radius: 999px;
  padding: 2px 8px;
  border: 1px solid transparent;

  &.available {
    color: #166534;
    background: #dcfce7;
    border-color: #86efac;
  }
  &.booked {
    color: #991b1b;
    background: #fee2e2;
    border-color: #fca5a5;
  }
  &.unavailable {
    color: #475569;
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
  &.rest {
    color: #374151;
    background: #f3f4f6;
    border-color: #d1d5db;
  }
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 6px;

  span {
    text-align: center;
    font-size: 12px;
    color: #64748b;
  }
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.calendar-day {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  min-height: 48px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;

  .day-num {
    font-size: 13px;
    font-weight: 700;
    color: #334155;
    line-height: 1;
  }

  .day-status {
    font-size: 10px;
    line-height: 1;
  }

  &.available {
    border-color: #86efac;
    background: #f0fdf4;
    .day-status {
      color: #16a34a;
    }
  }

  &.booked {
    border-color: #fca5a5;
    background: #fef2f2;
    .day-status {
      color: #dc2626;
    }
  }

  &.rest {
    border-color: #d1d5db;
    background: rgba(107, 114, 128, 0.1);
    .day-status {
      color: #4b5563;
    }
  }

  &.unavailable {
    border-color: #e2e8f0;
    background: #f8fafc;
    .day-status {
      color: #94a3b8;
    }
  }

  &.selected {
    box-shadow: 0 0 0 2px rgba(255, 117, 140, 0.25) inset;
  }

  &.muted {
    opacity: 0.35;
  }

  &:disabled {
    cursor: not-allowed;
  }
}

@media (max-width: 900px) {
  .detail-body {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-actions {
    justify-content: flex-end;
  }
}
</style>
