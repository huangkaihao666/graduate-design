/* stylelint-disable */
<template>
  <div class="page">
    <div class="head">
      <div class="tags">
        <a-checkable-tag
          v-for="t in categories"
          :key="t.key"
          :checked="cat === t.key"
          class="pill-tag"
          @change="() => (cat = t.key)"
        >
          {{ t.label }}
        </a-checkable-tag>
      </div>
    </div>

    <div class="grid">
      <section class="main">
        <div class="gallery">
          <div v-for="item in filtered" :key="item.url" class="item">
            <a-image :src="item.url" :preview="true" class="img" />
            <div class="mask">
              <a-space>
                <a-button size="small" class="pill ghost" @click="edit(item)">编辑</a-button>
                <a-button
                  size="small"
                  danger
                  class="pill ghost"
                  @click="openDeleteConfirm(item.url)"
                  >删除</a-button
                >
              </a-space>
            </div>
            <div class="meta">
              <span class="c">{{ categoryLabel(item.category) }}</span>
              <span class="d">{{ item.desc || '—' }}</span>
            </div>
          </div>
          <a-empty v-if="!filtered.length" description="暂无作品" />
        </div>
      </section>

      <aside class="right">
        <div class="panel">
          <div class="panel-h">
            <div class="panel-title">上传面板</div>
          </div>
          <a-upload-dragger :multiple="true" :show-upload-list="false" :custom-request="upload">
            <p class="ant-upload-drag-icon">🖼️</p>
            <p class="ant-upload-text">拖拽或点击上传作品图</p>
            <p class="ant-upload-hint">粉色质感卡片风格，支持多张</p>
          </a-upload-dragger>
          <div v-if="pendingUploads.length" class="pending-wrap">
            <div class="pending-title">待上传（{{ pendingUploads.length }}）</div>
            <div class="pending-list">
              <a-image
                v-for="u in pendingUploads"
                :key="u"
                :src="u"
                :preview="false"
                class="pending-img"
              />
            </div>
          </div>

          <a-divider />
          <a-form layout="vertical">
            <a-form-item label="作品描述">
              <a-textarea
                v-model:value="draftDesc"
                :rows="2"
                placeholder="如：韩系清透新娘妆 · 三亚海边旅拍"
              />
            </a-form-item>
            <a-form-item label="分类">
              <a-segmented v-model:value="draftCat" :options="catOptions" />
            </a-form-item>
            <a-button type="primary" class="pill" block @click="applyDraft">上传作品</a-button>
          </a-form>
        </div>

        <div class="panel">
          <div class="panel-h">
            <div class="panel-title">作品统计</div>
          </div>
          <div class="stat">
            <div class="s">
              <div class="n">{{ items.length }}</div>
              <div class="t">总作品数</div>
            </div>
            <div class="s">
              <div class="n soft">{{ likes }}</div>
              <div class="t">点赞数（演示）</div>
            </div>
            <div class="s">
              <div class="n soft">{{ reviews }}</div>
              <div class="t">客户评价数（演示）</div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <a-modal
      v-model:open="editOpen"
      title="编辑作品"
      ok-text="保存"
      :ok-button-props="{ class: 'portfolio-ok-btn' }"
      :cancel-button-props="{ class: 'portfolio-cancel-btn' }"
      @ok="saveEdit"
    >
      <a-form layout="vertical">
        <a-form-item label="描述">
          <a-textarea v-model:value="editDesc" :rows="3" />
        </a-form-item>
        <a-form-item label="分类">
          <a-segmented v-model:value="editCat" :options="catOptions" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="deleteConfirmOpen"
      title="确认删除作品"
      ok-text="确认删除"
      cancel-text="取消"
      :width="500"
      :style="{ top: '210px' }"
      ok-type="danger"
      :ok-button-props="{ class: 'portfolio-ok-btn' }"
      :cancel-button-props="{ class: 'portfolio-cancel-btn' }"
      @ok="confirmDelete"
      @cancel="cancelDelete"
    >
      <p>删除后不可恢复，确认要删除这张作品吗？</p>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { authApi } from '@/api/auth';
import { photographersApi, type PhotographerPublic } from '@/api/photographers';
import { useAuthStore } from '@/store/auth';
import type { UploadProps } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { computed, onMounted, ref } from 'vue';

type Cat = 'wedding' | 'makeup' | 'styling';
type Item = { url: string; category: Cat; desc?: string };

const authStore = useAuthStore();
const storageKey = computed(() => `worker_portfolio_items_v1_${authStore.user?.id ?? 'guest'}`);
const urlsKey = computed(() => `worker_portfolio_urls_${authStore.user?.id ?? 'guest'}`);
const metaKey = computed(() => `worker_portfolio_meta_v1_${authStore.user?.id ?? 'guest'}`);

