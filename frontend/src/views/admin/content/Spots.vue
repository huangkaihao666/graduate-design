<template>
  <div class="spots-container">
    <div class="header">
      <h1>景点管理</h1>
      <a-button type="primary" @click="addSpot">新增景点</a-button>
    </div>

    <a-card :bordered="false">
      <a-table :columns="columns" :data-source="spots" :pagination="{ pageSize: 8 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <a-space>
              <a @click="record.recommended = !record.recommended">
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';

type Spot = {
  id: number;
  name: string;
  city: string;
  category: string;
  recommended: boolean;
};

const columns = [
  { title: '景点名称', dataIndex: 'name', key: 'name' },
  { title: '所属城市', dataIndex: 'city', key: 'city' },
  { title: '分类', dataIndex: 'category', key: 'category' },
  { title: '推荐状态', dataIndex: 'recommended', key: 'recommended' },
  { title: '操作', key: 'actions' },
];

const spots = ref<Spot[]>([
  { id: 1, name: '天涯海角', city: '三亚', category: '海岛', recommended: true },
  { id: 2, name: '大研古城', city: '丽江', category: '古城', recommended: true },
  { id: 3, name: '外滩', city: '上海', category: '城市地标', recommended: false },
]);

const addSpot = () => {
  spots.value.unshift({
    id: Date.now(),
    name: `新景点${spots.value.length + 1}`,
    city: '待完善',
    category: '待分类',
    recommended: false,
  });
  message.success('已新增景点（请继续编辑）');
};

const removeSpot = (id: number) => {
  spots.value = spots.value.filter((x) => x.id !== id);
  message.success('已删除景点');
};
</script>

<style scoped lang="less">
.spots-container {
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
