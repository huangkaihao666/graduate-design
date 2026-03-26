<template>
  <div class="page">
    <div class="head">
      <div>
        <div class="title">个人中心</div>
        <div class="sub">个人信息卡片 + 资料编辑；右侧账号安全与平台通知。</div>
      </div>
    </div>

    <div class="grid">
      <section class="main">
        <div class="panel profile-card">
          <div class="avatar">
            <div class="av">{{ displayName.slice(0, 1) }}</div>
            <div class="meta">
              <div class="n">{{ displayName }}</div>
              <div class="p">{{ positionLabel }}</div>
              <div class="chips">
                <span class="chip">{{ form.city || '服务地区待设置' }}</span>
                <span class="chip">{{ form.style || '擅长风格待设置' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-h">
            <div class="panel-title">资料编辑</div>
            <a-button type="primary" class="pill" @click="save">保存</a-button>
          </div>
          <a-form layout="vertical">
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="职位">
                  <a-select v-model:value="form.role" class="pill-input">
                    <a-select-option value="photographer">摄影师</a-select-option>
                    <a-select-option value="makeup">化妆师</a-select-option>
                    <a-select-option value="stylist">造型师</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="服务地区">
                  <a-input
                    v-model:value="form.city"
                    class="pill-input"
                    placeholder="如：三亚 / 大理"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="联系方式">
                  <a-input
                    v-model:value="form.phone"
                    class="pill-input"
                    placeholder="手机号/微信均可"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="擅长风格">
              <a-input
                v-model:value="form.style"
                class="pill-input"
                placeholder="如：清透韩系 / 复古胶片 / 法式浪漫"
              />
            </a-form-item>
            <a-form-item label="个人简介">
              <a-textarea
                v-model:value="form.bio"
                :rows="3"
                placeholder="介绍你的风格、经验、服务流程等"
              />
            </a-form-item>
          </a-form>
        </div>
      </section>

      <aside class="right">
        <div class="panel">
          <div class="panel-h"><div class="panel-title">账号安全</div></div>
          <div class="sec">
            <a-button class="pill ghost" block @click="changePassword">修改密码</a-button>
            <a-button class="pill ghost" block @click="bindPhone">绑定手机号</a-button>
          </div>
          <div class="tip">说明：这里先做界面，后端接入后可联动真实密码修改。</div>
        </div>

        <div class="panel">
          <div class="panel-h"><div class="panel-title">平台通知</div></div>
          <div class="notice">
            <div class="n-item">
              <div class="n-title">订单提醒</div>
              <div class="n-body">有新订单/改期申请时会在此提示（演示）。</div>
            </div>
            <div class="n-item">
              <div class="n-title">系统公告</div>
              <div class="n-body">温柔粉系 UI 已上线，支持消息图片发送（本地演示）。</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive } from 'vue';

const authStore = useAuthStore();

const storageKey = computed(() => `worker_profile_local_v1_${authStore.user?.id ?? 'guest'}`);

const form = reactive({
  role: 'photographer',
  city: '',
  phone: '',
  style: '',
  bio: '',
});

const displayName = computed(() => String(authStore.user?.name || '工作人员'));

const positionLabel = computed(() => {
  if (form.role === 'photographer') return '摄影师';
  if (form.role === 'makeup') return '化妆师';
  return '造型师';
});

const load = () => {
  const raw = localStorage.getItem(storageKey.value);
  if (!raw) return;
  try {
    const v = JSON.parse(raw) as any;
    Object.assign(form, v || {});
  } catch {
    /* ignore */
  }
};

const save = () => {
  localStorage.setItem(storageKey.value, JSON.stringify(form));
  message.success('已保存（本地演示）');
};

const changePassword = () => {
  message.info('修改密码（演示）：后端接入后联动真实密码修改');
};
const bindPhone = () => {
  message.info('绑定手机号（演示）：后端接入后联动真实绑定');
};

onMounted(() => {
  authStore.initializeAuth();
  load();
});
</script>

<style scoped lang="less">
.page {
  --pink: #ff6b8b;
  --r: 12px;
}
.head {
  margin-bottom: 14px;
}
.title {
  font-weight: 900;
  color: #111827;
  font-size: 18px;
  margin-bottom: 4px;
}
.sub {
  color: #6b7280;
  font-size: 13px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 16px;
  align-items: start;
  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
}
.panel {
  background: #fff;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: var(--r);
  padding: 14px;
  box-shadow: 0 10px 26px rgba(17, 24, 39, 0.05);
  margin-bottom: 14px;
}
.panel-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.panel-title {
  font-weight: 900;
  color: #111827;
}
.pill {
  border-radius: 999px;
  background: var(--pink);
  border-color: var(--pink);
}
.pill.ghost {
  background: rgba(255, 107, 139, 0.1);
  border-color: rgba(255, 107, 139, 0.18);
  color: #d6336c;
}
.pill-input :deep(.ant-select-selector),
.pill-input :deep(.ant-input) {
  border-radius: 999px !important;
}
.profile-card {
  background: linear-gradient(135deg, rgba(255, 107, 139, 0.14) 0%, rgba(255, 155, 180, 0.1) 100%);
  border-color: rgba(255, 107, 139, 0.22);
}
.avatar {
  display: flex;
  gap: 12px;
  align-items: center;
}
.av {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ff6b8b 0%, #ff9bb4 100%);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 24px;
  font-weight: 900;
  box-shadow: 0 12px 24px rgba(255, 107, 139, 0.22);
}
.meta .n {
  font-weight: 900;
  color: #111827;
  font-size: 16px;
}
.meta .p {
  color: #d6336c;
  font-weight: 800;
  margin-top: 2px;
}
.chips {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  font-size: 12px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 107, 139, 0.18);
  background: rgba(255, 107, 139, 0.08);
  color: #d6336c;
}
.sec {
  display: grid;
  gap: 10px;
}
.tip {
  margin-top: 10px;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.6;
}
.notice {
  display: grid;
  gap: 10px;
}
.n-item {
  border-radius: var(--r);
  border: 1px solid rgba(255, 107, 139, 0.18);
  background: rgba(255, 107, 139, 0.06);
  padding: 12px;
}
.n-title {
  font-weight: 900;
  color: #111827;
}
.n-body {
  margin-top: 4px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}
</style>
