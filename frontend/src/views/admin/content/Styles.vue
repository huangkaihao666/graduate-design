<template>
  <div class="styles-container">
    <div class="header">
      <h1>风格标签管理</h1>
      <a-space wrap>
        <a-button :loading="syncing" @click="syncAndLoad">同步标准六种名称</a-button>
        <a-button type="primary" @click="openCreate">新增风格</a-button>
      </a-space>
    </div>

    <p class="hint">
      启用的标签会出现在用户端旅拍筛选与
      <strong>虚拍试衣</strong>
      的风格列表中。预设六种可改名称、描述与实例图，但不可删、不可改
      key；新增自定义风格需填写描述（用于虚拍文案与 AI 生图提示），建议上传实例照片作为卡片预览。
    </p>

    <a-card title="系统预设六种" :bordered="false" class="section-card">
      <a-spin :spinning="loading">
        <div class="tag-list">
          <div v-for="item in canonicalList" :key="item.id" class="tag-item">
            <div class="tag-main">
              <div class="tag-row">
                <a-tag :color="item.enabled ? 'purple' : 'default'">{{ item.name }}</a-tag>
                <span class="tag-key">{{ item.key }}</span>
                <span v-if="displayIcon(item)" class="tag-ico">{{ displayIcon(item) }}</span>
              </div>
              <p v-if="item.description" class="tag-desc">{{ item.description }}</p>
              <div v-if="displayThumbs(item).length" class="thumb-row">
                <img v-for="(u, i) in displayThumbs(item)" :key="i" :src="u" alt="" class="thumb" />
              </div>
            </div>
            <div class="tag-actions-box">
              <a-space :size="8" wrap>
                <a-button size="small" @click="toggleEnabled(item)">
                  {{ item.enabled ? '停用' : '启用' }}
                </a-button>
                <a-button size="small" type="primary" ghost @click="openEdit(item)">编辑</a-button>
              </a-space>
            </div>
          </div>
        </div>
      </a-spin>
    </a-card>

    <a-card title="自定义风格" :bordered="false" class="section-card">
      <a-empty
        v-if="!loading && !customList.length"
        description="暂无自定义风格，可点击「新增风格」"
      />
      <div v-else class="tag-list">
        <div v-for="item in customList" :key="item.id" class="tag-item">
          <div class="tag-main">
            <div class="tag-row">
              <a-tag :color="item.enabled ? 'blue' : 'default'">{{ item.name }}</a-tag>
              <span class="tag-key">{{ item.key }}</span>
              <span v-if="displayIcon(item)" class="tag-ico">{{ displayIcon(item) }}</span>
            </div>
            <p v-if="item.description" class="tag-desc">{{ item.description }}</p>
            <div v-if="displayThumbs(item).length" class="thumb-row">
              <img v-for="(u, i) in displayThumbs(item)" :key="i" :src="u" alt="" class="thumb" />
            </div>
          </div>
          <div class="tag-actions-box">
            <a-space :size="8" wrap>
              <a-button size="small" @click="toggleEnabled(item)">
                {{ item.enabled ? '停用' : '启用' }}
              </a-button>
              <a-button size="small" type="primary" ghost @click="openEdit(item)">编辑</a-button>
              <a-button size="small" danger ghost @click="removeStyle(item)">删除</a-button>
            </a-space>
          </div>
        </div>
      </div>
    </a-card>

    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑风格标签' : '新增风格标签'"
      ok-text="保存"
      cancel-text="取消"
      width="min(96vw, 560px)"
      :confirm-loading="saving"
      @ok="submitModal"
    >
      <a-form layout="vertical">
        <a-form-item v-if="!editingId" label="风格 key" required>
          <a-input
            v-model:value="form.key"
            placeholder="英文，如 sunset_beach（字母开头，仅字母数字下划线）"
          />
        </a-form-item>
        <a-form-item v-else label="风格 key">
          <a-input :value="form.key" disabled />
        </a-form-item>
        <a-form-item label="风格名称" required>
          <a-input v-model:value="form.name" placeholder="用户端显示的名称" />
        </a-form-item>
        <a-form-item label="图标（可选）">
          <a-input
            v-model:value="form.icon"
            placeholder="如 emoji：✨ 🌅；预设六种未填写时使用系统默认"
            :maxlength="20"
          />
        </a-form-item>
        <a-form-item label="描述" required>
          <a-textarea
            v-model:value="form.description"
            :rows="5"
            placeholder="用于虚拍页说明与 AI 生图；建议写清场景、光线、服装氛围等"
          />
        </a-form-item>
        <a-form-item label="实例照片（虚拍卡片预览，可多张）">
          <a-upload
            list-type="picture-card"
            :file-list="galleryFileList"
            :before-upload="beforeGallery"
            @remove="removeGallery"
          >
            <div v-if="galleryFileList.length < 8">
              <PlusOutlined />
              <div class="ant-upload-text">上传</div>
            </div>
          </a-upload>
          <p class="upload-hint">支持本地图转 Base64；首张将作为虚拍风格卡片主图。</p>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { styleTagsApi, type StyleTag } from '@/api/styleTags';
