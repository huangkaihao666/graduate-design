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

    <p class="hint">
      请先填写<strong>目的地</strong>（须与「景点管理」中的城市名称一致，如：三亚），再在下拉框中选择该城市下的<strong>景点</strong>（可选）；不选景点则仅以目的地作为套餐展示。若已选景点，<strong>拍摄风格</strong>将与该景点在景点管理中的「风格分类」一致，并可在套餐介绍处使用「生成描述」辅助撰写文案。
    </p>

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
              <div v-else class="spot-sub muted">未关联景点</div>
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
      cancel-text="取消"
      :confirm-loading="saving"
      @ok="savePackage"
    >
      <a-form layout="vertical">
        <a-form-item label="套餐名称（自动生成）">
          <a-input :value="computedPackageName" disabled />
        </a-form-item>
        <a-form-item label="目的地" required>
          <a-input
            v-model:value="form.location"
            placeholder="须与景点管理中的城市名一致，例如：三亚"
          />
        </a-form-item>
        <a-form-item label="景点（可选）">
          <a-select
            v-model:value="form.spotIds"
            mode="multiple"
            placeholder="请先填写目的地；仅展示该城市下景点管理中的景点（可多选，同城）"
            style="width: 100%"
            allow-clear
            show-search
            :disabled="!normalizedDestination"
            :options="filteredSpotOptions"
            :filter-option="filterSpotOption"
            @change="onSpotChange"
          />
          <p v-if="normalizedDestination && !spotsInDestination.length" class="field-tip">
            当前城市下暂无景点，请先在「景点管理」中新增该城市的景点。
          </p>
        </a-form-item>
        <a-form-item label="风格">
          <a-select
            v-model:value="form.style"
            placeholder="请选择对应拍摄风格"
            style="width: 100%"
            allow-clear
            :disabled="isStyleLockedBySpot"
            :options="styleOptions"
          />
          <p v-if="isStyleLockedBySpot" class="field-tip">
            已选景点，风格自动取「第一个景点」在景点管理中的「风格分类」，无需手动选择。
          </p>
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
        <a-form-item>
          <template #label>
            <div class="package-desc-label-row">
              <span>套餐介绍</span>
              <a-button
                type="link"
                size="small"
                class="package-ai-gen-btn"
                :loading="packageDescGenerating"
                :disabled="!canGeneratePackageDesc"
                @click="runPackageDescGeneration"
              >
                生成描述
              </a-button>
            </div>
          </template>
          <a-textarea
            v-model:value="form.description"
            :rows="4"
            placeholder="可填写套系亮点与说明；也可点击「生成描述」由 AI 根据目的地、价格、行程天数等生成后自行修改"
            show-count
            :maxlength="900"
            allow-clear
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

        <p v-if="form.spotIds.length" class="field-tip image-flow-tip">
          已选景点时，封面与下图集默认合并使用「景点管理」中所选景点的照片（首图为封面，其余为详情缩略图）；您仍可上传或删除以单独调整套餐展示。
        </p>
        <p v-if="form.spotIds.length" class="sync-spot-images">
          <a-button type="link" size="small" @click="syncImagesFromCurrentSpot"
            >重新同步景点照片</a-button
          >
        </p>

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
import { aiApi, type PackageDescriptionDraftResult } from '@/api/ai';
import { packagesApi, type Package } from '@/api/packages';
import { spotsApi, type Spot } from '@/api/spots';
import { styleTagsApi } from '@/api/styleTags';
import { TRAVEL_STYLE_LABELS } from '@/constants/travel-style-labels';
import { getApiErrorMessage } from '@/utils/apiError';
import type { UploadFile } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';

