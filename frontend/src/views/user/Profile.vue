<template>
  <div class="profile-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>👤 个人资料</h1>
      <p>管理您的个人信息和账户设置</p>
    </div>

    <div class="content-card">
      <a-tabs v-model:active-key="activeTab" @change="handleTabChange">
        <a-tab-pane key="info" tab="基本信息" />
        <a-tab-pane key="password" tab="修改密码" />
      </a-tabs>

      <!-- 基本信息 -->
      <div v-if="activeTab === 'info'" class="profile-content">
        <a-form
          :model="profileForm"
          :rules="profileRules"
          :label-col="{ span: 6 }"
          :wrapper-col="{ span: 16 }"
          ref="profileFormRef"
          @finish="handleUpdateProfile"
        >
          <a-form-item label="用户ID" name="id">
            <a-input v-model:value="profileForm.id" disabled />
          </a-form-item>

          <a-form-item label="姓名" name="name">
            <a-input
              v-model:value="profileForm.name"
              placeholder="请输入您的姓名"
              :maxlength="100"
            />
          </a-form-item>

          <a-form-item label="邮箱" name="email">
            <a-input v-model:value="profileForm.email" type="email" placeholder="请输入您的邮箱" />
          </a-form-item>

          <a-form-item label="账户状态" name="isActive">
            <a-tag :color="profileForm.isActive ? 'green' : 'red'">
              {{ profileForm.isActive ? '正常' : '已禁用' }}
            </a-tag>
          </a-form-item>

          <a-form-item label="注册时间" name="createdAt">
            <span class="readonly-text">
              {{ formatDate(profileForm.createdAt) }}
            </span>
          </a-form-item>

          <a-form-item label="最后更新" name="updatedAt">
            <span class="readonly-text">
              {{ formatDate(profileForm.updatedAt) }}
            </span>
          </a-form-item>

          <a-form-item :wrapper-col="{ offset: 6, span: 16 }">
            <a-space>
              <a-button type="primary" html-type="submit" :loading="updating"> 保存修改 </a-button>
              <a-button @click="handleResetProfile">重置</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <!-- 修改密码 -->
      <div v-if="activeTab === 'password'" class="profile-content">
        <a-form
          :model="passwordForm"
          :rules="passwordRules"
          :label-col="{ span: 6 }"
          :wrapper-col="{ span: 16 }"
          ref="passwordFormRef"
          @finish="handleUpdatePassword"
        >
          <a-form-item label="当前密码" name="currentPassword">
            <a-input-password
              v-model:value="passwordForm.currentPassword"
              placeholder="请输入当前密码"
            />
          </a-form-item>

          <a-form-item label="新密码" name="newPassword">
            <a-input-password
              v-model:value="passwordForm.newPassword"
              placeholder="请输入新密码（至少6位）"
            />
          </a-form-item>

          <a-form-item label="确认新密码" name="confirmPassword">
            <a-input-password
              v-model:value="passwordForm.confirmPassword"
              placeholder="请再次输入新密码"
            />
          </a-form-item>

          <a-form-item :wrapper-col="{ offset: 6, span: 16 }">
            <a-space>
              <a-button type="primary" html-type="submit" :loading="changingPassword">
                修改密码
              </a-button>
              <a-button @click="handleResetPassword">重置</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-state">
        <a-spin size="large" />
        <p>正在加载用户信息...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { usersApi, type UpdateUserRequest } from '@/api/users';
import type { FormInstance } from 'ant-design-vue';

const router = useRouter();
const authStore = useAuthStore();

// 状态管理
const loading = ref(false);
const updating = ref(false);
const changingPassword = ref(false);
const activeTab = ref('info');

// 表单引用
const profileFormRef = ref<FormInstance>();
const passwordFormRef = ref<FormInstance>();

// 基本信息表单
const profileForm = reactive({
  id: 0,
  name: '',
  email: '',
  isActive: true,
  createdAt: '',
  updatedAt: '',
});

// 密码表单
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

// 表单验证规则
const profileRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 1, max: 100, message: '姓名长度在1-100个字符之间', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
  ],
};

const passwordRules = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string) => {
        if (value && value !== passwordForm.newPassword) {
          return Promise.reject('两次输入的密码不一致');
        }
        return Promise.resolve();
      },
      trigger: 'blur',
    },
  ],
};

// 格式化日期
const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('zh-CN');
};

// 标签页切换
const handleTabChange = (key: string) => {
  activeTab.value = key;
};

