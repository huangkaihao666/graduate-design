<template>
  <div class="styles-container">
    <div class="header">
      <h1>风格标签管理</h1>
      <a-space>
        <a-input v-model:value="newStyle" placeholder="输入新风格标签" style="width: 220px" />
        <a-button type="primary" @click="addStyle">新增标签</a-button>
      </a-space>
    </div>

    <a-card :bordered="false">
      <div class="tag-list">
        <div v-for="item in styles" :key="item.id" class="tag-item">
          <a-tag :color="item.enabled ? 'purple' : 'default'">{{ item.name }}</a-tag>
          <a-space>
            <a @click="item.enabled = !item.enabled">{{ item.enabled ? '停用' : '启用' }}</a>
            <a @click="removeStyle(item.id)">删除</a>
          </a-space>
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';

type StyleTag = { id: number; name: string; enabled: boolean };
const newStyle = ref('');
const styles = ref<StyleTag[]>([
  { id: 1, name: '浪漫梦幻', enabled: true },
  { id: 2, name: '艺术文艺', enabled: true },
  { id: 3, name: '极简现代', enabled: true },
  { id: 4, name: '冒险活力', enabled: false },
]);

const addStyle = () => {
  const name = newStyle.value.trim();
  if (!name) {
    message.warning('请输入标签名称');
    return;
  }
  styles.value.unshift({ id: Date.now(), name, enabled: true });
  newStyle.value = '';
  message.success('风格标签已新增');
};

const removeStyle = (id: number) => {
  styles.value = styles.value.filter((x) => x.id !== id);
  message.success('风格标签已删除');
};
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
