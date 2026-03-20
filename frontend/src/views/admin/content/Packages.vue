<template>
  <div class="admin-packages-container">
    <div class="header">
      <h1>套餐管理</h1>
      <a-button type="primary" @click="openCreate">新增套餐</a-button>
    </div>

    <a-card :bordered="false">
      <a-table :columns="columns" :data-source="packages" :pagination="{ pageSize: 8 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'price'">¥{{ record.price.toLocaleString() }}</template>
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
      @ok="savePackage"
    >
      <a-form layout="vertical">
        <a-form-item label="套餐名称"><a-input v-model:value="form.name" /></a-form-item>
        <a-form-item label="目的地"><a-input v-model:value="form.location" /></a-form-item>
        <a-form-item label="风格"><a-input v-model:value="form.style" /></a-form-item>
        <a-form-item label="价格"
          ><a-input-number v-model:value="form.price" :min="0" style="width: 100%"
        /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { message } from 'ant-design-vue';

type AdminPackage = {
  id: number;
  name: string;
  location: string;
  style: string;
  price: number;
  status: '已上架' | '已下架';
};

const columns = [
  { title: '套餐名称', dataIndex: 'name', key: 'name' },
  { title: '目的地', dataIndex: 'location', key: 'location' },
  { title: '风格', dataIndex: 'style', key: 'style' },
  { title: '价格', dataIndex: 'price', key: 'price' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '操作', key: 'actions' },
];

const packages = ref<AdminPackage[]>([
  {
    id: 1,
    name: '三亚3日浪漫旅拍',
    location: '三亚',
    style: '浪漫梦幻',
    price: 5999,
    status: '已上架',
  },
  {
    id: 2,
    name: '丽江2日古城旅拍',
    location: '丽江',
    style: '艺术文艺',
    price: 4999,
    status: '已上架',
  },
  {
    id: 3,
    name: '东京3日城市旅拍',
    location: '东京',
    style: '极简现代',
    price: 8999,
    status: '已下架',
  },
]);

const modalOpen = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({ name: '', location: '', style: '', price: 0 });

const openCreate = () => {
  editingId.value = null;
  form.name = '';
  form.location = '';
  form.style = '';
  form.price = 0;
  modalOpen.value = true;
};

const openEdit = (record: AdminPackage) => {
  editingId.value = record.id;
  form.name = record.name;
  form.location = record.location;
  form.style = record.style;
  form.price = record.price;
  modalOpen.value = true;
};

const savePackage = () => {
  if (!form.name || !form.location || !form.style) {
    message.warning('请填写完整信息');
    return;
  }
  if (editingId.value) {
    const idx = packages.value.findIndex((x) => x.id === editingId.value);
    if (idx >= 0) {
      packages.value[idx] = { ...packages.value[idx], ...form };
    }
    message.success('套餐已更新');
  } else {
    packages.value.unshift({
      id: Date.now(),
      name: form.name,
      location: form.location,
      style: form.style,
      price: Number(form.price || 0),
      status: '已上架',
    });
    message.success('套餐已新增');
  }
  modalOpen.value = false;
};

const toggleStatus = (record: AdminPackage) => {
  record.status = record.status === '已上架' ? '已下架' : '已上架';
  message.success(`已${record.status === '已上架' ? '上架' : '下架'}套餐`);
};
</script>

<style scoped lang="less">
.admin-packages-container {
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
</style>