const categories = [
  { key: 'all', label: '全部' },
  { key: 'wedding', label: '婚纱摄影' },
  { key: 'makeup', label: '妆造案例' },
  { key: 'styling', label: '造型作品' },
] as const;

const catOptions = [
  { label: '婚纱摄影', value: 'wedding' },
  { label: '妆造案例', value: 'makeup' },
  { label: '造型作品', value: 'styling' },
];

const cat = ref<string>('all');
const items = ref<Item[]>([]);

const photographerId = ref<number | null>(null);
const missingBindingWarned = ref(false);
const localCacheWarned = ref(false);
const syncFailedWarned = ref(false);
const disableHeavyLocalCache = ref(false);

const draftDesc = ref('');
const draftCat = ref<Cat | undefined>('wedding');
const pendingUploads = ref<string[]>([]);
const uploading = ref(false);

const likes = computed(() => Math.max(0, items.value.length * 13));
const reviews = computed(() => Math.max(0, Math.floor(items.value.length * 1.6)));

const resolveWorkerPhotographer = async (): Promise<number | null> => {
  if (photographerId.value) return photographerId.value;
  let boundId = Number(authStore.user?.workerPhotographerId || 0);
  if (!Number.isFinite(boundId) || boundId <= 0) {
    try {
      await authStore.getProfile();
      boundId = Number(authStore.user?.workerPhotographerId || 0);
    } catch {
      /* ignore */
    }
  }
  if (Number.isFinite(boundId) && boundId > 0) {
    photographerId.value = boundId;
    return photographerId.value;
  }
  const workerName = String(authStore.user?.name || '').trim();
  if (!workerName) return null;
  try {
    const me = await photographersApi.getMine();
    if (me?.id) {
      photographerId.value = Number(me.id);
      return photographerId.value;
    }
  } catch {
    /* ignore */
  }
  try {
    const pub = await photographersApi.getPublic();
    const hit = (Array.isArray(pub) ? pub : []).find(
      (x: PhotographerPublic) => String(x.name || '').trim() === workerName
    );
    if (hit?.id) {
      photographerId.value = Number(hit.id);
      return photographerId.value;
    }
  } catch {
    /* ignore */
  }
  try {
    const p: unknown = await authApi.getProfile();
    const data =
      (p as { data?: { data?: unknown } })?.data?.data ?? (p as { data?: unknown })?.data ?? p;
    const pid = Number((data as { workerPhotographerId?: number })?.workerPhotographerId || 0);
    if (Number.isFinite(pid) && pid > 0) {
      photographerId.value = pid;
      return photographerId.value;
    }
  } catch {
    /* ignore */
  }
  return null;
};

const defaultItem = (url: string): Item => ({
  url,
  category: 'wedding',
  desc: '',
});

const hashUrl = (url: string): string => {
  // 轻量稳定哈希，避免把超长 dataURL 直接写入本地缓存
  let h = 2166136261;
  for (let i = 0; i < url.length; i += 1) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `u${(h >>> 0).toString(36)}`;
};

const saveMetaOnly = () => {
  const compact = items.value
    .filter((x) => !!x.url)
    .map((x) => ({
      k: hashUrl(String(x.url)),
      c: x.category || 'wedding',
      d: String(x.desc || ''),
    }));
  const payload = JSON.stringify(compact);
  try {
    localStorage.setItem(metaKey.value, payload);
  } catch {
    try {
      // 本地空间不足时，降级到会话缓存，保证切页后描述不丢（同一会话）
      sessionStorage.setItem(metaKey.value, payload);
    } catch {
      /* ignore */
    }
  }
};

const readMetaByHash = () => {
  try {
    const raw = localStorage.getItem(metaKey.value) || sessionStorage.getItem(metaKey.value);
    const list = raw ? (JSON.parse(raw) as Array<{ k?: string; c?: Cat; d?: string }>) : [];
    const m = new Map<string, { category: Cat; desc: string }>();
    for (const it of Array.isArray(list) ? list : []) {
      const k = String(it?.k || '').trim();
      if (!k) continue;
      const c = it?.c === 'makeup' || it?.c === 'styling' ? it.c : 'wedding';
      m.set(k, { category: c, desc: String(it?.d || '') });
    }
    return m;
  } catch {
    return new Map<string, { category: Cat; desc: string }>();
  }
};

