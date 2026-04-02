<template>
  <div class="admin-packages-container">
    <div class="header">
      <h1>套餐管理</h1>
      <a-space wrap>
        <a-input-search
          v-model:value="packageSearchKeyword"
          placeholder="搜索城市、景点、套餐名称、风格"
          allow-clear
          style="width: min(100vw - 48px, 360px)"
        />
        <a-button type="primary" @click="openCreate">新增套餐</a-button>
      </a-space>
    </div>

    <p class="hint">目的地可选景点自动带出，也可手动填写城市名称。</p>

    <p v-if="packageSearchKeyword.trim()" class="filter-tip">
      已筛选 {{ filteredPackages.length }} / {{ packageList.length }} 条
    </p>

    <a-card :bordered="false">
      <a-table
        :columns="columns"
        :data-source="filteredPackages"
        :pagination="{
          pageSize: 8,
          showTotal: (total: number) => `共 ${total} 条`,
        }"
        :loading="loading"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">{{ record.displayName }}</template>
          <template v-else-if="column.key === 'style'">{{ record.styleLabel }}</template>
          <template v-else-if="column.key === 'price'"
            >¥{{ record.price.toLocaleString() }}</template
          >
          <template v-else-if="column.key === 'location'">
            <div>
              <div>{{ record.location }}</div>
              <div v-if="record.spotName" class="spot-sub">景点：{{ record.spotName }}</div>
              <div v-else-if="!record.spotId" class="spot-sub warn">
                原关联景点已删除，请重新选择目的地
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === '已上架' ? 'green' : 'default'">{{
              record.status
            }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a @click="openEdit(record)">编辑</a>
              <a @click="toggleStatus(record)">{{
                record.status === '已上架' ? '下架' : '上架'
              }}</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑套餐' : '新增套餐'"
      ok-text="保存"
      :confirm-loading="saving"
      @ok="savePackage"
    >
      <a-form layout="vertical">
        <a-form-item label="套餐名称（自动生成）">
          <a-input :value="computedPackageName" disabled />
        </a-form-item>
        <a-form-item label="目的地（可选景点自动带出）" required>
          <a-select
            v-model:value="form.spotId"
            placeholder="可选：选择景点自动带出城市；不选可手填目的地"
            style="width: 100%"
            :options="spotOptions"
            show-search
            allow-clear
            :filter-option="filterSpotOption"
          />
        </a-form-item>
        <a-form-item label="手填目的地（未选景点时必填）" required>
          <a-input
            v-model:value="form.location"
            placeholder="例如：三亚 / 丽江 / 巴厘岛"
            :disabled="form.spotId !== undefined && form.spotId !== null"
          />
        </a-form-item>
        <a-form-item label="风格">
          <a-select
            v-model:value="form.style"
            placeholder="请选择拍摄风格"
            style="width: 100%"
            allow-clear
            :options="styleOptions"
          />
        </a-form-item>
        <a-form-item label="价格"
          ><a-input-number
            v-model:value="form.price"
            :min="0"
            placeholder="请输入价格"
            style="width: 100%"
        /></a-form-item>
        <a-form-item label="行程天数">
          <a-input-number
            v-model:value="form.duration"
            :min="1"
            placeholder="请输入天数"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="套餐介绍">
          <a-textarea
            v-model:value="form.description"
            :rows="3"
            placeholder="请输入套餐介绍"
            show-count
            :maxlength="500"
          />
        </a-form-item>
        <a-form-item label="套餐亮点（每行一条）">
          <a-textarea
            v-model:value="form.featuresText"
            :rows="4"
            placeholder="例如：&#10;全程旅拍策划&#10;专属摄影师跟拍"
          />
        </a-form-item>
        <a-form-item label="费用包含（每行一条）">
          <a-textarea
            v-model:value="form.includesText"
            :rows="4"
            placeholder="例如：&#10;摄影服务费&#10;精修照片20张"
          />
        </a-form-item>
        <a-form-item label="费用不含（每行一条）">
          <a-textarea
            v-model:value="form.excludesText"
            :rows="3"
            placeholder="例如：&#10;往返交通&#10;个人消费"
          />
        </a-form-item>

        <a-divider style="margin: 10px 0 14px" />

        <a-form-item label="套餐封面图（用户端套餐浏览展示）">
          <a-upload
            :file-list="coverFileList"
            list-type="picture-card"
            :max-count="1"
            accept="image/*"
            :before-upload="beforeUploadCover"
            @remove="removeCover"
          >
            <div v-if="coverFileList.length < 1">
              <div style="margin-top: 8px">上传</div>
            </div>
          </a-upload>
          <div v-if="form.coverImage" class="cover-preview">
            <a-image :src="form.coverImage" :preview="true" :width="180" />
          </div>
        </a-form-item>

        <a-form-item label="更多图片（可选，展示在套餐详情缩略图）">
          <a-upload
            :file-list="galleryFileList"
            list-type="picture-card"
            multiple
            accept="image/*"
            :before-upload="beforeUploadGallery"
            @remove="removeGallery"
          >
            <div>
              <div style="margin-top: 8px">上传</div>
            </div>
          </a-upload>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { packagesApi, type Package } from '@/api/packages';