import {
  CANONICAL_STYLE_DEFAULT_ICON,
  CANONICAL_STYLE_PREVIEW_BY_KEY,
} from '@/constants/style-tag-default-preview';
import { TRAVEL_STYLE_LABELS } from '@/constants/travel-style-labels';
import { getApiErrorMessage } from '@/utils/apiError';
import { PlusOutlined } from '@ant-design/icons-vue';
import { message, Modal } from 'ant-design-vue';
import type { UploadFile } from 'ant-design-vue';
import { computed, onMounted, reactive, ref } from 'vue';

const CANONICAL_KEYS = Object.keys(TRAVEL_STYLE_LABELS);

const styles = ref<StyleTag[]>([]);
const loading = ref(false);
const syncing = ref(false);
const modalOpen = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);

const form = reactive({
  key: '',
  name: '',
  icon: '',
  description: '',
});
const galleryUrls = ref<string[]>([]);
const galleryFileList = ref<UploadFile[]>([]);

const sortedStyles = computed(() =>
  [...styles.value].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
);

const canonicalList = computed(() =>
  CANONICAL_KEYS.map((k) => sortedStyles.value.find((s) => s.key === k)).filter(
    (x): x is StyleTag => !!x
  )
);

const customList = computed(() =>
  sortedStyles.value.filter((s) => !CANONICAL_KEYS.includes(s.key))
);

const parseImages = (v: unknown): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  return [];
};

/** 列表展示：库中无图时，预设六种用与虚拍页一致的默认示例图 */
const displayThumbs = (item: StyleTag): string[] => {
  const fromDb = parseImages(item.sampleImages);
  if (fromDb.length) return fromDb.slice(0, 3);
  const d = CANONICAL_STYLE_PREVIEW_BY_KEY[item.key];
  return d ? [d] : [];
};

/** 列表展示：库中无图标时，预设六种用默认 emoji */
const displayIcon = (item: StyleTag): string => {
  const v = item.icon?.trim();
  if (v) return v;
  return CANONICAL_STYLE_DEFAULT_ICON[item.key] || '';
};

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });

const beforeGallery = async (file: File) => {
  try {
    const url = await readAsDataUrl(file);
    galleryUrls.value = [...galleryUrls.value, url];
    galleryFileList.value = [
      ...galleryFileList.value,
      {
        uid: `g-${Date.now()}-${Math.random().toString(16).slice(2)}`,
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

const removeGallery = (file: UploadFile) => {
  const url = String((file as { url?: string })?.url || '');
  if (url) galleryUrls.value = galleryUrls.value.filter((x) => x !== url);
  galleryFileList.value = galleryFileList.value.filter((x) => x.uid !== file.uid);
  return true;
};

const applyList = (list: StyleTag[]) => {
  styles.value = list;
};

const load = async () => {
  loading.value = true;
  try {
    applyList(await styleTagsApi.listAdmin());
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e) || '加载失败');
  } finally {
    loading.value = false;
  }
};

const syncAndLoad = async () => {
  syncing.value = true;
  try {
    applyList(await styleTagsApi.syncCanonical());
    message.success('已同步标准六种风格');
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e) || '同步失败');
  } finally {
    syncing.value = false;
  }
};

