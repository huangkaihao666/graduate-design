<template>
  <div class="ph-admin">
    <div class="header">
      <div>
        <h1>摄影师管理</h1>
        <p class="sub">
          查看入驻摄影师资料、审核档案、启用或停用前台展示，并可为摄影师设置对外展示头衔。其余业务资料由摄影师本人在工作台维护，此处不可新增档案。
        </p>
      </div>
      <a-space wrap>
        <a-input-search
          v-model:value="keyword"
          placeholder="按姓名、风格等搜索"
          allow-clear
          style="width: 240px"
          @search="() => {}"
        />
        <a-segmented v-model:value="approvalTab" :options="approvalTabOptions" />
        <a-button @click="load">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </a-space>
    </div>

    <a-card :bordered="false">
      <a-table
        :columns="columns"
        :data-source="filteredRows"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 10, showTotal: (t: number) => `共 ${t} 位` }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'avatar'">
            <a-avatar v-if="record.avatar" :src="record.avatar" :size="40" />
            <a-avatar v-else :size="40">{{ record.name?.slice(0, 1) }}</a-avatar>
          </template>
          <template v-else-if="column.key === 'shootingStyle'">
            <a-tooltip :title="record.shootingStyle">
              <span class="style-ellipsis">{{ record.shootingStyle }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'portfolioCount'">
            {{ (record.portfolioImages || []).length }}
          </template>
          <template v-else-if="column.key === 'approvalStatus'">
            <a-tag :color="approvalTagColor(record.approvalStatus)">{{
              approvalLabel(record.approvalStatus)
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-tag :color="record.enabled ? 'green' : 'default'">
              {{ record.enabled ? '前台展示' : '未展示' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space wrap>
              <a @click="openView(record)">查看</a>
              <a
                v-if="record.approvalStatus === 'pending'"
                class="ok"
                @click="approve(record, true)"
                >通过</a
              >
              <a
                v-if="record.approvalStatus === 'pending'"
                class="danger"
                @click="openReject(record)"
                >驳回</a
              >
              <a @click="toggleEnabled(record)">{{ record.enabled ? '停用展示' : '启用展示' }}</a>
            </a-space>
          </template>
        </template>
      </a-table>
      <a-empty v-if="!loading && !filteredRows.length" description="暂无摄影师数据" />
    </a-card>

    <a-modal
      v-model:open="viewOpen"
      title="摄影师详情"
      width="720px"
      :footer="null"
      destroy-on-close
    >
      <template v-if="viewRow">
        <div class="view-head">
          <a-avatar v-if="viewRow.avatar" :src="viewRow.avatar" :size="72" />
          <a-avatar v-else :size="72">{{ viewRow.name?.slice(0, 1) }}</a-avatar>
          <div>
            <h3 class="view-name">{{ viewRow.name }}</h3>
            <a-tag color="magenta">{{ viewRow.title || '摄影师' }}</a-tag>
            <a-tag :color="approvalTagColor(viewRow.approvalStatus)" style="margin-left: 8px">{{
              approvalLabel(viewRow.approvalStatus)
            }}</a-tag>
            <span class="view-years">从业 {{ viewRow.yearsExperience }} 年</span>
          </div>
        </div>
        <div class="admin-title-edit">
          <div class="admin-title-row">
            <span class="admin-title-label">头衔</span>
            <a-input
              v-model:value="titleDraft"
              placeholder="如：首席摄影师（用户端展示）"
              allow-clear
            />
            <a-button type="primary" :loading="titleSaving" @click="saveAdminTitle"
              >保存头衔</a-button
            >
          </div>
          <p class="admin-title-hint">摄影师无法在个人中心修改头衔，仅可在此设置。</p>
        </div>
        <a-descriptions bordered :column="1" size="small" class="view-desc">
          <a-descriptions-item v-if="viewRow.approvalReviewNote" label="驳回说明">{{
            viewRow.approvalReviewNote
          }}</a-descriptions-item>
          <a-descriptions-item v-if="viewRow.gender" label="性别">{{
            viewRow.gender
          }}</a-descriptions-item>
          <a-descriptions-item v-if="viewRow.age != null" label="年龄">{{
            viewRow.age
          }}</a-descriptions-item>
          <a-descriptions-item label="拍摄风格">{{ viewRow.shootingStyle }}</a-descriptions-item>
          <a-descriptions-item v-if="viewRow.specialtyTopics" label="擅长题材">{{
            viewRow.specialtyTopics
          }}</a-descriptions-item>
          <a-descriptions-item v-if="viewRow.awards" label="资质与获奖">{{
            viewRow.awards
          }}</a-descriptions-item>
          <a-descriptions-item v-if="viewRow.bio" label="个人简介">{{
            viewRow.bio
          }}</a-descriptions-item>
          <a-descriptions-item v-if="(viewRow.availableDates || []).length" label="可预约日期">{{
            (viewRow.availableDates || []).join('、')
          }}</a-descriptions-item>
          <a-descriptions-item v-if="(viewRow.restDates || []).length" label="休息日">{{
            (viewRow.restDates || []).join('、')
          }}</a-descriptions-item>
          <a-descriptions-item v-if="viewRow.scheduleNote" label="档期说明">{{
            viewRow.scheduleNote
          }}</a-descriptions-item>
          <a-descriptions-item label="前台展示">{{
            viewRow.enabled ? '是' : '否'
          }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ viewRow.createdAt }}</a-descriptions-item>
          <a-descriptions-item label="更新时间">{{ viewRow.updatedAt }}</a-descriptions-item>
        </a-descriptions>
        <p class="view-label">优秀作品</p>
        <div v-if="(viewRow.portfolioImages || []).length" class="view-portfolio">
          <a-image
            v-for="(url, idx) in viewRow.portfolioImages"
            :key="idx"
            :src="url"
            :width="120"
            class="view-pf-img"
          />
        </div>
        <a-empty v-else description="未上传作品" />
      </template>
    </a-modal>

    <a-modal
      v-model:open="rejectOpen"
      title="驳回入驻申请"
      ok-text="确认驳回"
      :confirm-loading="rejectLoading"
      @ok="submitReject"
    >
      <p class="reject-hint">摄影师将收到说明，并可修改资料后重新提交审核。</p>
      <a-textarea
        v-model:value="rejectNote"
        :rows="3"
        placeholder="请填写驳回原因（必填）"
        :maxlength="200"
        show-count
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { photographersApi, type PhotographerAdmin } from '@/api/photographers';
import { getApiErrorMessage } from '@/utils/apiError';
import { ReloadOutlined } from '@ant-design/icons-vue';
import { message, Modal } from 'ant-design-vue';
import { computed, onMounted, ref } from 'vue';

const columns = [
  { title: '头像', key: 'avatar', width: 72 },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 110 },
  { title: '头衔', dataIndex: 'title', key: 'title', width: 120, ellipsis: true },
  { title: '审核', key: 'approvalStatus', width: 100 },
  { title: '展示', key: 'enabled', width: 100 },
  { title: '拍摄风格', key: 'shootingStyle', ellipsis: true },
  { title: '作品数', key: 'portfolioCount', width: 80 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 170 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' as const },
];

const rows = ref<PhotographerAdmin[]>([]);
const keyword = ref('');
const loading = ref(false);
const approvalTab = ref<string>('all');
const approvalTabOptions = [
  { label: '全部', value: 'all' },
  { label: '待完善', value: 'draft' },
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
];

const viewOpen = ref(false);
const viewRow = ref<PhotographerAdmin | null>(null);
const titleDraft = ref('');
const titleSaving = ref(false);

const rejectOpen = ref(false);
const rejectLoading = ref(false);
const rejectNote = ref('');
const rejectTarget = ref<PhotographerAdmin | null>(null);

const approvalLabel = (s: string | undefined) => {
  const v = String(s || '');
  if (v === 'draft') return '待完善';
  if (v === 'pending') return '待审核';
  if (v === 'approved') return '已通过';
  if (v === 'rejected') return '已驳回';
  return v || '—';
};

const approvalTagColor = (s: string | undefined) => {
  const v = String(s || '');
  if (v === 'approved') return 'green';
  if (v === 'pending') return 'orange';
  if (v === 'rejected') return 'red';
  if (v === 'draft') return 'default';
  return 'default';
};

const filteredRows = computed(() => {
  let list = rows.value;
  const tab = approvalTab.value;
  if (tab !== 'all') {
    list = list.filter((r) => String(r.approvalStatus || '') === tab);
  }
  const q = keyword.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter((r) => {
    const hay = [r.name, r.title, r.shootingStyle, r.specialtyTopics]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
});

const load = async () => {
  loading.value = true;
  try {
    const data = await photographersApi.listAdmin();
    rows.value = Array.isArray(data) ? data : [];
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    loading.value = false;
  }
};

const openView = (r: PhotographerAdmin) => {
  viewRow.value = { ...r };
  titleDraft.value = String(r.title || '');
  viewOpen.value = true;
};

const saveAdminTitle = async () => {
  if (!viewRow.value) return;
  titleSaving.value = true;
  try {
    const updated = await photographersApi.setAdminTitle(viewRow.value.id, {
      title: titleDraft.value.trim() || null,
    });
    viewRow.value = { ...viewRow.value, ...updated };
    message.success('头衔已保存');
    await load();
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    titleSaving.value = false;
  }
};

const approve = (r: PhotographerAdmin, ok: boolean) => {
  if (ok) {
    Modal.confirm({
      title: `确认通过「${r.name}」的入驻审核？`,
      content: '通过后该摄影师即可接单；是否对用户展示请在列表中单独「启用展示」。',
      onOk: async () => {
        try {
          await photographersApi.setApproval(r.id, { approved: true });
          message.success('已通过审核');
          await load();
        } catch (e: unknown) {
          message.error(getApiErrorMessage(e));
        }
      },
    });
  }
};

const openReject = (r: PhotographerAdmin) => {
  rejectTarget.value = r;
  rejectNote.value = '';
  rejectOpen.value = true;
};

const submitReject = async () => {
  const r = rejectTarget.value;
  if (!r) {
    rejectOpen.value = false;
    return;
  }
  const note = rejectNote.value.trim();
  if (!note) {
    message.warning('请填写驳回原因');
    return;
  }
  rejectLoading.value = true;
  try {
    await photographersApi.setApproval(r.id, { approved: false, reviewNote: note });
    message.success('已驳回');
    rejectOpen.value = false;
    rejectTarget.value = null;
    await load();
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    rejectLoading.value = false;
  }
};

const toggleEnabled = async (r: PhotographerAdmin) => {
  try {
    await photographersApi.setEnabled(r.id, !r.enabled);
    r.enabled = !r.enabled;
    message.success('已更新展示状态');
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  }
};

onMounted(() => {
  load();
});
</script>

<style scoped lang="less">
.ph-admin {
  padding: 20px 24px;
  background: #f6f8fb;
  min-height: calc(100vh - 64px);
}

.header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;

  h1 {
    margin: 0 0 6px;
  }

  .sub {
    margin: 0;
    color: #6b7280;
    font-size: 13px;
    max-width: 640px;
    line-height: 1.5;
  }
}

.danger {
  color: #cf1322;
}

.ok {
  color: #237804;
}

.style-ellipsis {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  max-width: 280px;
}

.admin-title-edit {
  margin-bottom: 16px;
  padding: 12px 14px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.admin-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.admin-title-label {
  flex: 0 0 auto;
  font-weight: 600;
  color: #374151;
}

.admin-title-row :deep(.ant-input) {
  flex: 1 1 200px;
  min-width: 160px;
}

.admin-title-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.45;
}

.view-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;

  .view-name {
    margin: 0 0 8px;
  }

  .view-years {
    margin-left: 12px;
    color: #6b7280;
    font-size: 14px;
  }
}

.view-desc {
  margin-bottom: 16px;
}

.view-label {
  font-weight: 600;
  margin: 0 0 8px;
}

.view-portfolio {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.view-pf-img {
  border-radius: 8px;
  overflow: hidden;
}

.reject-hint {
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 10px;
}
</style>
