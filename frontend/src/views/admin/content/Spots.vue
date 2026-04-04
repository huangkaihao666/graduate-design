<template>
  <div class="spots-container">
    <div class="header">
      <h1>景点管理</h1>
      <a-space wrap class="header-actions">
        <a-segmented
          v-model:value="regionScope"
          class="region-segmented"
          :options="[
            { label: '国内', value: 'domestic' },
            { label: '国外', value: 'international' },
          ]"
        />
        <a-input-search
          v-model:value="searchKeyword"
          placeholder="搜索城市、景点名称、风格分类、介绍"
          allow-clear
          style="width: min(100vw - 48px, 320px)"
        />
        <a-button @click="load">刷新</a-button>
        <a-button type="primary" @click="openCreateCity">新增城市</a-button>
      </a-space>
    </div>

    <p class="hint">
      使用顶部「国内 /
      国外」切换分区；新建城市默认归入当前分区。港澳台及台湾地区城市请放在「国内」；海外城市请放在「国外」。请先新增城市，再在城市下维护多处景点；每个景点可填写介绍并上传多张照片（与套餐图类似，存为数据
      URL）。城市列表按名称首字母排序（中文按拼音首字母）；左侧 A–Z 可快速定位到对应城市。
    </p>

    <p v-if="searchKeyword.trim()" class="filter-tip">
      已筛选 {{ filteredSpots.length }} / {{ spotListInScope.length }} 条景点
    </p>

    <a-card :bordered="false" :loading="loading">
      <a-empty v-if="!loading && !sortedCities.length" :description="citiesEmptyDescription" />
      <div v-else class="spots-main-row">
        <aside class="index-nav" aria-label="按首字母定位城市">
          <button
            v-for="letter in ALPHABET_LETTERS"
            :key="letter"
            type="button"
            class="index-nav-btn"
            :class="{ 'is-empty': !lettersWithCities.has(letter) }"
            :disabled="!lettersWithCities.has(letter)"
            :title="
              lettersWithCities.has(letter)
                ? `定位到以 ${letter} 开头的城市`
                : `当前列表无 ${letter} 开头的城市`
            "
            @click="scrollToLetter(letter)"
          >
            {{ letter }}
          </button>
        </aside>
        <div class="spots-main">
          <a-collapse v-model:active-key="collapseKeys" :bordered="false" class="city-collapse">
            <a-collapse-panel
              v-for="city in sortedCities"
              :id="'spot-city-anchor-' + city.id"
              :key="String(city.id)"
            >
              <template #header>
                <div class="city-panel-head">
                  <a-tag
                    :color="city.region === 'international' ? 'purple' : 'cyan'"
                    class="region-tag"
                  >
                    {{ city.region === 'international' ? '国外' : '国内' }}
                  </a-tag>
                  <span class="city-title">{{ city.name }}</span>
                </div>
              </template>
              <template #extra>
                <a-tag v-if="city._count != null" color="blue" class="spot-count-tag" @click.stop>
                  {{ city._count.spots }} 个景点
                </a-tag>
              </template>
              <div class="city-toolbar">
                <a-button type="primary" size="small" @click.stop="openCreateSpot(city.id)">
                  在此城市新增景点
                </a-button>
                <a-space size="small">
                  <a @click.stop="openEditCity(city)">重命名城市</a>
                  <a class="danger" @click.stop="removeCity(city)">删除城市</a>
                </a-space>
              </div>
              <a-table
                :columns="columns"
                :data-source="spotsInCity(city.id)"
                :pagination="false"
                size="small"
                row-key="id"
                class="spot-table"
                :locale="{ emptyText: '该城市暂无设置景点' }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'category'">
                    {{ getSpotCategoryLabel(record.category) }}
                  </template>
                  <template v-else-if="column.key === 'description'">
                    <span class="desc-cell">{{ record.description || '—' }}</span>
                  </template>
                  <template v-else-if="column.key === 'images'">
                    {{ normalizeImages(record.images).length }} 张
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <a-space>
                      <a @click="openEditSpot(record)">编辑</a>
                      <a @click="toggleRecommended(record)">
                        {{ record.recommended ? '取消推荐' : '设为推荐' }}
                      </a>
                      <a @click="removeSpot(record.id)">删除</a>
                    </a-space>
                  </template>
                  <template v-else-if="column.key === 'recommended'">
                    <a-tag :color="record.recommended ? 'gold' : 'default'">
                      {{ record.recommended ? '推荐' : '普通' }}
                    </a-tag>
                  </template>
                </template>
              </a-table>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </div>
    </a-card>

    <a-modal
      v-model:open="cityModalOpen"
      :title="cityEditingId ? '重命名城市' : '新增城市'"
      ok-text="保存"
      cancel-text="取消"
      :confirm-loading="citySaving"
      @ok="submitCity"
    >
      <a-form layout="vertical">
        <a-form-item label="所属区域" required>
          <a-radio-group v-model:value="cityForm.region">
            <a-radio value="domestic">国内</a-radio>
            <a-radio value="international">国外</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="城市名称" required>
          <a-input v-model:value="cityForm.name" placeholder="例如：三亚" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="spotModalOpen"
      :title="spotEditingId ? '编辑景点' : '新增景点'"
      ok-text="保存"
      cancel-text="取消"
      width="min(96vw, 560px)"
      :confirm-loading="spotSaving"
      @ok="submitSpot"
    >
      <a-form layout="vertical">
        <a-form-item v-if="!spotEditingId" label="所属城市">
          <span class="form-city-readonly">{{ creatingCityName }}</span>
          <span class="form-city-tip">（由当前折叠面板城市自动带入，无需选择）</span>
        </a-form-item>
        <a-form-item label="景点名称" required>
          <a-input v-model:value="spotForm.name" placeholder="例如：天涯海角" />
        </a-form-item>
        <a-form-item label="风格分类" required>
          <a-select
            v-model:value="spotForm.category"
            placeholder="请选择与旅拍风格一致的分类"
            style="width: 100%"
            show-search
            :options="spotCategorySelectOptions"
            :filter-option="filterCategoryOption"
          />
        </a-form-item>
        <a-form-item>
          <template #label>
            <div class="spot-desc-label-row">
              <span>景点介绍</span>
              <a-button
                type="link"
                size="small"
                class="spot-ai-gen-btn"
                :loading="spotDraftGenerating"
                :disabled="!spotForm.name.trim()"
                @click="runSpotDraftGeneration"
              >
                生成描述
              </a-button>
            </div>
          </template>
          <a-textarea
            v-model:value="spotForm.description"
            placeholder="可填写景点特色、开放时间、注意事项等；也可点击「生成描述」由 DeepSeek 生成后自行修改"
            :rows="4"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="景点照片">
          <a-upload
            list-type="picture-card"
            :file-list="spotGalleryFileList"
            :before-upload="beforeSpotGallery"
            @remove="removeSpotGallery"
          >
            <div v-if="spotGalleryFileList.length < 12">
              <PlusOutlined />
              <div class="ant-upload-text">上传</div>
            </div>
          </a-upload>
          <p class="upload-hint">建议单张不超过 2MB；最多 12 张。</p>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="spotDraftModalOpen"
      title="AI 生成结果"
      width="min(96vw, 640px)"
      ok-text="保存到表单"
      cancel-text="取消"
      :destroy-on-close="true"
      @ok="applySpotDraft"
    >
      <p v-if="spotDraftImagesNote" class="draft-note">{{ spotDraftImagesNote }}</p>
      <a-form layout="vertical" class="draft-form">
        <a-form-item label="介绍文案（可编辑后再保存到景点）">
          <a-textarea v-model:value="spotDraftDescription" :rows="9" allow-clear />
        </a-form-item>
        <a-form-item v-if="spotDraftImageUrls.length" label="推荐配图">
          <p class="draft-images-hint">
            已由后台下载为可嵌入格式；勾选后将追加到下方「景点照片」（不超过 12
            张，可再删除或继续上传）。
          </p>
          <a-checkbox-group v-model:value="spotDraftSelectedUrls" class="draft-checkbox-group">
            <a-row :gutter="[12, 12]">
              <a-col
                v-for="(url, idx) in spotDraftImageUrls"
                :key="'draft-img-' + idx + '-' + String(url).slice(0, 48)"
                :xs="12"
                :sm="8"
              >
                <div class="draft-img-tile">
                  <img :src="url" alt="" loading="lazy" />
                  <a-checkbox :value="url" class="draft-img-check">选用</a-checkbox>
                </div>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { aiApi } from '@/api/ai';