type AdminRow = {
  id: number;
  spotId: number | null;
  spotIds: number[];
  name: string;
  displayName: string;
  location: string;
  spotName?: string;
  spotNames?: string[];
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

/** 已选景点时，风格与景点「风格分类」绑定，不可手改 */
const isStyleLockedBySpot = computed(() => Array.isArray(form.spotIds) && form.spotIds.length > 0);

const packageDescGenerating = ref(false);

const canGeneratePackageDesc = computed(() => {
  const loc = String(form.location || '').trim();
  if (!loc || !form.style) return false;
  if (form.price === null || form.price === undefined || Number(form.price) < 0) return false;
  if (
    form.duration === null ||
    form.duration === undefined ||
    !Number.isFinite(Number(form.duration)) ||
    Number(form.duration) < 1
  ) {
    return false;
  }
  return true;
});

/** 与景点管理中城市名比对（去首尾空格） */
const normalizeCityLabel = (s: string | undefined) => String(s ?? '').trim();

const normalizedDestination = computed(() => normalizeCityLabel(form.location));

const spotsInDestination = computed(() => {
  const loc = normalizedDestination.value;
  if (!loc) return [];
  return spots.value.filter((s) => normalizeCityLabel(s.city?.name) === loc);
});

const filteredSpotOptions = computed(() =>
  spotsInDestination.value.map((s) => ({
    label: s.name,
    value: s.id,
  }))
);

const filterSpotOption = (input: string, option: { label?: string }) => {
  const label = String(option?.label ?? '');
  return label.toLowerCase().includes(input.toLowerCase());
};

const computedPackageName = computed(() => {
  const selectedSpotCity = String(form.location || '').trim();
  if (!selectedSpotCity) return '';
  if (!form.style) return '';
  const styleLabel = TRAVEL_STYLE_LABELS[form.style];
  if (!styleLabel) return '';
  if (form.duration === null || form.duration === undefined) return '';
  const duration = Number(form.duration);
  if (!Number.isFinite(duration) || duration < 1) return '';
  return `${selectedSpotCity}${duration}日${styleLabel}旅拍套餐`;
});

const modalOpen = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({
  location: '',
  spotIds: [] as number[],
  /** 未选须为 undefined，空字符串会导致 Select 不显示 placeholder */
  style: undefined as string | undefined,
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

/** 与景点管理 Spots.vue 中 normalizeImages 一致 */
const normalizeSpotImages = (v: unknown): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return [];
};

const setCoverFileListFromUrl = (url: string, uidSuffix: string) => {
  if (!url) {
    coverFileList.value = [];
    return;
  }
  coverFileList.value = [
    {
      uid: `cover-${uidSuffix}`,
      name: '封面',
      status: 'done',
      url,
    } as UploadFile,
  ];
};

const setGalleryFileListFromUrls = (urls: string[], uidPrefix: string) => {
  galleryFileList.value = urls.map(
    (imgUrl, idx) =>
      ({
        uid: `gallery-${uidPrefix}-${idx}`,
        name: `图${idx + 1}`,
        status: 'done',
        url: imgUrl,
      }) as UploadFile
  );
};

/** 景点照片 → 套餐：合并去重，首图封面，其余为详情图集 */
const applyPackageImagesFromSpots = (picked: Spot[]) => {
  const imgs = picked.flatMap((s) => normalizeSpotImages(s.images));
  const unique = [...new Set(imgs)].filter(Boolean);
  if (!unique.length) {
    form.coverImage = '';
    form.images = [];
    coverFileList.value = [];
    galleryFileList.value = [];
    return;
  }
  form.coverImage = unique[0] ?? '';
  form.images = unique.slice(1);
  const uidSuffix = picked.length
    ? `spots-${picked.map((s) => s.id).join('-')}`
    : String(Date.now());
  setCoverFileListFromUrl(form.coverImage, uidSuffix);
  setGalleryFileListFromUrls(form.images, uidSuffix);
};

const syncImagesFromCurrentSpot = async () => {
  if (!form.spotIds.length) {
    message.warning('请先选择景点');
    return;
  }
  try {
    await loadSpots();
  } catch (e: any) {
    message.error(e?.message || '刷新景点列表失败');
    return;
  }
  const picked = form.spotIds
    .map((id) => spots.value.find((s) => s.id === id))
    .filter((x): x is Spot => !!x);
  if (!picked.length) {
    message.warning('未找到所选景点');
    return;
  }
  applyPackageImagesFromSpots(picked);
  message.success('已同步景点照片');
};

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
    setCoverFileListFromUrl(url, String(Date.now()));
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
  spotIds: Array.isArray(p.spotIds)
    ? p.spotIds.map(Number).filter((x) => Number.isFinite(x) && x > 0)
    : p.spotId
      ? [p.spotId]
      : [],
  name: p.name,
  displayName: `${p.location}${p.duration}日${TRAVEL_STYLE_LABELS[p.style] || p.style}旅拍套餐`,
  location: p.location,
  spotName: p.spotName,
  spotNames: Array.isArray(p.spotNames) ? p.spotNames.map(String).filter(Boolean) : undefined,
  style: p.style,
  styleLabel: TRAVEL_STYLE_LABELS[p.style] || p.style,
  price: p.price,
  duration: p.duration,
  status: p.status === 'published' ? '已上架' : '已下架',
});