const normalizeServerPortfolioItems = (v: unknown): Item[] => {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as { url?: unknown; category?: unknown; desc?: unknown };
    const url = String(row.url || '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const c = String(row.category || '')
      .trim()
      .toLowerCase();
    const category: Cat = c === 'makeup' || c === 'styling' ? (c as Cat) : 'wedding';
    out.push({
      url,
      category,
      desc: String(row.desc || '').trim(),
    });
  }
  return out;
};

const saveLocalOnly = (notify = true) => {
  if (disableHeavyLocalCache.value) {
    saveMetaOnly();
    return;
  }
  try {
    localStorage.setItem(storageKey.value, JSON.stringify(items.value));
    localStorage.setItem(urlsKey.value, JSON.stringify(items.value.map((x) => x.url)));
    saveMetaOnly();
  } catch {
    // 本地空间不足后切换为轻量缓存模式，避免后续反复写大对象导致重复失败
    disableHeavyLocalCache.value = true;
    try {
      localStorage.removeItem(storageKey.value);
      localStorage.removeItem(urlsKey.value);
    } catch {
      /* ignore */
    }
    // 兜底：主缓存失败也尽量保留描述与分类（不存大图 URL）
    saveMetaOnly();
    if (notify && !localCacheWarned.value) {
      message.warning('本机存储空间不足：已自动启用轻量缓存，并继续同步到服务器');
      localCacheWarned.value = true;
    }
  }
};

const syncPortfolioToBackend = async (): Promise<boolean> => {
  if (!authStore.user?.workerPhotographerId && authStore.accessToken) {
    try {
      await authStore.getProfile();
    } catch {
      /* ignore */
    }
  }
  if (!authStore.user?.workerPhotographerId) {
    if (!missingBindingWarned.value) {
      message.warning('当前账号未关联摄影师档案，作品仅保存在本机，用户端无法展示');
      missingBindingWarned.value = true;
    }
    return false;
  }
  const normalizedItems = dedupe(items.value).map((x) => ({
    url: String(x.url || '').trim(),
    category: x.category || 'wedding',
    desc: String(x.desc || ''),
  }));
  const urls = dedupeUrls(normalizedItems.map((x) => x.url).filter(Boolean));
  try {
    await photographersApi.updateMine({
      portfolioImages: urls,
      portfolioItems: normalizedItems,
    });
    syncFailedWarned.value = false;
    return true;
  } catch {
    if (!syncFailedWarned.value) {
      message.warning('作品同步到服务器失败，请检查网络或重新登录');
      syncFailedWarned.value = true;
    }
    return false;
  }
};

const load = () => {
  try {
    const raw = localStorage.getItem(storageKey.value);
    const list = raw ? (JSON.parse(raw) as Item[]) : [];
    items.value = Array.isArray(list) ? list : [];
    if (items.value.length > 0) {
      // 仅在主缓存有内容时回写，避免空列表覆盖已有轻量描述缓存
      saveMetaOnly();
      try {
        localStorage.setItem(urlsKey.value, JSON.stringify(items.value.map((x) => x.url)));
      } catch {
        /* ignore */
      }
    } else {
      // 主缓存缺失时进入轻量缓存模式，后续不再尝试写大对象
      disableHeavyLocalCache.value = true;
    }
  } catch {
    items.value = [];
    disableHeavyLocalCache.value = true;
  }
};