import { citiesApi, spotsApi, type City, type CityRegion, type Spot } from '@/api/spots';
import {
  getSpotCategoryLabel,
  SPOT_STYLE_CATEGORY_OPTIONS,
} from '@/constants/spot-style-categories';
import { TRAVEL_STYLE_LABELS } from '@/constants/travel-style-labels';
import { getCityInitialLetter } from '@/utils/cityInitialLetter';
import { getApiErrorMessage } from '@/utils/apiError';
import { PlusOutlined } from '@ant-design/icons-vue';
import { message, Modal } from 'ant-design-vue';
import type { UploadFile } from 'ant-design-vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';

/** AI 景点草稿（与后端 SpotDraftResult 对应；响应经全局包装后取 data.data 或 data） */
type SpotDraftPayload = {
  description?: string;
  imageUrls?: string[];
  imagesNote?: string;
  imageSearchQuery?: string;
};

const ALPHABET_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const columns = [
  { title: '景点名称', dataIndex: 'name', key: 'name', width: 140 },
  { title: '风格分类', key: 'category', width: 120 },
  { title: '介绍', key: 'description', ellipsis: true },
  { title: '照片', key: 'images', width: 72 },
  { title: '推荐', dataIndex: 'recommended', key: 'recommended', width: 88 },
  { title: '操作', key: 'actions', width: 200 },
];