const loadStyles = async () => {
  const list = await styleTagsApi.listAdmin();
  styleTags.value = list.map((t) => ({ key: t.key, name: t.name }));
};

const loadSpots = async () => {
  spots.value = await spotsApi.list();
};

/** 选中景点后：同城约束；目的地与第一个景点所属城市对齐；风格取第一个景点分类；同步合并照片 */
const onSpotChange = (ids: number[] | undefined) => {
  const nextIds = Array.isArray(ids)
    ? ids.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0)
    : [];
  if (nextIds.length === 0) {
    form.spotIds = [];
    return;
  }
  const picked = nextIds
    .map((id) => spots.value.find((s) => s.id === id))
    .filter((x): x is Spot => !!x);
  if (!picked.length) {
    form.spotIds = [];
    return;
  }
  const city = String(picked[0]?.city?.name || '').trim();
  const filtered = picked.filter((s) => String(s.city?.name || '').trim() === city);
  const filteredIds = filtered.map((s) => s.id);
  if (filteredIds.length !== nextIds.length) {
    message.warning('一个套餐只能选择同一城市下的多个景点，已自动移除跨城市景点');
  }
  form.spotIds = filteredIds;
  if (city) form.location = city;
  if (filtered[0]?.category) form.style = filtered[0].category;
  applyPackageImagesFromSpots(filtered);
};

const runPackageDescGeneration = async () => {
  if (!canGeneratePackageDesc.value) {
    message.warning('请先填写目的地、风格、价格与行程天数');
    return;
  }
  const loc = String(form.location || '').trim();
  const styleLabel = TRAVEL_STYLE_LABELS[form.style as string] || form.style || '';
  const pickedSpots = form.spotIds
    .map((id) => spots.value.find((s) => s.id === id))
    .filter((x): x is Spot => !!x);
  const spotNames = pickedSpots.map((s) => String(s.name || '').trim()).filter(Boolean);
  const featuresHint = splitLines(form.featuresText).slice(0, 5).join('；');

  packageDescGenerating.value = true;
  try {
    const raw = await aiApi.generatePackageDescriptionDraft({
      location: loc,
      spotName: spotNames[0] || undefined,
      spotNames: spotNames.length ? spotNames : undefined,
      styleLabel,
      priceYuan: Number(form.price),
      durationDays: Number(form.duration),
      featuresHint: featuresHint || undefined,
    });
    const r = raw as {
      data?: { data?: PackageDescriptionDraftResult } & PackageDescriptionDraftResult;
    };
    const data = (r?.data?.data ?? r?.data) as PackageDescriptionDraftResult | undefined;
    const text = String(data?.description ?? '').trim();
    if (!text) {
      message.warning('未得到有效介绍文案，请稍后重试');
      return;
    }
    form.description = text.slice(0, 900);
    const f = Array.isArray(data?.features) ? data!.features!.map(String).filter(Boolean) : [];
    const inc = Array.isArray(data?.includes) ? data!.includes!.map(String).filter(Boolean) : [];
    const exc = Array.isArray(data?.excludes) ? data!.excludes!.map(String).filter(Boolean) : [];
    if (f.length) form.featuresText = f.slice(0, 20).join('\n');
    if (inc.length) form.includesText = inc.slice(0, 30).join('\n');
    if (exc.length) form.excludesText = exc.slice(0, 20).join('\n');
    message.success('已生成套餐文案（介绍/亮点/包含/不含），可继续修改后保存');
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e) || '生成失败');
  } finally {
    packageDescGenerating.value = false;
  }
};