const pullPortfolioFromBackend = async () => {
  const localSnapshot = [...items.value];
  const localByUrl = new Map<string, Item>();
  for (const it of localSnapshot) {
    if (it?.url) localByUrl.set(it.url, it);
  }
  const metaByHash = readMetaByHash();

  let serverUrls: string[] = [];
  let serverItems: Item[] = [];

  try {
    const hit = await photographersApi.getMine();
    photographerId.value = hit.id;
    serverItems = normalizeServerPortfolioItems(
      (hit as { portfolioItems?: unknown }).portfolioItems
    );
    serverUrls = Array.isArray(hit.portfolioImages) ? [...hit.portfolioImages] : [];
    if (!serverUrls.length && serverItems.length) {
      serverUrls = serverItems.map((x) => x.url);
    }
  } catch {
    if (!missingBindingWarned.value) {
      message.warning('无法从服务器拉取作品（请确认已登录摄影师账号）');
      missingBindingWarned.value = true;
    }
    return;
  }

  // 关键兜底：若服务器暂未同步到作品，但本地已有作品，则不要用空数组覆盖本地
  if (!serverUrls.length && items.value.length) {
    return;
  }

  const out: Item[] = [];
  const seen = new Set<string>();
  for (const u of serverUrls) {
    const url = String(u || '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const local = localByUrl.get(url);
    const fromServer = serverItems.find((x) => x.url === url);
    const meta = metaByHash.get(hashUrl(url));

    // 合并优先级：
    // 1) 分类优先 local，其次 server/meta，最后默认 wedding
    // 2) 描述优先“非空”local，其次“非空”server，再次“非空”meta
    if (local || fromServer || meta) {
      const localDesc = String(local?.desc || '').trim();
      const serverDesc = String(fromServer?.desc || '').trim();
      const metaDesc = String(meta?.desc || '').trim();
      const mergedDesc = localDesc || serverDesc || metaDesc || '';

      const mergedCategory: Cat =
        local?.category || fromServer?.category || meta?.category || 'wedding';

      out.push({
        url,
        category: mergedCategory,
        desc: mergedDesc,
      });
      continue;
    }
    out.push(defaultItem(url));
  }
  items.value = out;
  // 首次进入页面时仅静默缓存，避免未主动操作就提示“本地空间不足”
  saveLocalOnly(false);
};

const save = () => {
  saveLocalOnly();
  void syncPortfolioToBackend();
};

const filtered = computed(() => {
  if (cat.value === 'all') return items.value;
  return items.value.filter((x) => x.category === cat.value);
});

const categoryLabel = (c: Cat) => {
  if (c === 'wedding') return '婚纱摄影';
  if (c === 'makeup') return '妆造案例';
  return '造型作品';
};

const upload: UploadProps['customRequest'] = async (options) => {
  // 先上传到后端拿到 dataURL（统一 5MB 限制与鉴权），再加入待上传列表
  const raw = options.file as File;
  uploading.value = true;
  try {
    const { url } = await photographersApi.uploadImage(raw);
    if (!url) throw new Error('上传失败：未返回图片地址');
    pendingUploads.value = dedupeUrls([url, ...pendingUploads.value]);
    message.success('已上传并加入待上传列表');
    options.onSuccess?.(url);
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: string }).message)
        : '上传失败';
    message.error(msg);
    options.onError?.(e as Error);
  } finally {
    uploading.value = false;
  }
};

const dedupeUrls = (arr: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of arr) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
};

const dedupe = (arr: Item[]) => {
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const it of arr) {
    if (!it?.url || seen.has(it.url)) continue;
    seen.add(it.url);
    out.push(it);
  }
  return out;
};

const remove = (url: string) => {
  items.value = items.value.filter((x) => x.url !== url);
  save();
  message.success('已删除');
};

const deleteConfirmOpen = ref(false);
const pendingDeleteUrl = ref('');

const openDeleteConfirm = (url: string) => {
  pendingDeleteUrl.value = url;
  deleteConfirmOpen.value = true;
};

const cancelDelete = () => {
  deleteConfirmOpen.value = false;
  pendingDeleteUrl.value = '';
};

const confirmDelete = () => {
  if (!pendingDeleteUrl.value) {
    deleteConfirmOpen.value = false;
    return;
  }
  remove(pendingDeleteUrl.value);
  deleteConfirmOpen.value = false;
  pendingDeleteUrl.value = '';
};

// 编辑
const editOpen = ref(false);
const editUrl = ref('');
const editDesc = ref('');
const editCat = ref<Cat>('wedding');

const edit = (it: Item) => {
  editUrl.value = it.url;
  editDesc.value = it.desc || '';
  editCat.value = it.category;
  editOpen.value = true;
};

const saveEdit = () => {
  const idx = items.value.findIndex((x) => x.url === editUrl.value);
  if (idx >= 0) {
    items.value[idx] = {
      ...items.value[idx],
      desc: editDesc.value.trim(),
      category: editCat.value,
    };
    save();
    message.success('已保存');
  }
  editOpen.value = false;
};

const applyDraft = async () => {
  try {
    if (!pendingUploads.value.length) {
      message.warning('请先上传作品');
      return;
    }
    if (!draftCat.value) {
      message.warning('请选择分类');
      return;
    }
    const desc = draftDesc.value.trim();
    const usedCat = draftCat.value as Cat;
    const batch: Item[] = pendingUploads.value.map((url) => ({
      url,
      category: usedCat,
      desc,
    }));
    items.value = dedupe([...batch, ...items.value]);
    // 本地保存可能因 dataURL 过大失败，但不应影响“同步到服务器”
    saveLocalOnly();
    const ok = await syncPortfolioToBackend();
    if (ok) {
      // 以服务器为准刷新一次，避免切页回来被空数据覆盖
      await pullPortfolioFromBackend();
    }
    pendingUploads.value = [];
    draftDesc.value = '';
    draftCat.value = usedCat;
    message.success(
      ok ? `已上传并同步 ${batch.length} 张作品` : `已上传 ${batch.length} 张作品（请稍后重试同步）`
    );
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: string }).message)
        : '上传失败';
    message.error(msg);
  }
};

