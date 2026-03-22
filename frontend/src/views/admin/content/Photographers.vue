<template>
  <div class="ph-admin">
    <div class="header">
      <div>
        <h1>摄影师管理</h1>
        <p class="sub">对本店摄影师进行增删改查：前台「本店摄影师」页仅展示「展示中」的记录。</p>
      </div>
      <a-space wrap>
        <a-input-search
          v-model:value="keyword"
          placeholder="按姓名、头衔、题材等搜索"
          allow-clear
          style="width: 240px"
          @search="() => {}"
        />
        <a-button @click="load">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          新增摄影师
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
          <template v-else-if="column.key === 'enabled'">
            <a-tag :color="record.enabled ? 'green' : 'default'">
              {{ record.enabled ? '展示中' : '已停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a @click="openView(record)">查看</a>
              <a @click="openEdit(record)">编辑</a>
              <a @click="toggleEnabled(record)">{{ record.enabled ? '停用' : '启用' }}</a>
              <a class="danger" @click="removeRow(record)">删除</a>
            </a-space>
          </template>
        </template>
      </a-table>
      <a-empty
        v-if="!loading && !filteredRows.length"
        description="暂无数据，请点击「新增摄影师」"
      />
    </a-card>

    <!-- 查看详情（查） -->
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
            <span class="view-years">从业 {{ viewRow.yearsExperience }} 年</span>
          </div>
        </div>
        <a-descriptions bordered :column="1" size="small" class="view-desc">
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
          <a-descriptions-item v-if="viewRow.scheduleNote" label="档期说明">{{
            viewRow.scheduleNote
          }}</a-descriptions-item>
          <a-descriptions-item label="排序">{{ viewRow.sortOrder }}</a-descriptions-item>
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
        <a-empty v-else description="未配置作品图" />
      </template>
    </a-modal>

    <!-- 新增 / 编辑 -->
    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑摄影师' : '新增摄影师'"
      width="640px"
      ok-text="保存"
      :confirm-loading="saving"
      destroy-on-close
      @ok="submit"
    >
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="姓名" required>
              <a-input v-model:value="form.name" placeholder="摄影师姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="头衔">
              <a-input v-model:value="form.title" placeholder="如：首席摄影师" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="头像">
          <div class="upload-row">
            <a-upload
              accept="image/*"
              :show-upload-list="false"
              :custom-request="handleAvatarUpload"
            >
              <a-button :loading="uploadingAvatar">
                <template #icon><UploadOutlined /></template>
                从本机选择并上传
              </a-button>
            </a-upload>
            <span class="upload-hint">支持常见图片格式，单张不超过 5MB</span>
          </div>
          <div v-if="form.avatar" class="avatar-preview">
            <a-image
              :src="form.avatar"
              :width="96"
              :height="96"
              style="object-fit: cover; border-radius: 8px"
            />
            <a-button type="link" danger size="small" @click="form.avatar = ''">清除头像</a-button>
          </div>
          <a-input
            v-model:value="form.avatar"
            placeholder="或直接粘贴图片链接（与上传二选一或补充）"
            allow-clear
            class="avatar-url-fallback"
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="性别">
              <a-select
                v-model:value="form.gender"
                allow-clear
                placeholder="可选"
                style="width: 100%"
              >
                <a-select-option value="男">男</a-select-option>
                <a-select-option value="女">女</a-select-option>
                <a-select-option value="其他">其他</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="年龄（周岁）">
              <a-input-number
                v-model:value="form.age"
                :min="18"
                :max="80"
                placeholder="可选"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="擅长题材">
          <a-textarea
            v-model:value="form.specialtyTopics"
            :rows="2"
            placeholder="如：婚纱旅拍、亲子、商业形象；可用顿号或换行分隔"
          />
        </a-form-item>
        <a-form-item label="资质与获奖">
          <a-textarea
            v-model:value="form.awards"
            :rows="3"
            placeholder="如：协会会员、比赛奖项、平台认证等"
          />
        </a-form-item>
        <a-form-item label="拍摄风格" required>
          <a-textarea
            v-model:value="form.shootingStyle"
            :rows="3"
            placeholder="描述擅长风格、场景等"
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="从业年限（年）">
              <a-input-number
                v-model:value="form.yearsExperience"
                :min="0"
                :max="60"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="排序（小在前）">
              <a-input-number v-model:value="form.sortOrder" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="前台展示">
              <a-switch v-model:checked="form.enabled" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="个人简介">
          <a-textarea v-model:value="form.bio" :rows="3" placeholder="可选" />
        </a-form-item>
        <a-form-item label="可预约日期">
          <a-textarea
            v-model:value="form.availableDatesText"
            :rows="4"
            placeholder="每行一个日期，格式 YYYY-MM-DD，例如：&#10;2026-04-01&#10;2026-04-05"
          />
        </a-form-item>
        <a-form-item label="档期说明">
          <a-textarea
            v-model:value="form.scheduleNote"
            :rows="2"
            placeholder="例如：每周二店休；节假日可约；具体时段以客服确认为准"
          />
        </a-form-item>
        <a-form-item label="优秀作品">
          <div class="upload-row">
            <a-upload
              accept="image/*"
              multiple
              :show-upload-list="false"
              :custom-request="handlePortfolioUpload"
            >
              <a-button :loading="uploadingPortfolio">
                <template #icon><UploadOutlined /></template>
                从本机选择作品图上传
              </a-button>
            </a-upload>
            <span class="upload-hint">可多次选择添加多张，单张不超过 5MB</span>
          </div>
          <div v-if="portfolioUrls.length" class="portfolio-edit-grid">
            <div v-for="(url, idx) in portfolioUrls" :key="idx" class="portfolio-edit-item">
              <a-image
                :src="url"
                :width="104"
                :height="104"
                style="object-fit: cover; border-radius: 8px"
              />
              <a-button type="link" danger size="small" @click="removePortfolioAt(idx)"
                >删除</a-button
              >
            </div>
          </div>
          <a-textarea
            v-model:value="form.portfolioText"
            :rows="3"
            placeholder="可选：每行一个图片链接（与上方本地上传的地址会合并保存）"
            class="portfolio-url-extra"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { photographersApi, type PhotographerAdmin } from '@/api/photographers';
import { getApiErrorMessage } from '@/utils/apiError';
import { PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons-vue';
import { message, Modal } from 'ant-design-vue';
import type { UploadProps } from 'ant-design-vue';
import { computed, onMounted, reactive, ref } from 'vue';

const columns = [
  { title: '头像', key: 'avatar', width: 72 },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 110 },
  { title: '头衔', dataIndex: 'title', key: 'title', ellipsis: true, width: 120 },
  { title: '性别', dataIndex: 'gender', key: 'gender', width: 64 },
  { title: '年龄', dataIndex: 'age', key: 'age', width: 64 },
  { title: '拍摄风格', key: 'shootingStyle', ellipsis: true },
  { title: '从业年限', dataIndex: 'yearsExperience', key: 'yearsExperience', width: 90 },
  { title: '作品数', key: 'portfolioCount', width: 80 },
  { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 70 },
  { title: '状态', key: 'enabled', width: 100 },
  { title: '操作', key: 'actions', width: 240, fixed: 'right' as const },
];

const rows = ref<PhotographerAdmin[]>([]);
const keyword = ref('');
const loading = ref(false);
const saving = ref(false);
const modalOpen = ref(false);
const editingId = ref<number | null>(null);

const viewOpen = ref(false);
const viewRow = ref<PhotographerAdmin | null>(null);

const uploadingAvatar = ref(false);
const uploadingPortfolio = ref(false);
/** 作品图地址列表（本地上传 + 可与下方文本框合并） */
const portfolioUrls = ref<string[]>([]);

const form = reactive({
  name: '',
  title: '',
  avatar: '',
  shootingStyle: '',
  yearsExperience: 0,
  bio: '',
  gender: undefined as string | undefined,
  age: undefined as number | undefined,
  specialtyTopics: '',
  awards: '',
  /** 可选：手动输入的链接，提交时与 portfolioUrls 合并 */
  portfolioText: '',
  /** 每行一个 YYYY-MM-DD */
  availableDatesText: '',
  scheduleNote: '',
  sortOrder: 0,
  enabled: true,
});

const filteredRows = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter((r) => {
    const hay = [r.name, r.title, r.gender, r.specialtyTopics, r.awards, r.shootingStyle]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
});

const resetForm = () => {
  form.name = '';
  form.title = '';
  form.avatar = '';
  form.shootingStyle = '';
  form.yearsExperience = 0;
  form.bio = '';
  form.gender = undefined;
  form.age = undefined;
  form.specialtyTopics = '';
  form.awards = '';
  form.portfolioText = '';
  form.availableDatesText = '';
  form.scheduleNote = '';
  form.sortOrder = 0;
  form.enabled = true;
  portfolioUrls.value = [];
};

const handleAvatarUpload: UploadProps['customRequest'] = async (options) => {
  const { file, onSuccess, onError } = options;
  const raw = file as File;
  uploadingAvatar.value = true;
  try {
    const { url } = await photographersApi.uploadImage(raw);
    form.avatar = url;
    onSuccess?.(url);
    message.success('头像已上传');
  } catch (e: unknown) {
    onError?.(e as Error);
    message.error(getApiErrorMessage(e));
  } finally {
    uploadingAvatar.value = false;
  }
};

const handlePortfolioUpload: UploadProps['customRequest'] = async (options) => {
  const { file, onSuccess, onError } = options;
  const raw = file as File;
  uploadingPortfolio.value = true;
  try {
    const { url } = await photographersApi.uploadImage(raw);
    portfolioUrls.value.push(url);
    onSuccess?.(url);
    message.success('作品图已添加');
  } catch (e: unknown) {
    onError?.(e as Error);
    message.error(getApiErrorMessage(e));
  } finally {
    uploadingPortfolio.value = false;
  }
};

const removePortfolioAt = (idx: number) => {
  portfolioUrls.value.splice(idx, 1);
};

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

const parsePortfolioExtraLines = (): string[] => {
  return form.portfolioText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
};

/** 合并本地上传 + 手动输入的链接，去重 */
const buildPortfolioImages = (): string[] => {
  const fromUpload = [...portfolioUrls.value];
  const fromText = parsePortfolioExtraLines();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of [...fromUpload, ...fromText]) {
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
};

/** 解析可预约日期：每行一个，支持逗号分隔 */
const parseAvailableDatesInput = (): string[] => {
  const lines = form.availableDatesText.split(/\r?\n/).flatMap((line) => {
    const t = line.trim();
    if (!t) return [];
    return t
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
  });
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of lines) {
    if (!re.test(s) || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out.sort();
};

const openView = (r: PhotographerAdmin) => {
  viewRow.value = { ...r };
  viewOpen.value = true;
};

const openCreate = () => {
  editingId.value = null;
  resetForm();
  modalOpen.value = true;
};

const openEdit = (r: PhotographerAdmin) => {
  editingId.value = r.id;
  form.name = r.name;
  form.title = r.title || '';
  form.avatar = r.avatar || '';
  form.shootingStyle = r.shootingStyle;
  form.yearsExperience = r.yearsExperience;
  form.bio = r.bio || '';
  form.gender = r.gender;
  form.age = r.age;
  form.specialtyTopics = r.specialtyTopics || '';
  form.awards = r.awards || '';
  portfolioUrls.value = [...(r.portfolioImages || [])];
  form.portfolioText = '';
  form.availableDatesText = (r.availableDates || []).join('\n');
  form.scheduleNote = r.scheduleNote || '';
  form.sortOrder = r.sortOrder;
  form.enabled = r.enabled;
  modalOpen.value = true;
};

const submit = async () => {
  const name = form.name.trim();
  const shootingStyle = form.shootingStyle.trim();
  const portfolioImages = buildPortfolioImages();
  const availableDates = parseAvailableDatesInput();
  if (!name || !shootingStyle) {
    message.warning('请填写姓名与拍摄风格');
    return;
  }
  saving.value = true;
  try {
    if (editingId.value != null) {
      await photographersApi.update(editingId.value, {
        name,
        title: form.title.trim() || null,
        avatar: form.avatar.trim() || null,
        shootingStyle,
        yearsExperience: form.yearsExperience,
        bio: form.bio.trim() || null,
        gender: form.gender?.trim() || null,
        age: form.age ?? null,
        specialtyTopics: form.specialtyTopics.trim() || null,
        awards: form.awards.trim() || null,
        portfolioImages,
        availableDates,
        scheduleNote: form.scheduleNote.trim() || null,
        sortOrder: form.sortOrder,
        enabled: form.enabled,
      });
      message.success('已保存');
    } else {
      await photographersApi.create({
        name,
        title: form.title.trim() || undefined,
        avatar: form.avatar.trim() || undefined,
        shootingStyle,
        yearsExperience: form.yearsExperience,
        bio: form.bio.trim() || undefined,
        gender: form.gender?.trim() || undefined,
        age: form.age,
        specialtyTopics: form.specialtyTopics.trim() || undefined,
        awards: form.awards.trim() || undefined,
        portfolioImages,
        availableDates,
        scheduleNote: form.scheduleNote.trim() || undefined,
        sortOrder: form.sortOrder,
        enabled: form.enabled,
      });
      message.success('已新增');
    }
    modalOpen.value = false;
    await load();
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    saving.value = false;
  }
};

const toggleEnabled = async (r: PhotographerAdmin) => {
  try {
    await photographersApi.update(r.id, { enabled: !r.enabled });
    r.enabled = !r.enabled;
    message.success('已更新');
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  }
};

const removeRow = (r: PhotographerAdmin) => {
  Modal.confirm({
    title: `确定删除「${r.name}」？`,
    okType: 'danger',
    onOk: async () => {
      try {
        await photographersApi.remove(r.id);
        message.success('已删除');
        await load();
      } catch (e: unknown) {
        message.error(getApiErrorMessage(e));
      }
    },
  });
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
    max-width: 520px;
    line-height: 1.5;
  }
}

.danger {
  color: #cf1322;
}

.style-ellipsis {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  max-width: 280px;
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

.upload-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 12px;
  color: #9ca3af;
}

.avatar-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.avatar-url-fallback {
  margin-top: 8px;
}

.portfolio-edit-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 12px 0;
}

.portfolio-edit-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.portfolio-url-extra {
  margin-top: 8px;
}
</style>
