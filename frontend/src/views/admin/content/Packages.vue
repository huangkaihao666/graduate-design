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

    <p class="hint">目的地与「景点管理」中的景点强一致：套餐保存的城市 = 所选景点的「城市」。</p>

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
          <template v-if="column.key === 'price'">¥{{ record.price.toLocaleString() }}</template>
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
        <a-form-item label="套餐名称"><a-input v-model:value="form.name" /></a-form-item>
        <a-form-item label="目的地（选择景点）" required>
          <a-select
            v-model:value="form.spotId"
            placeholder="请选择景点，目的地自动为该景点所属城市"
            style="width: 100%"
            :options="spotOptions"
            show-search
            :filter-option="filterSpotOption"
          />
        </a-form-item>
        <a-form-item label="风格">
          <a-select
            v-model:value="form.style"
            placeholder="选择风格 key"
            style="width: 100%"
            :options="styleOptions"
          />
        </a-form-item>
        <a-form-item label="价格"
          ><a-input-number v-model:value="form.price" :min="0" style="width: 100%"
        /></a-form-item>
        <a-form-item label="行程天数">
          <a-input-number v-model:value="form.duration" :min="1" style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { packagesApi, type Package } from '@/api/packages';
import { spotsApi, type Spot } from '@/api/spots';
import { styleTagsApi } from '@/api/styleTags';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref } from 'vue';

type AdminRow = {
  id: number;
  spotId: number | null;
  name: string;
  location: string;
  spotName?: string;
  style: string;
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
      p.location,
      p.spotName ?? '',
      p.style,
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
  styleTags.value.map((t) => ({ label: `${t.name}（${t.key}）`, value: t.key }))
);

const spotOptions = computed(() =>
  spots.value.map((s) => ({
    label: `${s.city} · ${s.name}`,
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
  name: '',
  spotId: undefined as number | undefined,
  style: '',
  price: 0,
  duration: 1,
});

const toAdminRow = (p: Package): AdminRow => ({
  id: p.id,
  spotId: p.spotId,
  name: p.name,
  location: p.location,
  spotName: p.spotName,
  style: p.style,
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
    packageList.value = list.map(toAdminRow);
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  editingId.value = null;
  form.name = '';
  form.spotId = spots.value[0]?.id;
  form.style = styleTags.value[0]?.key ?? '';
  form.price = 0;
  form.duration = 1;
  modalOpen.value = true;
};

const openEdit = (record: AdminRow) => {
  editingId.value = record.id;
  form.name = record.name;
  form.spotId = record.spotId;
  form.style = record.style;
  form.price = record.price;
  form.duration = record.duration;
  modalOpen.value = true;
};

const savePackage = async () => {
  if (!form.name || form.spotId === undefined || form.spotId === null || !form.style) {
    message.warning('请填写完整信息（含目的地景点）');
    return;
  }
  saving.value = true;
  try {
    if (editingId.value) {
      await packagesApi.updatePackage(editingId.value, {
        spotId: form.spotId,
        name: form.name,
        style: form.style,
        price: Number(form.price || 0),
        duration: Number(form.duration || 1),
      });
      message.success('套餐已更新');
    } else {
      await packagesApi.createPackage({
        spotId: form.spotId,
        name: form.name,
        style: form.style,
        price: Number(form.price || 0),
        duration: Number(form.duration || 1),
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
</style>
