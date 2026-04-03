<template>
  <div class="admin-users-container">
    <div class="header">
      <div class="header-left">
        <h1>用户管理</h1>
        <p class="sub">
          仅包含普通注册用户与管理员。摄影师、妆造师等工作人员请在「摄影师管理」「妆造师管理」中维护。
        </p>
      </div>
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
            <a-space wrap>
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
import { usersApi } from '@/api/users';
import { message } from 'ant-design-vue';
import { computed, onMounted, ref } from 'vue';

type UserStatus = '正常' | '禁用';
type UserRole = 'admin' | 'user' | 'worker';
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
  const list = users.value.filter((u) => u.role !== 'worker');
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return list;
  return list.filter(
    (u) => u.name.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw)
  );
});

const normalizeUsers = (raw: any): AdminUser[] => {
  const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
  return list.map((item: any) => {
    const r = String(item.role || 'user').toLowerCase();
    const role: UserRole = r === 'admin' ? 'admin' : r === 'worker' ? 'worker' : 'user';
    return {
      id: Number(item.id),
      name: item.name || `用户${item.id}`,
      email: item.email || '-',
      role,
      status: item.isActive === false ? '禁用' : '正常',
      createdAt: item.createdAt ? String(item.createdAt).slice(0, 10) : '-',
    };
  });
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
  padding: 32px 24px 24px;
  background: #f6f8fb;
  min-height: calc(100vh - 64px);
}

.header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;

  h1 {
    margin: 0;
  }
}

.header-left {
  min-width: 200px;
}

.sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.45;
  max-width: 520px;
}
</style>
