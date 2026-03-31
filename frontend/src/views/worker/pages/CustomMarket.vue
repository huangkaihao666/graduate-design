<template>
  <div class="cm-page">
    <div class="head">
      <a-button :loading="loading" @click="load">刷新</a-button>
    </div>

    <a-alert
      v-if="!authStore.user?.workerPhotographerId"
      type="warning"
      show-icon
      message="需先在个人中心绑定摄影师档案；审核通过后方可接单。"
      style="margin-bottom: 16px"
    />
    <a-alert
      v-else-if="!authStore.user?.photographerCanTakeOrders"
      type="info"
      show-icon
      message="管理员审核通过后方可接单，当前可先浏览需求。"
      style="margin-bottom: 16px"
    />

    <a-spin :spinning="loading">
      <div v-if="!rows.length" class="empty">暂无定制需求</div>
      <div v-else class="grid">
        <a-card v-for="r in rows" :key="r.id" class="card" :title="r.title || '定制旅拍'">
          <template #extra>
            <a-tag :color="tagColor(r)">{{ tagText(r) }}</a-tag>
          </template>
          <a-button size="small" class="detail-floating-btn" @click="openDetail(r)"
            >查看详情</a-button
          >
          <p class="meta">编号 {{ r.requestNo }} · 发布者 {{ r.user?.name || '用户' }}</p>
          <p>地点：{{ r.location }} · 风格：{{ r.style }}</p>
          <p>期望日：{{ r.shootingDate }} · {{ r.duration }} 天 · {{ r.numberOfPeople }} 人</p>
          <p v-if="r.budgetHint">预算参考：¥{{ r.budgetHint.toLocaleString() }}</p>
          <p v-if="r.description" class="desc">{{ r.description }}</p>
          <p v-if="r.photographer && r.status !== 'open'" class="taken-by">
            <a-tag color="processing">接单摄影师</a-tag>
            {{ r.photographer.name }}
            <span v-if="!isMyClaim(r)" class="not-me">（非本人接单）</span>
          </p>
          <p v-if="showContact(r)" class="contact">联系人 {{ r.contactName }} {{ r.phone }}</p>

          <div v-if="r.status === 'open' && canClaim" class="act">
            <a-button type="primary" size="small" @click="openClaim(r)">我要接单</a-button>
          </div>
          <div v-else-if="r.status === 'pending_user_confirm' && isMyClaim(r)" class="act">
            <span class="wait">等待用户确认中…</span>
            <a-popconfirm
              title="撤回后需求将重新开放，确定？"
              cancel-text="取消"
              @confirm="withdraw(r.id)"
            >
              <a-button size="small" style="margin-left: 8px">撤回接单</a-button>
            </a-popconfirm>
          </div>
          <div v-else-if="r.status === 'confirmed' && isMyClaim(r)" class="act">
            <a-tag color="success">用户已确认，可沟通拍摄细节</a-tag>
          </div>
          <div
            v-else-if="
              (r.status === 'pending_user_confirm' || r.status === 'confirmed') && !isMyClaim(r)
            "
            class="act muted-act"
          >
            <span>仅展示状态，您无法操作该需求</span>
          </div>
        </a-card>
      </div>
    </a-spin>

    <a-modal
      v-model:open="claimOpen"
      title="接单留言（可选）"
      ok-text="确认接单"
      cancel-text="取消"
      :confirm-loading="claimLoading"
      @ok="submitClaim"
    >
      <a-textarea
        v-model:value="claimMsg"
        :rows="4"
        placeholder="可简单介绍档期、擅长风格等，方便用户选择"
      />
    </a-modal>

    <a-modal
      v-model:open="detailOpen"
      title="需求详情"
      :footer="null"
      :width="760"
      cancel-text="取消"
    >
      <a-spin :spinning="detailLoading">
        <div v-if="detailRow" class="detail-body">
          <div class="drow">
            <span class="k">需求编号</span><span class="v">{{ detailRow.requestNo }}</span>
          </div>
          <div class="drow">
            <span class="k">发布用户</span
            ><span class="v">{{ detailRow.user?.name || '用户' }}</span>
          </div>
          <div class="drow">
            <span class="k">状态</span><span class="v">{{ tagText(detailRow) }}</span>
          </div>
          <div class="drow">
            <span class="k">标题</span><span class="v">{{ detailRow.title || '定制旅拍' }}</span>
          </div>
          <div class="drow">
            <span class="k">拍摄地点</span><span class="v">{{ detailRow.location }}</span>
          </div>
          <div class="drow">
            <span class="k">风格偏好</span><span class="v">{{ detailRow.style }}</span>
          </div>
          <div class="drow">
            <span class="k">期望拍摄日</span><span class="v">{{ detailRow.shootingDate }}</span>
          </div>
          <div class="drow">
            <span class="k">行程天数</span><span class="v">{{ detailRow.duration }} 天</span>
          </div>
          <div class="drow">
            <span class="k">拍摄人数</span><span class="v">{{ detailRow.numberOfPeople }} 人</span>
          </div>
          <div v-if="detailRow.budgetHint" class="drow">
            <span class="k">预算参考</span
            ><span class="v">¥{{ detailRow.budgetHint.toLocaleString() }}</span>
          </div>
          <div class="drow">
            <span class="k">联系人</span
            ><span class="v">{{ detailRow.contactName }} {{ detailRow.phone }}</span>
          </div>
          <div v-if="detailRow.description" class="dblock">
            <div class="k">补充说明</div>
            <div class="desc">{{ detailRow.description }}</div>
          </div>
          <div v-if="detailRow.claimMessage" class="dblock">
            <div class="k">接单留言</div>
            <div class="desc">{{ detailRow.claimMessage }}</div>
          </div>
        </div>
      </a-spin>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { customShootRequestsApi, type CustomShootRequestRow } from '@/api/customShootRequests';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import { computed, onMounted, ref } from 'vue';