import { spotsApi, type Spot } from '@/api/spots';
import { styleTagsApi } from '@/api/styleTags';
import { TRAVEL_STYLE_LABELS } from '@/constants/travel-style-labels';
import { message } from 'ant-design-vue';
import type { UploadFile } from 'ant-design-vue';
import { computed, onMounted, reactive, ref } from 'vue';

type AdminRow = {
  id: number;
  spotId: number | null;
  name: string;
  displayName: string;
  location: string;
  spotName?: string;
  style: string;
  styleLabel: string;
  price: number;
  duration: number;
  status: '已上架' | '已下架';
};

const columns = [
  { title: '套餐名称', dataIndex: 'name', key: 'name' },
  { title: '目的地', dataIndex: 'location', key: 'location' },
  { title: '风格', dataIndex: 'style', key: 'style' },
  { title: '天数', dataIndex: 'duration', key: 'duration' },
  { title: '价格', dataIndex: 'price', key: 'price' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '操作', key: 'actions' },
];

const packageList = ref<AdminRow[]>([]);
const packageSearchKeyword = ref('');
const spots = ref<Spot[]>([]);
const loading = ref(false);
const saving = ref(false);
const styleTags = ref<{ key: string; name: string }[]>([]);

const filteredPackages = computed(() => {
  const q = packageSearchKeyword.value.trim().toLowerCase();
  if (!q) return packageList.value;
  return packageList.value.filter((p) => {
    const styleLabel = styleTags.value.find((t) => t.key === p.style)?.name?.toLowerCase() ?? '';
    const blob = [
      p.name,
      p.displayName,
      p.location,
      p.spotName ?? '',
      p.style,
      p.styleLabel,
      styleLabel,
      String(p.price),
      String(p.duration),
    ]
      .join(' ')
      .toLowerCase();
    return blob.includes(q);
  });
});

const styleOptions = computed(() =>
  styleTags.value.map((t) => ({
    label: TRAVEL_STYLE_LABELS[t.key] || t.name || t.key,
    value: t.key,
  }))
);

const computedPackageName = computed(() => {
  const selectedSpotCity =
    spots.value.find((s) => s.id === form.spotId)?.city?.name || String(form.location || '').trim();
  if (!selectedSpotCity) return '';
  if (!form.style) return '';
  const styleLabel = TRAVEL_STYLE_LABELS[form.style];
  if (!styleLabel) return '';
  if (form.duration === null || form.duration === undefined) return '';
  const duration = Number(form.duration);
  if (!Number.isFinite(duration) || duration < 1) return '';
  return `${selectedSpotCity}${duration}日${styleLabel}旅拍套餐`;
});

const spotOptions = computed(() =>
  spots.value.map((s) => ({
    label: `${s.city.name} · ${s.name}`,
    value: s.id,
  }))
);

