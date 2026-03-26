<template>
  <div class="page">
    <div class="head">
      <div>
        <div class="title">作品管理</div>
        <div class="sub">3 列网格 + 分类标签（粉色胶囊）+ 右侧上传面板与统计。</div>
      </div>
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
                <a-button size="small" danger class="pill ghost" @click="remove(item.url)"
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
            <a-button type="primary" class="pill" block @click="applyDraft"
              >应用到最近上传</a-button
            >
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

    <a-modal v-model:open="editOpen" title="编辑作品" ok-text="保存" @ok="saveEdit">
      <a-form layout="vertical">
        <a-form-item label="描述">
          <a-textarea v-model:value="editDesc" :rows="3" />
        </a-form-item>
        <a-form-item label="分类">
          <a-segmented v-model:value="editCat" :options="catOptions" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import type { UploadProps } from 'ant-design-vue';
import { computed, onMounted, ref } from 'vue';

type Cat = 'wedding' | 'makeup' | 'styling';
type Item = { url: string; category: Cat; desc?: string };

const authStore = useAuthStore();
const storageKey = computed(() => `worker_portfolio_items_v1_${authStore.user?.id ?? 'guest'}`);
const urlsKey = computed(() => `worker_portfolio_urls_${authStore.user?.id ?? 'guest'}`);

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

const draftDesc = ref('');
const draftCat = ref<Cat>('wedding');
const lastUploadedUrls = ref<string[]>([]);

const likes = computed(() => Math.max(0, items.value.length * 13));
const reviews = computed(() => Math.max(0, Math.floor(items.value.length * 1.6)));

const load = () => {
  const raw = localStorage.getItem(storageKey.value);
  const list = raw ? (JSON.parse(raw) as Item[]) : [];
  items.value = Array.isArray(list) ? list : [];
  // 兼容 Dashboard 读取
  localStorage.setItem(urlsKey.value, JSON.stringify(items.value.map((x) => x.url)));
};

const save = () => {
  localStorage.setItem(storageKey.value, JSON.stringify(items.value));
  localStorage.setItem(urlsKey.value, JSON.stringify(items.value.map((x) => x.url)));
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
  // 这里先做“本地演示”：使用 FileReader 转 dataURL 保存到本地
  const raw = options.file as File;
  const reader = new FileReader();
  reader.onload = () => {
    const url = String(reader.result || '');
    if (!url) return;
    items.value.unshift({ url, category: draftCat.value, desc: draftDesc.value.trim() || '' });
    items.value = dedupe(items.value);
    save();
    lastUploadedUrls.value = [url, ...lastUploadedUrls.value].slice(0, 6);
    message.success('已上传（本地演示保存）');
    options.onSuccess?.(url);
  };
  reader.onerror = () => options.onError?.(new Error('读取文件失败'));
  reader.readAsDataURL(raw);
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

const applyDraft = () => {
  if (!lastUploadedUrls.value.length) {
    message.warning('请先上传作品');
    return;
  }
  const set = new Set(lastUploadedUrls.value);
  items.value = items.value.map((x) =>
    set.has(x.url) ? { ...x, desc: draftDesc.value.trim(), category: draftCat.value } : x
  );
  save();
  message.success('已应用到最近上传');
};

onMounted(() => {
  authStore.initializeAuth();
  load();
});
</script>

<style scoped lang="less">
.page {
  --pink: #ff6b8b;
  --r: 12px;
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
  padding: 4px 12px;
  border: 1px solid rgba(255, 107, 139, 0.18);
  background: rgba(255, 107, 139, 0.08);
  color: #d6336c;
  font-weight: 800;
}
.pill-tag:deep(.ant-tag-checkable-checked) {
  background: var(--pink);
  border-color: var(--pink);
  color: #fff;
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
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
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
  font-size: 12px;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
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

.pill {
  border-radius: 999px;
  background: var(--pink);
  border-color: var(--pink);
}
.pill.ghost {
  background: rgba(255, 107, 139, 0.1);
  border-color: rgba(255, 107, 139, 0.18);
  color: #d6336c;
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