const authStore = useAuthStore();
const loading = ref(false);
const rows = ref<CustomShootRequestRow[]>([]);
const claimOpen = ref(false);
const claimLoading = ref(false);
const claimMsg = ref('');
const claimTargetId = ref<number | null>(null);
const detailOpen = ref(false);
const detailLoading = ref(false);
const detailRow = ref<CustomShootRequestRow | null>(null);

const myPid = computed(() => Number(authStore.user?.workerPhotographerId || 0));
/** 与订单页一致：绑定摄影师且管理员审核通过才可接单 */
const canClaim = computed(() => myPid.value > 0 && !!authStore.user?.photographerCanTakeOrders);

function isMyClaim(r: CustomShootRequestRow) {
  return r.photographerId === myPid.value;
}

/** 仅待接单或本人接单时展示用户联系方式 */
function showContact(r: CustomShootRequestRow) {
  if (r.status === 'open') return true;
  return isMyClaim(r);
}

function tagText(r: CustomShootRequestRow) {
  if (r.status === 'open') return '待接单';
  if (r.status === 'pending_user_confirm') {
    return isMyClaim(r) ? '待用户确认' : '已被接单·待用户确认';
  }
  if (r.status === 'confirmed') {
    return isMyClaim(r) ? '已确认合作' : '已被接单·已确认';
  }
  return r.status;
}

function tagColor(r: CustomShootRequestRow) {
  if (r.status === 'open') return 'blue';
  if (r.status === 'pending_user_confirm') return isMyClaim(r) ? 'orange' : 'warning';
  if (r.status === 'confirmed') return isMyClaim(r) ? 'green' : 'cyan';
  return 'default';
}

async function load() {
  loading.value = true;
  try {
    rows.value = await customShootRequestsApi.listMarket();
  } catch {
    message.error('加载失败');
  } finally {
    loading.value = false;
  }
}

async function openDetail(r: CustomShootRequestRow) {
  detailOpen.value = true;
  detailRow.value = r;
  detailLoading.value = true;
  try {
    detailRow.value = await customShootRequestsApi.getOne(r.id);
  } catch {
    // 回退使用列表数据
  } finally {
    detailLoading.value = false;
  }
}

function openClaim(r: CustomShootRequestRow) {
  claimTargetId.value = r.id;
  claimMsg.value = '';
  claimOpen.value = true;
}

async function submitClaim() {
  const id = claimTargetId.value;
  if (!id) return;
  claimLoading.value = true;
  try {
    await customShootRequestsApi.claim(id, claimMsg.value.trim() || undefined);
    message.success('已接单，等待用户确认');
    claimOpen.value = false;
    await load();
  } catch {
    /* */
  } finally {
    claimLoading.value = false;
  }
}

async function withdraw(id: number) {
  try {
    await customShootRequestsApi.withdrawClaim(id);
    message.success('已撤回');
    await load();
  } catch {
    /* */
  }
}

onMounted(() => {
  load();
});
</script>

<style scoped lang="less">
.cm-page {
  padding: 20px 20px 40px;
  max-width: 960px;
}
.head {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 16px;
}
.empty {
  padding: 40px;
  text-align: center;
  color: #9ca3af;
}
.grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.card {
  border-radius: 12px;
}
.meta {
  font-size: 12px;
  color: #9ca3af;
}
.desc {
  color: #4b5563;
  white-space: pre-wrap;
}
.contact {
  font-size: 13px;
  color: #6b7280;
}
.act {
  margin-top: 12px;
}
.wait {
  color: #d97706;
  font-size: 13px;
}
.taken-by {
  margin: 8px 0 0;
  font-size: 14px;
  color: #374151;
  font-weight: 600;
  .not-me {
    font-weight: 400;
    color: #9ca3af;
    font-size: 12px;
  }
}
.muted-act {
  color: #9ca3af;
  font-size: 13px;
}
.card :deep(.ant-card-body) {
  position: relative;
}
.detail-floating-btn {
  position: absolute;
  top: 14px; /* 拉大与分隔线的间距 */
  right: 30px; /* 增加右侧留白 */
  z-index: 2;
}
.detail-body {
  display: grid;
  gap: 10px;
}
.drow {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(17, 24, 39, 0.12);
}
.dblock .k,
.drow .k {
  color: #6b7280;
  font-size: 13px;
}
.drow .v {
  color: #111827;
  text-align: right;
}
</style>