const filterSpotOption = (input: string, option: { label?: string }) => {
  const label = String(option?.label ?? '');
  return label.toLowerCase().includes(input.toLowerCase());
};

const modalOpen = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({
  spotId: undefined as number | undefined,
  location: '',
  style: '',
  price: null as number | null,
  duration: null as number | null,
  description: '',
  featuresText: '',
  includesText: '',
  excludesText: '',
  coverImage: '',
  images: [] as string[],
});

const packagesRaw = ref<Package[]>([]);

const coverFileList = ref<UploadFile[]>([]);
const galleryFileList = ref<UploadFile[]>([]);

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });

const beforeUploadCover = async (file: File) => {
  try {
    const url = await readAsDataUrl(file);
    form.coverImage = url;
    coverFileList.value = [
      {
        uid: `cover-${Date.now()}`,
        name: file.name,
        status: 'done',
        url,
      } as UploadFile,
    ];
  } catch (e: any) {
    message.error(e?.message || '读取封面失败');
  }
  return false;
};

const removeCover = () => {
  form.coverImage = '';
  coverFileList.value = [];
  return true;
};

const beforeUploadGallery = async (file: File) => {
  try {
    const url = await readAsDataUrl(file);
    form.images = [...(form.images || []), url];
    galleryFileList.value = [
      ...galleryFileList.value,
      {
        uid: `gallery-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        status: 'done',
        url,
      } as UploadFile,
    ];
  } catch (e: any) {
    message.error(e?.message || '读取图片失败');
  }
  return false;
};

const removeGallery = (file: UploadFile) => {
  const url = String((file as any)?.url || '');
  if (url) {
    form.images = (form.images || []).filter((x) => x !== url);
  }
  galleryFileList.value = galleryFileList.value.filter((x) => x.uid !== file.uid);
  return true;
};

const splitLines = (text: string): string[] =>
  String(text || '')
    .split(/\r?\n/g)
    .map((x) => x.trim())
    .filter(Boolean);

const toAdminRow = (p: Package): AdminRow => ({
  id: p.id,
  spotId: p.spotId,
  name: p.name,
  displayName: `${p.location}${p.duration}日${TRAVEL_STYLE_LABELS[p.style] || p.style}旅拍套餐`,
  location: p.location,
  spotName: p.spotName,
  style: p.style,
  styleLabel: TRAVEL_STYLE_LABELS[p.style] || p.style,
  price: p.price,
  duration: p.duration,
  status: p.status === 'published' ? '已上架' : '已下架',
});

const loadSpots = async () => {
  spots.value = await spotsApi.list();
};

const loadStyles = async () => {
  const list = await styleTagsApi.listAdmin();
  styleTags.value = list.map((t) => ({ key: t.key, name: t.name }));
};

const loadPackages = async () => {
  loading.value = true;
  try {
    const list = await packagesApi.getAdminPackages();
    packagesRaw.value = list;
    packageList.value = list.map(toAdminRow);
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  editingId.value = null;
  form.spotId = undefined;
  form.location = '';
  form.style = '';
  form.price = null;
  form.duration = null;
  form.description = '';
  form.featuresText = '';
  form.includesText = '';
  form.excludesText = '';
  form.coverImage = '';
  form.images = [];
  coverFileList.value = [];
  galleryFileList.value = [];
  modalOpen.value = true;
};

const openEdit = (record: AdminRow) => {
  editingId.value = record.id;
  const pkg = packagesRaw.value.find((x) => x.id === record.id);
  form.spotId = record.spotId ?? undefined;
  form.location = record.location || '';
  form.style = record.style;
  form.price = record.price;
  form.duration = record.duration;
  form.description = pkg?.description ?? '';
  form.featuresText = Array.isArray(pkg?.features) ? pkg!.features!.join('\n') : '';
  form.includesText = Array.isArray(pkg?.includes) ? pkg!.includes!.join('\n') : '';
  form.excludesText = Array.isArray(pkg?.excludes) ? pkg!.excludes!.join('\n') : '';
  form.coverImage = pkg?.coverImage ?? '';
  form.images = Array.isArray(pkg?.images) ? pkg!.images! : [];

  coverFileList.value = form.coverImage
    ? ([
        {
          uid: `cover-${record.id}`,
          name: 'cover',
          status: 'done',
          url: form.coverImage,
        } as UploadFile,
      ] as UploadFile[])
    : [];
  galleryFileList.value = (form.images || []).map(
    (url, idx) =>
      ({
        uid: `gallery-${record.id}-${idx}`,
        name: `image-${idx + 1}`,
        status: 'done',
        url,
      }) as UploadFile
  );
  modalOpen.value = true;
};

const savePackage = async () => {
  const hasSpot = form.spotId !== undefined && form.spotId !== null;
  const hasLocation = String(form.location || '').trim().length > 0;
  if (!hasSpot && !hasLocation) {
    message.warning('请选择景点或手填目的地');
    return;
  }
  if (!form.style) {
    message.warning('请选择拍摄风格');
    return;
  }
  if (form.price === null || form.price === undefined || Number(form.price) < 0) {
    message.warning('请输入价格');
    return;
  }
  if (
    form.duration === null ||
    form.duration === undefined ||
    !Number.isFinite(Number(form.duration)) ||
    Number(form.duration) < 1
  ) {
    message.warning('请输入行程天数（至少 1 天）');
    return;
  }
  if (!computedPackageName.value) {
    message.warning('请完善信息以生成套餐名称');
    return;
  }
  saving.value = true;
  try {
    if (editingId.value) {
      await packagesApi.updatePackage(editingId.value, {
        spotId: hasSpot ? form.spotId : null,
        location: hasSpot ? undefined : String(form.location || '').trim(),
        name: computedPackageName.value,
        style: form.style,
        price: Number(form.price),
        duration: Number(form.duration),
        description: String(form.description || ''),
        features: splitLines(form.featuresText),
        includes: splitLines(form.includesText),
        excludes: splitLines(form.excludesText),
        coverImage: String(form.coverImage || ''),
        images: Array.isArray(form.images) ? form.images : [],
      });
      message.success('套餐已更新');
    } else {
      await packagesApi.createPackage({
        spotId: hasSpot ? form.spotId : undefined,
        location: hasSpot ? undefined : String(form.location || '').trim(),
        name: computedPackageName.value,
        style: form.style,
        price: Number(form.price),
        duration: Number(form.duration),
        description: String(form.description || ''),
        features: splitLines(form.featuresText),
        includes: splitLines(form.includesText),
        excludes: splitLines(form.excludesText),
        coverImage: String(form.coverImage || ''),
        images: Array.isArray(form.images) ? form.images : [],
        status: 'published',
      });
      message.success('套餐已新增');
    }
    modalOpen.value = false;
    await loadPackages();
  } catch (e: any) {
    message.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const toggleStatus = async (record: AdminRow) => {
  try {
    await packagesApi.togglePackageStatus(record.id);
    record.status = record.status === '已上架' ? '已下架' : '已上架';
    message.success(`已${record.status === '已上架' ? '上架' : '下架'}套餐`);
  } catch (e: any) {
    message.error(e?.message || '操作失败');
  }
};

onMounted(async () => {
  try {
    await loadSpots();
    await loadStyles();
    await loadPackages();
  } catch (e: any) {
    message.error(e?.message || '初始化失败');
  }
});
</script>

<style scoped lang="less">
.admin-packages-container {
  padding: 20px 24px;
  background: #f6f8fb;
  min-height: calc(100vh - 64px);
}

.header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  h1 {
    margin: 0;
  }
}

.hint {
  margin: 0 0 12px;
  color: #666;
  font-size: 13px;
}

.filter-tip {
  margin: 0 0 10px;
  font-size: 13px;
  color: #666;
}

.spot-sub {
  font-size: 12px;
  color: #888;
  margin-top: 2px;

  &.warn {
    color: #d46b08;
  }
}

.cover-preview {
  margin-top: 10px;
}
</style>