const REGION_SCOPE_KEY = 'admin-spots-region-scope';

const spotList = ref<Spot[]>([]);
const cities = ref<City[]>([]);
const searchKeyword = ref('');
const loading = ref(false);
const collapseKeys = ref<string[]>([]);

/** 国内 / 国外切换（记住上次选择） */
const regionScope = ref<CityRegion>(
  ((): CityRegion => {
    try {
      const s = localStorage.getItem(REGION_SCOPE_KEY);
      if (s === 'international' || s === 'domestic') return s;
    } catch {
      /* ignore */
    }
    return 'domestic';
  })()
);

const cityModalOpen = ref(false);
const citySaving = ref(false);
const cityEditingId = ref<number | null>(null);
const cityForm = reactive({ name: '', region: 'domestic' as CityRegion });

const spotModalOpen = ref(false);
const spotSaving = ref(false);
const spotEditingId = ref<number | null>(null);
const spotForm = reactive({
  cityId: undefined as number | undefined,
  name: '',
  category: '',
  description: '',
});
const spotGalleryUrls = ref<string[]>([]);
const spotGalleryFileList = ref<UploadFile[]>([]);

const spotDraftGenerating = ref(false);
const spotDraftModalOpen = ref(false);
const spotDraftDescription = ref('');
const spotDraftImageUrls = ref<string[]>([]);
const spotDraftSelectedUrls = ref<string[]>([]);
const spotDraftImagesNote = ref('');

const knownStyleCategoryKeys = new Set(Object.keys(TRAVEL_STYLE_LABELS));

const spotCategorySelectOptions = computed(() => {
  const base = SPOT_STYLE_CATEGORY_OPTIONS;
  const c = spotForm.category;
  if (c && !knownStyleCategoryKeys.has(c)) {
    return [{ value: c, label: `${c}（旧数据，请改为标准分类）` }, ...base];
  }
  return base;
});

const filterCategoryOption = (input: string, option: { label?: string }) => {
  const label = String(option?.label ?? '');
  return label.toLowerCase().includes(input.toLowerCase());
};

const normalizeImages = (v: unknown): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  return [];
};

/** 当前「国内/国外」分区下的景点 */
const spotListInScope = computed(() =>
  spotList.value.filter((s) => (s.city?.region ?? 'domestic') === regionScope.value)
);

const filteredSpots = computed(() => {
  const q = searchKeyword.value.trim().toLowerCase();
  const base = spotListInScope.value;
  if (!q) return base;
  return base.filter((s) => {
    const cityName = s.city?.name ?? '';
    const catLabel = getSpotCategoryLabel(s.category);
    const blob = [s.name, cityName, s.category, catLabel, s.description || '']
      .join(' ')
      .toLowerCase();
    return blob.includes(q);
  });
});

/** 当前分区下的城市列表 */
const citiesInScope = computed(() =>
  cities.value.filter((c) => (c.region ?? 'domestic') === regionScope.value)
);

const citiesEmptyDescription = computed(() => {
  if (!cities.value.length) return '暂无城市，请先新增城市';
  if (!citiesInScope.value.length) {
    return regionScope.value === 'domestic'
      ? '国内暂无城市，请「新增城市」或切换到「国外」'
      : '国外暂无城市，请「新增城市」或切换到「国内」';
  }
  if (searchKeyword.value.trim()) return '未找到匹配的城市或景点，请调整搜索词';
  return '暂无匹配结果';
});