watch(
  () => normalizedDestination.value,
  (loc) => {
    if (!loc) {
      if (form.spotIds.length) form.spotIds = [];
      return;
    }
    if (!form.spotIds.length) return;
    const allowed = new Set(spotsInDestination.value.map((s) => s.id));
    const next = form.spotIds.filter((id) => allowed.has(id));
    if (next.length !== form.spotIds.length) {
      form.spotIds = next;
    }
  }
);

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
  form.location = '';
  form.spotIds = [];
  form.style = undefined;
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
  form.location = record.location || '';
  form.spotIds = Array.isArray(record.spotIds) ? [...record.spotIds] : [];
  form.style = record.style || undefined;
  if (form.spotIds.length) {
    const sp = spots.value.find((s) => s.id === form.spotIds[0]);
    if (sp?.category) form.style = sp.category;
  }
  form.price = record.price;
  form.duration = record.duration;
  form.description = pkg?.description ?? '';
  form.featuresText = Array.isArray(pkg?.features) ? pkg!.features!.join('\n') : '';
  form.includesText = Array.isArray(pkg?.includes) ? pkg!.includes!.join('\n') : '';
  form.excludesText = Array.isArray(pkg?.excludes) ? pkg!.excludes!.join('\n') : '';
  form.coverImage = pkg?.coverImage ?? '';
  form.images = Array.isArray(pkg?.images) ? pkg!.images! : [];

  setCoverFileListFromUrl(form.coverImage, `edit-${record.id}`);
  setGalleryFileListFromUrls(form.images || [], `edit-${record.id}`);
  modalOpen.value = true;
};

const savePackage = async () => {
  const loc = String(form.location || '').trim();
  if (!loc) {
    message.warning('请填写目的地');
    return;
  }
  const hasSpot = form.spotIds.length > 0;
  if (hasSpot) {
    const picked = form.spotIds
      .map((id) => spots.value.find((s) => s.id === id))
      .filter((x): x is Spot => !!x);
    if (!picked.length) {
      message.warning('所选景点无效，请重新选择');
      return;
    }
    const city = normalizeCityLabel(picked[0].city?.name);
    const sameCity = picked.every((s) => normalizeCityLabel(s.city?.name) === city);
    if (!sameCity) {
      message.warning('一个套餐只能选择同一城市下的多个景点');
      return;
    }
    if (city && city !== loc) {
      form.location = city;
    }
    if (picked[0].category) {
      form.style = picked[0].category;
    }
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
    const common = {
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
    };
    if (editingId.value) {
      await packagesApi.updatePackage(editingId.value, {
        ...common,
        ...(hasSpot ? { spotIds: [...form.spotIds] } : { spotIds: [] as number[], location: loc }),
      });
      message.success('套餐已更新');
    } else {
      await packagesApi.createPackage({
        ...common,
        ...(hasSpot ? { spotIds: [...form.spotIds] } : { location: loc }),
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
    await loadStyles();
    await loadSpots();
    await loadPackages();
  } catch (e: any) {
    message.error(e?.message || '初始化失败');
  }
});
</script>

<style scoped lang="less">
.admin-packages-container {
  padding: 32px 24px 24px;
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

.field-tip {
  margin: 6px 0 0;
  font-size: 12px;
  color: #888;
}

.package-desc-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 24px;
}

.package-ai-gen-btn {
  padding: 0 4px;
  flex-shrink: 0;
}

.spot-sub.muted {
  color: #bbb;
}
</style>
