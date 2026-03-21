<template>
  <div class="spots-container">
    <div class="header">
      <h1>景点管理</h1>
      <a-space wrap>
        <a-input-search
          v-model:value="searchKeyword"
          placeholder="搜索城市、景点名称、分类"
          allow-clear
          style="width: min(100vw - 48px, 320px)"
        />
        <a-button type="primary" @click="openCreate">新增景点</a-button>
      </a-space>
    </div>

    <p v-if="searchKeyword.trim()" class="filter-tip">
      已筛选 {{ filteredSpots.length }} / {{ spotList.length }} 条
    </p>

    <a-card :bordered="false">
      <a-table
        :columns="columns"
        :data-source="filteredSpots"
        :pagination="{
          pageSize: 8,
          showTotal: (total: number) => `共 ${total} 条`,
        }"
        :loading="loading"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <a-space>
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
    </a-card>

    <a-modal
      v-model:open="modalOpen"
      title="新增景点"
      ok-text="保存"
      ok-type="primary"
      :confirm-loading="saving"
      @ok="submitCreate"
    >
      <a-form layout="vertical">
        <a-form-item label="景点名称" required>
          <a-input v-model:value="form.name" placeholder="例如：天涯海角" />
        </a-form-item>
        <a-form-item label="所属城市" required>
          <a-input v-model:value="form.city" placeholder="例如：三亚" />
        </a-form-item>
        <a-form-item label="分类" required>
          <a-input v-model:value="form.category" placeholder="例如：海岛" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { spotsApi, type Spot } from '@/api/spots';
import { getApiErrorMessage } from '@/utils/apiError';
import { message, Modal } from 'ant-design-vue';
import { computed, onMounted, reactive, ref } from 'vue';

const columns = [
  { title: '景点名称', dataIndex: 'name', key: 'name' },
  { title: '所属城市', dataIndex: 'city', key: 'city' },
  { title: '分类', dataIndex: 'category', key: 'category' },
  { title: '推荐状态', dataIndex: 'recommended', key: 'recommended' },
  { title: '操作', key: 'actions' },
];

const spotList = ref<Spot[]>([]);
const searchKeyword = ref('');
const loading = ref(false);
const saving = ref(false);
const modalOpen = ref(false);
const form = reactive({ name: '', city: '', category: '' });

const filteredSpots = computed(() => {
  const q = searchKeyword.value.trim().toLowerCase();
  if (!q) return spotList.value;
  return spotList.value.filter((s) => {
    const blob = [s.name, s.city, s.category].join(' ').toLowerCase();
    return blob.includes(q);
  });
});

const load = async () => {
  loading.value = true;
  try {
    spotList.value = await spotsApi.list();
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  form.name = '';
  form.city = '';
  form.category = '';
  modalOpen.value = true;
};

const submitCreate = async () => {
  if (!form.name.trim() || !form.city.trim() || !form.category.trim()) {
    message.warning('请填写完整信息');
    return;
  }
  saving.value = true;
  try {
    await spotsApi.create({
      name: form.name.trim(),
      city: form.city.trim(),
      category: form.category.trim(),
    });
    message.success('已新增景点');
    modalOpen.value = false;
    await load();
  } catch (e: any) {
    message.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const toggleRecommended = async (record: Spot) => {
  try {
    await spotsApi.update(record.id, { recommended: !record.recommended });
    record.recommended = !record.recommended;
    message.success('已更新');
  } catch (e: any) {
    message.error(e?.message || '操作失败');
  }
};

const removeSpot = (id: number) => {
  Modal.confirm({
    title: '确认删除该景点？',
    content:
      '删除后不可恢复。若仍有「已上架」套餐引用该目的地，将无法删除，请先在套餐管理中下架相关套餐；仅下架状态的套餐不会阻止删除。',
    okText: '删除',
    okType: 'danger',
    async onOk() {
      try {
        await spotsApi.remove(id);
        message.success('已删除景点');
        await load();
      } catch (e: unknown) {
        // 400 时 axios 拦截器已弹出后端文案（如「该景点已被 n 个套餐…」），避免重复
        const body = e as { statusCode?: number };
        if (body?.statusCode !== 400) {
          message.error(getApiErrorMessage(e) || '删除失败');
        }
      }
    },
  });
};

onMounted(() => {
  load();
});
</script>

<style scoped lang="less">
.spots-container {
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

.filter-tip {
  margin: 0 0 10px;
  font-size: 13px;
  color: #666;
}
</style>