/** 按名称首字母（中文为拼音首字母）排序，同字母下按中文拼音序 */
const sortCitiesByInitialAndName = (list: City[]) =>
  [...list].sort((a, b) => {
    const la = getCityInitialLetter(a.name);
    const lb = getCityInitialLetter(b.name);
    if (la !== lb) {
      if (la === '#') return 1;
      if (lb === '#') return -1;
      return la.localeCompare(lb);
    }
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  });

const sortedCities = computed(() => {
  const q = searchKeyword.value.trim();
  const ql = q.toLowerCase();
  /** 有搜索词时：须同时按「城市名」匹配，否则仅新建、尚无景点的城市会被整组筛掉，看起来像搜不到 */
  const list = q
    ? citiesInScope.value.filter(
        (c) =>
          c.name.toLowerCase().includes(ql) || filteredSpots.value.some((s) => s.cityId === c.id)
      )
    : [...citiesInScope.value];
  return sortCitiesByInitialAndName(list);
});

/** 当前列表中出现的首字母（A–Z），用于禁用无数据字母 */
const lettersWithCities = computed(() => {
  const set = new Set<string>();
  for (const c of sortedCities.value) {
    const l = getCityInitialLetter(c.name);
    if (l !== '#') set.add(l);
  }
  return set;
});

function scrollToLetter(letter: string) {
  const city = sortedCities.value.find((c) => getCityInitialLetter(c.name) === letter);
  if (!city) return;
  document.getElementById(`spot-city-anchor-${city.id}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
}

const creatingCityName = computed(() => {
  const id = spotForm.cityId;
  if (id === undefined || id === null) return '—';
  return cities.value.find((c) => c.id === id)?.name ?? '—';
});

const spotsInCity = (cityId: number) =>
  filteredSpots.value.filter((s) => s.cityId === cityId).sort((a, b) => a.id - b.id);

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });

const beforeSpotGallery = async (file: File) => {
  try {
    const url = await readAsDataUrl(file);
    spotGalleryUrls.value = [...spotGalleryUrls.value, url];
    spotGalleryFileList.value = [
      ...spotGalleryFileList.value,
      {
        uid: `spot-g-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        status: 'done',
        url,
      } as UploadFile,
    ];
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e) || '读取图片失败');
  }
  return false;
};

const removeSpotGallery = (file: UploadFile) => {
  const url = String((file as { url?: string })?.url || '');
  if (url) {
    spotGalleryUrls.value = spotGalleryUrls.value.filter((x) => x !== url);
  }
  spotGalleryFileList.value = spotGalleryFileList.value.filter((x) => x.uid !== file.uid);
  return true;
};