onMounted(async () => {
  authStore.initializeAuth();
  load();
  await pullPortfolioFromBackend();
});
</script>

<style scoped lang="less">
.page {
  --pink: #ff6b8b;
  --r: 12px;
  padding-top: 12px;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.title {
  font-weight: 900;
  color: #111827;
  font-size: 18px;
  margin-bottom: 4px;
}
.sub {
  color: #6b7280;
  font-size: 13px;
}
.tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.pill-tag {
  border-radius: 999px;
  padding: 7px 16px;
  border: 1px solid rgba(255, 107, 139, 0.14);
  background: rgba(255, 107, 139, 0.05);
  color: #e35d86;
  font-weight: 700;
  font-size: 15px;
}
.pill-tag:hover {
  color: #be185d;
  border-color: rgba(244, 63, 94, 0.38);
  background: rgba(244, 63, 94, 0.14);
}
.pill-tag.ant-tag-checkable-checked {
  color: #be185d;
  border-color: rgba(244, 63, 94, 0.38);
  background: rgba(244, 63, 94, 0.14);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 16px;
  align-items: start;
  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
}

.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.item {
  position: relative;
  border-radius: var(--r);
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.08);
  background: #fff;
  box-shadow: 0 10px 26px rgba(17, 24, 39, 0.05);
}
.img :deep(img) {
  width: 100%;
  height: 170px;
  object-fit: cover;
  transition: transform 0.25s ease;
}
.item:hover .img :deep(img) {
  transform: scale(1.06);
}
.mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 10px;
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.35) 0%, rgba(17, 24, 39, 0) 55%);
  opacity: 0;
  transition: opacity 0.2s ease;
}
.item:hover .mask {
  opacity: 1;
}
.meta {
  padding: 8px 12px 2px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0;
  align-items: flex-start;
}
.c {
  font-size: 12px;
  font-weight: 900;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(255, 107, 139, 0.08);
  border: 1px solid rgba(255, 107, 139, 0.18);
  color: #d6336c;
}
.d {
  color: #6b7280;
  font-size: 13px;
  text-align: left;
  white-space: normal;
  word-break: break-all;
  flex: 1;
  line-height: 1.4;
  margin-top: 12px;
  margin-bottom: 0;
}

.panel {
  background: #fff;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: var(--r);
  padding: 14px;
  box-shadow: 0 10px 26px rgba(17, 24, 39, 0.05);
  margin-bottom: 14px;
}
.panel-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.panel-title {
  font-weight: 900;
  color: #111827;
}
.pending-wrap {
  margin-top: 10px;
}
.pending-title {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}
.pending-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.pending-img :deep(img) {
  width: 100%;
  height: 68px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(17, 24, 39, 0.08);
}

.pill {
  border-radius: 999px;
  background: var(--pink);
  border-color: var(--pink);
}
:deep(.ant-btn-primary.pill:hover),
:deep(.ant-btn-primary.pill:focus) {
  background: #ef3b5d;
  border-color: #ef3b5d;
}
.pill.ghost {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.7);
  color: #fff;
}

.stat {
  display: grid;
  gap: 10px;
}
.s {
  border-radius: var(--r);
  border: 1px solid rgba(255, 107, 139, 0.18);
  background: rgba(255, 107, 139, 0.06);
  padding: 12px;
}
.n {
  font-size: 22px;
  font-weight: 900;
  color: #d6336c;
}
.n.soft {
  color: #374151;
}
.t {
  margin-top: 2px;
  font-size: 12px;
  color: #6b7280;
}
</style>

<style lang="less">
.ant-btn.portfolio-ok-btn {
  background: #ff6b8b !important;
  border-color: #ff6b8b !important;
  color: #fff !important;
  box-shadow: none !important;
}

.ant-btn.portfolio-ok-btn:hover,
.ant-btn.portfolio-ok-btn:focus,
.ant-btn.portfolio-ok-btn:active {
  background: #ef476f !important;
  border-color: #ef476f !important;
  color: #fff !important;
  box-shadow: none !important;
}

.ant-btn.portfolio-cancel-btn:hover,
.ant-btn.portfolio-cancel-btn:focus,
.ant-btn.portfolio-cancel-btn:active {
  color: #d6336c !important;
  border-color: #ff9fbc !important;
  background: #fff5f8 !important;
  box-shadow: none !important;
}
</style>
