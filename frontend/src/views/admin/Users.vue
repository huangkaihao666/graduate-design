<template>
  <div class="admin-users-container">
    <div class="header">
      <h1>用户管理</h1>
      <a-input-search
        v-model:value="keyword"
        placeholder="搜索用户名或邮箱"
        style="width: 260px"
        allow-clear
      />
    </div>

    <a-card :bordered="false">
      <a-table
        :columns="columns"
        :data-source="filteredUsers"
        :pagination="{ pageSize: 8 }"
        :loading="loading"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === '正常' ? 'green' : 'red'">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'role'">
            <a-tag :color="record.role === 'admin' ? 'purple' : 'blue'">
              {{ record.role === 'admin' ? '管理员' : '用户' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a @click="toggleStatus(record.id)">
                {{ record.status === '正常' ? '禁用' : '启用' }}
              </a>
              <a @click="resetPassword(record.name, record.id)">重置密码</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import { usersApi } from '@/api/users';

type UserStatus = '正常' | '禁用';
type UserRole = 'admin' | 'user';
type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
};

const keyword = ref('');
const loading = ref(false);
const users = ref<AdminUser[]>([]);

const columns = [
  { title: '用户名', dataIndex: 'name', key: 'name' },
  { title: '邮箱/账号', dataIndex: 'email', key: 'email' },
  { title: '角色', dataIndex: 'role', key: 'role', width: 110 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
  { title: '注册时间', dataIndex: 'createdAt', key: 'createdAt', width: 140 },
  { title: '操作', key: 'actions', width: 180 },
];

const filteredUsers = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return users.value;
  return users.value.filter(
    (u) => u.name.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw)
  );
});

const normalizeUsers = (raw: any): AdminUser[] => {
  const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
  return list.map((item: any) => ({
    id: Number(item.id),
    name: item.name || `用户${item.id}`,
    email: item.email || '-',
    role: item.role === 'admin' ? 'admin' : 'user',
    status: item.isActive === false ? '禁用' : '正常',
    createdAt: item.createdAt ? String(item.createdAt).slice(0, 10) : '-',
  }));
};

const loadUsers = async () => {
  loading.value = true;
  try {
    const response: any = await usersApi.getUsers();
    users.value = normalizeUsers(response);
  } catch (error) {
    console.error('加载用户失败:', error);
    message.error('加载用户失败，请检查后端服务');
  } finally {
    loading.value = false;
  }
};

const toggleStatus = (id: number) => {
  const user = users.value.find((u) => u.id === id);
  if (!user) return;
  if (user.role === 'admin') {
    message.warning('管理员账号不可禁用');
    return;
  }
  const nextIsActive = user.status !== '正常';
  usersApi
    .updateUserStatus(id, nextIsActive)
    .then(() => {
      user.status = nextIsActive ? '正常' : '禁用';
      message.success(`用户已${nextIsActive ? '启用' : '禁用'}`);
    })
    .catch((error) => {
      console.error('更新用户状态失败:', error);
      message.error('更新用户状态失败');
    });
};

const resetPassword = (name: string, id: number) => {
  const newPassword = '123456';
  usersApi
    .resetPassword(id, newPassword)
    .then(() => {
      message.success(`已重置 ${name} 的密码为 ${newPassword}`);
    })
    .catch((error) => {
      console.error('重置密码失败:', error);
      message.error('重置密码失败');
    });
};

onMounted(() => {
  loadUsers();
});
</script>

<style scoped lang="less">
.admin-users-container {
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