const appendGalleryUrls = (urls: string[]) => {
  for (const url of urls) {
    if (!url || spotGalleryUrls.value.includes(url)) continue;
    if (spotGalleryUrls.value.length >= 12) break;
    spotGalleryUrls.value = [...spotGalleryUrls.value, url];
    spotGalleryFileList.value = [
      ...spotGalleryFileList.value,
      {
        uid: `ai-img-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: '推荐配图',
        status: 'done',
        url,
      } as UploadFile,
    ];
  }
};

const runSpotDraftGeneration = async () => {
  if (!spotForm.name.trim()) {
    message.warning('请先填写景点名称');
    return;
  }
  spotDraftGenerating.value = true;
  try {
    const cityLabel = creatingCityName.value;
    const raw = await aiApi.generateSpotDraft({
      cityName: cityLabel === '—' ? '' : cityLabel,
      spotName: spotForm.name.trim(),
      category: getSpotCategoryLabel(spotForm.category) || spotForm.category || undefined,
    });
    /** 与 VirtualTryOn 一致：全局 TransformInterceptor 外包一层 data，控制器再返回 { data: 草稿 } */
    const r = raw as { data?: { data?: SpotDraftPayload } & SpotDraftPayload };
    const data = (r?.data?.data ?? r?.data) as SpotDraftPayload | undefined;
    if (!data || typeof data !== 'object') {
      message.warning('接口返回异常，请稍后重试');
      return;
    }
    spotDraftDescription.value = String(data.description ?? '').trim();
    const imgs = Array.isArray(data.imageUrls)
      ? data.imageUrls.map(String).filter((u) => u.startsWith('data:image/'))
      : [];
    spotDraftImageUrls.value = imgs;
    spotDraftSelectedUrls.value = [...imgs];
    spotDraftImagesNote.value = String(data.imagesNote ?? '').trim();
    if (!imgs.length) {
      message.warning(
        spotDraftImagesNote.value || '未收到配图数据：请确认后端已重启且接口未截断大体积 JSON。'
      );
    }
    if (!spotDraftDescription.value) {
      message.warning('未得到有效介绍文案，请稍后重试');
      return;
    }
    spotDraftModalOpen.value = true;
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e) || '生成失败');
  } finally {
    spotDraftGenerating.value = false;
  }
};

const applySpotDraft = () => {
  spotForm.description = spotDraftDescription.value.trim();
  const picked = spotDraftSelectedUrls.value.filter((u) => spotDraftImageUrls.value.includes(u));
  appendGalleryUrls(picked);
  spotDraftModalOpen.value = false;
  message.success('已写入表单，确认后点击「保存」保存景点');
};

const load = async () => {
  loading.value = true;
  try {
    const [cList, sList] = await Promise.all([citiesApi.list(), spotsApi.list()]);
    cities.value = cList;
    spotList.value = sList;
    /** 默认全部收起，仅点击左侧箭头展开该城市下的景点明细 */
    collapseKeys.value = [];
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e) || '加载失败');
  } finally {
    loading.value = false;
  }
};

const openCreateCity = () => {
  cityEditingId.value = null;
  cityForm.name = '';
  cityForm.region = regionScope.value;
  cityModalOpen.value = true;
};

const openEditCity = (city: City) => {
  cityEditingId.value = city.id;
  cityForm.name = city.name;
  cityForm.region = city.region ?? 'domestic';
  cityModalOpen.value = true;
};

const submitCity = async () => {
  const name = cityForm.name.trim();
  if (!name) {
    message.warning('请填写城市名称');
    return;
  }
  citySaving.value = true;
  try {
    if (cityEditingId.value) {
      await citiesApi.update(cityEditingId.value, { name, region: cityForm.region });
      message.success('城市已更新');
    } else {
      await citiesApi.create({ name, region: cityForm.region });
      message.success('已新增城市');
    }
    cityModalOpen.value = false;
    await load();
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e) || '保存失败');
  } finally {
    citySaving.value = false;
  }
};

const removeCity = (city: City) => {
  Modal.confirm({
    title: `确认删除城市「${city.name}」？`,
    content: '仅当该城市下没有任何景点时可删除。',
    okText: '删除',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      try {
        await citiesApi.remove(city.id);
        message.success('已删除城市');
        await load();
      } catch (e: unknown) {
        if ((e as { statusCode?: number })?.statusCode !== 400) {
          message.error(getApiErrorMessage(e) || '删除失败');
        }
      }
    },
  });
};

const openCreateSpot = (cityId: number) => {
  spotEditingId.value = null;
  spotForm.cityId = cityId;
  spotForm.name = '';
  spotForm.category = SPOT_STYLE_CATEGORY_OPTIONS[0]?.value ?? '';
  spotForm.description = '';
  spotGalleryUrls.value = [];
  spotGalleryFileList.value = [];
  spotModalOpen.value = true;
};

const openEditSpot = (record: Spot) => {
  spotEditingId.value = record.id;
  spotForm.cityId = record.cityId;
  spotForm.name = record.name;
  spotForm.category = record.category;
  spotForm.description = record.description || '';
  const imgs = normalizeImages(record.images);
  spotGalleryUrls.value = [...imgs];
  spotGalleryFileList.value = imgs.map((url, i) => ({
    uid: `edit-${record.id}-${i}`,
    name: `图${i + 1}`,
    status: 'done',
    url,
  })) as UploadFile[];
  spotModalOpen.value = true;
};

const submitSpot = async () => {
  if (!spotForm.name.trim() || !spotForm.category.trim()) {
    message.warning('请填写景点名称并选择风格分类');
    return;
  }
  if (!spotEditingId.value && (spotForm.cityId === undefined || spotForm.cityId === null)) {
    message.warning('城市信息缺失，请关闭后从对应城市下「在此城市新增景点」重新进入');
    return;
  }
  spotSaving.value = true;
  try {
    const payload = {
      name: spotForm.name.trim(),
      category: spotForm.category.trim(),
      description: spotForm.description.trim() || null,
      images: spotGalleryUrls.value.length ? [...spotGalleryUrls.value] : null,
    };
    if (spotEditingId.value) {
      await spotsApi.update(spotEditingId.value, payload);
      message.success('景点已更新');
    } else {
      await spotsApi.create({
        cityId: spotForm.cityId!,
        ...payload,
      });
      message.success('已新增景点');
    }
    spotModalOpen.value = false;
    await load();
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e) || '保存失败');
  } finally {
    spotSaving.value = false;
  }
};

const toggleRecommended = async (record: Spot) => {
  try {
    await spotsApi.update(record.id, { recommended: !record.recommended });
    record.recommended = !record.recommended;
    message.success('已更新');
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e) || '操作失败');
  }
};

const removeSpot = (id: number) => {
  Modal.confirm({
    title: '确认删除该景点？',
    content:
      '删除后不可恢复。若仍有「已上架」套餐引用该目的地，将无法删除，请先在套餐管理中下架相关套餐；仅下架状态的套餐不会阻止删除。',
    okText: '删除',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      try {
        await spotsApi.remove(id);
        message.success('已删除景点');
        await load();
      } catch (e: unknown) {
        const body = e as { statusCode?: number };
        if (body?.statusCode !== 400) {
          message.error(getApiErrorMessage(e) || '删除失败');
        }
      }
    },
  });
};

watch(searchKeyword, () => {
  collapseKeys.value = [];
});

watch(regionScope, (v) => {
  try {
    localStorage.setItem(REGION_SCOPE_KEY, v);
  } catch {
    /* ignore */
  }
  collapseKeys.value = [];
});

onMounted(() => {
  load();
});
</script>

<style scoped lang="less">
.spots-container {
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

.header-actions {
  align-items: center;
}

.region-segmented {
  flex-shrink: 0;
}

.region-tag {
  flex-shrink: 0;
}

.city-panel-head .region-tag {
  margin-inline-end: 0;
}

.form-city-readonly {
  font-weight: 600;
  color: #1f1f1f;
}

.form-city-tip {
  margin-left: 6px;
  font-size: 12px;
  color: #888;
  font-weight: normal;
}

.hint {
  margin: 0 0 10px;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.filter-tip {
  margin: 0 0 10px;
  font-size: 13px;
  color: #666;
}

.spots-main-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.spots-main {
  flex: 1;
  min-width: 0;
}

.index-nav {
  position: sticky;
  top: 72px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  background: #fff;
  border: 1px solid #e8ecf2;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(17, 24, 39, 0.04);
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.index-nav-btn {
  min-width: 28px;
  padding: 3px 10px;
  margin: 0;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 500;
  color: #1677ff;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: rgba(22, 119, 255, 0.08);
  }

  &:disabled,
  &.is-empty {
    color: #c8ccd4;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid #1677ff;
    outline-offset: 1px;
  }
}

@media (max-width: 640px) {
  .spots-main-row {
    flex-direction: column;
  }

  .index-nav {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    max-height: none;
    width: 100%;
    justify-content: center;
  }
}

.city-collapse {
  background: transparent;

  :deep(.ant-collapse-item) {
    margin-bottom: 10px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e8ecf2;
    background: #fff;
  }

  :deep(.ant-collapse-header) {
    align-items: center;
  }

  :deep(.ant-collapse-extra) {
    margin-inline-end: 12px;
  }
}

.city-panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.city-title {
  font-weight: 600;
  min-width: 0;
}

.spot-count-tag {
  flex-shrink: 0;
}

.city-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.danger {
  color: #cf1322;
}

.spot-table {
  :deep(.ant-table) {
    background: transparent;
  }
}

.desc-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13px;
  color: #555;
}

.upload-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #888;
}

.ant-upload-text {
  margin-top: 4px;
  font-size: 12px;
}

.spot-desc-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
  padding-right: 0;
}

.spot-ai-gen-btn {
  padding: 0;
  height: auto;
  line-height: 1.4;
}

.draft-note {
  margin: 0 0 12px;
  padding: 8px 10px;
  font-size: 12px;
  color: #666;
  background: #f6f8fb;
  border-radius: 8px;
  line-height: 1.5;
}

.draft-form {
  margin-top: 4px;
}

.draft-images-hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #888;
}

.draft-checkbox-group {
  display: block;
  width: 100%;
}

.draft-img-tile {
  border: 1px solid #e8ecf2;
  border-radius: 8px;
  overflow: hidden;
  background: #fafafa;

  img {
    display: block;
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    vertical-align: top;
  }

  .draft-img-check {
    display: flex;
    align-items: center;
    padding: 6px 8px;
    margin: 0;
    font-size: 13px;
  }
}
</style>