// 加载用户信息
const loadUserProfile = async () => {
  if (!authStore.isAuthenticated || !authStore.user) {
    message.warning('请先登录');
    router.push('/login');
    return;
  }

  loading.value = true;
  try {
    // 优先使用 authStore 中的用户信息
    if (authStore.user) {
      Object.assign(profileForm, {
        id: authStore.user.id || 0,
        name: authStore.user.name || '',
        email: authStore.user.email || '',
        isActive: authStore.user.isActive !== undefined ? authStore.user.isActive : true,
        createdAt: authStore.user.createdAt || '',
        updatedAt: authStore.user.updatedAt || '',
      });
    }

    // 尝试从API获取最新信息
    if (authStore.user.id) {
      try {
        const response: any = await usersApi.getUser(authStore.user.id);
        const userData = response?.data?.data || response?.data || response;
        if (userData) {
          Object.assign(profileForm, {
            id: userData.id || profileForm.id,
            name: userData.name || profileForm.name,
            email: userData.email || profileForm.email,
            isActive: userData.isActive !== undefined ? userData.isActive : profileForm.isActive,
            createdAt: userData.createdAt || profileForm.createdAt,
            updatedAt: userData.updatedAt || profileForm.updatedAt,
          });
        }
      } catch (error) {
        // 如果API调用失败，使用authStore中的信息
        console.warn('获取用户详情失败，使用缓存信息:', error);
      }
    }
  } catch (error: any) {
    console.error('加载用户信息失败:', error);
    message.error(error?.message || '加载用户信息失败');
  } finally {
    loading.value = false;
  }
};

// 更新个人信息
const handleUpdateProfile = async () => {
  if (!authStore.isAuthenticated || !authStore.user?.id) {
    message.warning('请先登录');
    router.push('/login');
    return;
  }

  updating.value = true;
  try {
    const updateData: UpdateUserRequest = {
      name: profileForm.name,
      email: profileForm.email,
    };

    const response: any = await usersApi.updateUser(authStore.user.id, updateData);
    const updatedUser = response?.data?.data || response?.data || response;

    if (updatedUser) {
      // 更新 authStore 中的用户信息
      if (authStore.user) {
        authStore.user.name = updatedUser.name || profileForm.name;
        authStore.user.email = updatedUser.email || profileForm.email;
        // 更新本地存储
        localStorage.setItem('user', JSON.stringify(authStore.user));
      }

      // 刷新用户信息
      await authStore.getProfile();

      message.success('个人信息更新成功');
      // 重新加载用户信息
      await loadUserProfile();
    }
  } catch (error: any) {
    console.error('更新个人信息失败:', error);
    message.error(error?.response?.data?.message || error?.message || '更新失败，请稍后重试');
  } finally {
    updating.value = false;
  }
};

// 重置个人信息表单
const handleResetProfile = () => {
  loadUserProfile();
  profileFormRef.value?.resetFields();
};

// 修改密码
const handleUpdatePassword = async () => {
  if (!authStore.isAuthenticated || !authStore.user?.id) {
    message.warning('请先登录');
    router.push('/login');
    return;
  }

  changingPassword.value = true;
  try {
    const updateData: UpdateUserRequest = {
      password: passwordForm.newPassword,
    };

    // 注意：这里需要后端支持密码更新接口
    // 如果后端需要验证当前密码，可能需要单独的密码更新接口
    await usersApi.updateUser(authStore.user.id, updateData);

    message.success('密码修改成功，请重新登录');

    // 清空密码表单
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
    passwordFormRef.value?.resetFields();

    // 延迟跳转到登录页
    setTimeout(() => {
      authStore.logout();
      router.push('/login');
    }, 1500);
  } catch (error: any) {
    console.error('修改密码失败:', error);
    message.error(error?.response?.data?.message || error?.message || '修改密码失败，请稍后重试');
  } finally {
    changingPassword.value = false;
  }
};

// 重置密码表单
const handleResetPassword = () => {
  passwordForm.currentPassword = '';
  passwordForm.newPassword = '';
  passwordForm.confirmPassword = '';
  passwordFormRef.value?.resetFields();
};

onMounted(() => {
  authStore.initializeAuth();
  if (authStore.isAuthenticated) {
    loadUserProfile();
  } else {
    message.warning('请先登录后查看个人资料');
    router.push('/login');
  }
});
</script>

<style scoped lang="less">
.profile-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 0 0 40px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);

  h1 {
    font-size: 2.3rem;
    font-weight: 700;
    margin-bottom: 8px;
  }

  p {
    font-size: 1rem;
    opacity: 0.9;
  }
}

.content-card {
  max-width: 800px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  padding: 24px;

  :deep(.ant-tabs-nav) {
    margin-bottom: 24px;
  }

  :deep(.ant-tabs-tab) {
    font-size: 1rem;
    padding: 12px 24px;
  }
}

.profile-content {
  padding: 20px 0;
}

.readonly-text {
  color: #666;
  font-size: 0.95rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #666;
  gap: 16px;

  p {
    margin: 0;
    font-size: 1rem;
  }
}

:deep(.ant-form-item-label) {
  font-weight: 500;
}

:deep(.ant-input),
:deep(.ant-input-password) {
  border-radius: 8px;
}

:deep(.ant-btn) {
  border-radius: 8px;
  height: 40px;
  padding: 0 24px;
  font-size: 0.95rem;
}

:deep(.ant-btn-primary) {
  background: linear-gradient(90deg, #ff758c 0%, #ff7eb3 100%);
  border: none;
  box-shadow: 0 4px 10px rgba(255, 117, 140, 0.3);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 15px rgba(255, 117, 140, 0.4);
  }
}

// 响应式
@media (max-width: 768px) {
  .content-card {
    padding: 16px;
  }

  :deep(.ant-form-item-label),
  :deep(.ant-form-item-control) {
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }

  :deep(.ant-form-item-label) {
    margin-bottom: 8px;
  }

  :deep(.ant-form-item) {
    margin-bottom: 20px;
  }
}
</style>