const toggleEnabled = async (item: StyleTag) => {
  try {
    await styleTagsApi.update(item.id, { enabled: !item.enabled });
    item.enabled = !item.enabled;
    message.success('已更新');
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e) || '操作失败');
  }
};

const resetForm = () => {
  form.key = '';
  form.name = '';
  form.icon = '';
  form.description = '';
  galleryUrls.value = [];
  galleryFileList.value = [];
};

const openCreate = () => {
  editingId.value = null;
  resetForm();
  modalOpen.value = true;
};

const openEdit = (item: StyleTag) => {
  editingId.value = item.id;
  form.key = item.key;
  form.name = item.name;
  form.icon = item.icon?.trim() || CANONICAL_STYLE_DEFAULT_ICON[item.key] || '';
  form.description = item.description || '';
  const fromDb = parseImages(item.sampleImages);
  const fallback = CANONICAL_STYLE_PREVIEW_BY_KEY[item.key];
  const merged = fromDb.length ? fromDb : fallback ? [fallback] : [];
  galleryUrls.value = [...merged];
  galleryFileList.value = merged.map((url, i) => ({
    uid: `e-${item.id}-${i}`,
    name: `示例${i + 1}`,
    status: 'done',
    url,
  })) as UploadFile[];
  modalOpen.value = true;
};

const submitModal = async () => {
  const name = form.name.trim();
  const desc = form.description.trim();
  if (!name || !desc) {
    message.warning('请填写风格名称与描述');
    return;
  }
  if (!editingId.value) {
    const key = form.key.trim();
    if (!key) {
      message.warning('请填写风格 key');
      return;
    }
  }
  saving.value = true;
  try {
    const payload = {
      name,
      description: desc,
      icon: form.icon.trim() || null,
      images: galleryUrls.value.length ? [...galleryUrls.value] : null,
    };
    if (editingId.value) {
      await styleTagsApi.update(editingId.value, payload);
      message.success('已保存');
    } else {
      await styleTagsApi.create({
        key: form.key.trim(),
        ...payload,
      });
      message.success('已新增风格');
    }
    modalOpen.value = false;
    await load();
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e) || '保存失败');
  } finally {
    saving.value = false;
  }
};

const removeStyle = (item: StyleTag) => {
  Modal.confirm({
    title: `删除风格「${item.name}」？`,
    content: '删除后不可恢复；若套餐或历史引用了该 key，请自行评估影响。',
    okText: '删除',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      try {
        await styleTagsApi.remove(item.id);
        message.success('已删除');
        await load();
      } catch (e: unknown) {
        message.error(getApiErrorMessage(e) || '删除失败');
      }
    },
  });
};

onMounted(() => {
  load();
});
</script>

<style scoped lang="less">
.styles-container {
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
  margin: 0 0 16px;
  font-size: 13px;
  color: #666;
  line-height: 1.55;
  max-width: 960px;
}

.section-card {
  margin-bottom: 16px;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .tag-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    background: #fff;
  }
}

.tag-actions-box {
  flex-shrink: 0;
  align-self: flex-start;
  padding: 6px 8px;
  border: 1px solid #e0e6ef;
  border-radius: 8px;
  background: #fafbfd;

  :deep(.ant-btn) {
    min-width: 64px;
  }
}

.tag-main {
  flex: 1;
  min-width: 0;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.tag-key {
  font-size: 12px;
  color: #888;
}

.tag-ico {
  font-size: 18px;
}

.tag-desc {
  margin: 8px 0 0;
  font-size: 13px;
  color: #555;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.thumb-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #eee;
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
</style>
