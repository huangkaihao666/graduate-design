<template>
  <div class="styles-container">
    <div class="header">
      <h1>风格标签管理</h1>
      <a-space>
        <a-input v-model:value="newName" placeholder="新标签名称（中文）" style="width: 220px" />
        <a-input
          v-model:value="newKey"
          placeholder="key（英文，如 romantic）"
          style="width: 200px"
        />
        <a-button type="primary" :loading="creating" @click="addStyle">新增标签</a-button>
      </a-space>
    </div>

    <a-card :bordered="false">
      <a-spin :spinning="loading">
        <div class="tag-list">
          <div v-for="item in styles" :key="item.id" class="tag-item">
            <a-tag :color="item.enabled ? 'purple' : 'default'"
              >{{ item.name }}（{{ item.key }}）</a-tag
            >
            <a-space>
              <a @click="toggleEnabled(item)">{{ item.enabled ? '停用' : '启用' }}</a>
              <a @click="removeStyle(item.id)">删除</a>
            </a-space>
          </div>
        </div>
      </a-spin>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { styleTagsApi, type StyleTag } from '@/api/styleTags';
import { message } from 'ant-design-vue';
import { onMounted, ref } from 'vue';

const newName = ref('');
const newKey = ref('');
const styles = ref<StyleTag[]>([]);
const loading = ref(false);
const creating = ref(false);

const load = async () => {
  loading.value = true;
  try {
    styles.value = await styleTagsApi.listAdmin();
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

const addStyle = async () => {
  const name = newName.value.trim();
  let key = newKey.value.trim();
  if (!name) {
    message.warning('请输入标签名称');
    return;
  }
  if (!key) {
    key = `tag_${Date.now()}`;
  }
  creating.value = true;
  try {
    await styleTagsApi.create({ key, name, enabled: true });
    newName.value = '';
    newKey.value = '';
    message.success('风格标签已新增');
    await load();
  } catch (e: any) {
    message.error(e?.message || '新增失败');
  } finally {
    creating.value = false;
  }
};

const toggleEnabled = async (item: StyleTag) => {
  try {
    await styleTagsApi.update(item.id, { enabled: !item.enabled });
    item.enabled = !item.enabled;
    message.success('已更新');
  } catch (e: any) {
    message.error(e?.message || '操作失败');
  }
};

const removeStyle = async (id: number) => {
  try {
    await styleTagsApi.remove(id);
    message.success('风格标签已删除');
    await load();
  } catch (e: any) {
    message.error(e?.message || '删除失败');
  }
};

onMounted(() => {
  load();
});
</script>

<style scoped lang="less">
.styles-container {
  padding: 20px 24px;
  background: #f6f8fb;
  min-height: calc(100vh - 64px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  h1 {
    margin: 0;
  }
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .tag-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    background: #fff;
  }
}
</style>
