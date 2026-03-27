<template>
  <div class="page">
    <div class="grid">
      <section class="main">
        <div class="panel">
          <div class="panel-h">
            <div class="panel-title">资料编辑</div>
            <a-button type="primary" class="pill" :loading="saving" @click="save">保存</a-button>
          </div>
          <a-form layout="vertical">
            <a-form-item label="头像">
              <div class="upload-row">
                <a-upload
                  accept="image/*"
                  :show-upload-list="false"
                  :custom-request="handleAvatarUpload"
                >
                  <a-button :loading="uploadingAvatar">
                    <template #icon><UploadOutlined /></template>
                    从本机选择并上传
                  </a-button>
                </a-upload>
                <span class="upload-hint">支持常见图片格式，单张不超过 5MB</span>
              </div>
              <div v-if="form.avatar" class="avatar-preview">
                <a-image
                  :src="form.avatar"
                  :width="96"
                  :height="96"
                  style="object-fit: cover; border-radius: 8px"
                />
                <a-button type="link" danger size="small" @click="form.avatar = ''"
                  >清除头像</a-button
                >
              </div>
              <a-input
                v-model:value="form.avatar"
                placeholder="或直接粘贴图片链接（与上传二选一或补充）"
                allow-clear
                class="avatar-url-fallback"
              />
            </a-form-item>
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
                <a-form-item label="头衔">
                  <a-input
                    v-model:value="form.title"
                    class="pill-input"
                    placeholder="如：首席摄影师"
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
              <a-textarea
                v-model:value="form.style"
                :rows="2"
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
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="性别">
                  <a-select
                    v-model:value="form.gender"
                    allow-clear
                    class="pill-input"
                    placeholder="可选"
                  >
                    <a-select-option value="男">男</a-select-option>
                    <a-select-option value="女">女</a-select-option>
                    <a-select-option value="其他">其他</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="年龄">
                  <a-input-number
                    v-model:value="form.age"
                    :min="18"
                    :max="80"
                    style="width: 100%"
                    placeholder="可选"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="从业年限（年）">
                  <a-input-number
                    v-model:value="form.yearsExperience"
                    :min="0"
                    :max="60"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="擅长题材">
              <a-textarea
                v-model:value="form.specialtyTopics"
                :rows="1"
                placeholder="如：婚纱旅拍、亲子、商业形象"
              />
            </a-form-item>
            <a-form-item label="资质与获奖">
              <a-textarea
                v-model:value="form.awards"
                :rows="1"
                placeholder="如：协会会员、比赛奖项、平台认证等"
              />
            </a-form-item>
            <a-form-item label="可预约日期">
              <a-textarea
                v-model:value="form.availableDatesText"
                :rows="3"
                placeholder="每行一个日期，格式 YYYY-MM-DD"
              />
            </a-form-item>
            <a-form-item label="档期说明">
              <a-textarea
                v-model:value="form.scheduleNote"
                :rows="2"
                placeholder="例如：每周二店休；节假日可约"
              />
            </a-form-item>
            <a-form-item label="作品链接（每行一个）">
              <a-textarea
                v-model:value="form.portfolioText"
                :rows="3"
                placeholder="可粘贴作品图片链接，展示时可直接复用"
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
          <div v-if="authStore.user?.phone" class="tip">已绑定手机：{{ authStore.user.phone }}</div>
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

    <a-modal
      v-model:open="pwdModalOpen"
      title="修改密码"
      ok-text="确认修改"
      cancel-text="取消"
      :ok-button-props="{
        style: { backgroundColor: '#ff6b8b', borderColor: '#ff6b8b', color: '#fff' },
      }"
      :confirm-loading="pwdSubmitting"
      destroy-on-close
      @ok="submitChangePassword"
    >
      <a-form layout="vertical">
        <a-form-item label="当前密码">
          <a-input-password v-model:value="pwdForm.current" placeholder="请输入当前登录密码" />
        </a-form-item>
        <a-form-item label="新密码">
          <a-input-password v-model:value="pwdForm.next" placeholder="至少 6 位" />
        </a-form-item>
        <a-form-item label="确认新密码">
          <a-input-password v-model:value="pwdForm.confirm" placeholder="再次输入新密码" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="phoneModalOpen"
      title="绑定手机号"
      ok-text="确认绑定"
      cancel-text="取消"
      :ok-button-props="{
        style: { backgroundColor: '#ff6b8b', borderColor: '#ff6b8b', color: '#fff' },
      }"
      :confirm-loading="phoneSubmitting"
      destroy-on-close
      @ok="submitBindPhone"
    >
      <p class="phone-tip">将绑定到当前登录账号，需为 11 位中国大陆手机号。</p>
      <a-form layout="vertical">
        <a-form-item label="手机号">
          <a-input v-model:value="phoneForm.phone" placeholder="请输入手机号" :maxlength="11" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { authApi } from '@/api/auth';
import { photographersApi } from '@/api/photographers';
import { useAuthStore } from '@/store/auth';
import { getApiErrorMessage } from '@/utils/apiError';
import { UploadOutlined } from '@ant-design/icons-vue';
import type { UploadProps } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref } from 'vue';

const authStore = useAuthStore();
const saving = ref(false);
const uploadingAvatar = ref(false);

const pwdModalOpen = ref(false);
const pwdSubmitting = ref(false);
const pwdForm = reactive({
  current: '',
  next: '',
  confirm: '',
});

const phoneModalOpen = ref(false);
const phoneSubmitting = ref(false);
const phoneForm = reactive({ phone: '' });

const storageKey = computed(() => `worker_profile_local_v1_${authStore.user?.id ?? 'guest'}`);

const form = reactive({
  role: 'photographer',
  title: '',
  avatar: '',
  phone: '',
  style: '',
  bio: '',
  gender: '',
  age: undefined as number | undefined,
  yearsExperience: 0,
  specialtyTopics: '',
  awards: '',
  availableDatesText: '',
  scheduleNote: '',
  portfolioText: '',
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

const hydrateFromPhotographerLibrary = async () => {
  const name = displayName.value.trim();
  if (!name) return;
  try {
    const list = await photographersApi.getPublic();
    const hit = list.find((x) => String(x.name || '').trim() === name);
    if (!hit) return;
    if (!form.title) form.title = hit.title || '';
    if (!form.avatar) form.avatar = hit.avatar || '';
    if (!form.style) form.style = hit.shootingStyle || '';
    if (!form.bio) form.bio = hit.bio || '';
    if (!form.gender) form.gender = hit.gender || '';
    if (form.age == null) form.age = hit.age;
    if (!form.yearsExperience) form.yearsExperience = Number(hit.yearsExperience || 0);
    if (!form.specialtyTopics) form.specialtyTopics = hit.specialtyTopics || '';
    if (!form.awards) form.awards = hit.awards || '';
    if (!form.availableDatesText) form.availableDatesText = (hit.availableDates || []).join('\n');
    if (!form.scheduleNote) form.scheduleNote = hit.scheduleNote || '';
    if (!form.portfolioText) form.portfolioText = (hit.portfolioImages || []).join('\n');
  } catch {
    /* ignore */
  }
};

const handleAvatarUpload: UploadProps['customRequest'] = async (options) => {
  const { file, onSuccess, onError } = options;
  const raw = file as File;
  uploadingAvatar.value = true;
  try {
    const { url } = await photographersApi.uploadImage(raw);
    form.avatar = url;
    onSuccess?.(url);
    message.success('头像已上传');
  } catch (e: unknown) {
    onError?.(e as Error);
    const msg =
      e && typeof e === 'object' && 'message' in e
        ? String((e as { message?: string }).message)
        : '上传失败';
    message.error(msg);
  } finally {
    uploadingAvatar.value = false;
  }
};

const parseLineValues = (text: string): string[] =>
  String(text || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

const parseAvailableDates = (text: string): string[] => {
  const tokens = String(text || '')
    .split(/\r?\n/)
    .flatMap((line) => line.split(/[,，]/))
    .map((s) => s.trim())
    .filter(Boolean);
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (!re.test(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.sort();
};

const save = async () => {
  localStorage.setItem(storageKey.value, JSON.stringify(form));
  const name = displayName.value.trim();
  if (!name) {
    message.success('已保存本地资料');
    return;
  }
  saving.value = true;
  try {
    const list = await photographersApi.getPublic();
    const hit = list.find((x) => String(x.name || '').trim() === name);
    if (!hit?.id) {
      message.warning('已保存本地资料；未在摄影师管理中匹配到同名记录，暂未同步后端');
      return;
    }

    await photographersApi.update(hit.id, {
      title: form.title.trim() || null,
      avatar: form.avatar.trim() || null,
      shootingStyle: form.style.trim() || '',
      yearsExperience: Number(form.yearsExperience || 0),
      bio: form.bio.trim() || null,
      gender: form.gender?.trim() || null,
      age: form.age ?? null,
      specialtyTopics: form.specialtyTopics.trim() || null,
      awards: form.awards.trim() || null,
      portfolioImages: parseLineValues(form.portfolioText),
      availableDates: parseAvailableDates(form.availableDatesText),
      scheduleNote: form.scheduleNote.trim() || null,
    });
    message.success('已保存并同步到摄影师管理后端');
  } catch {
    message.warning('已保存本地资料；同步后端失败，请稍后重试');
  } finally {
    saving.value = false;
  }
};

const changePassword = () => {
  pwdForm.current = '';
  pwdForm.next = '';
  pwdForm.confirm = '';
  pwdModalOpen.value = true;
};

const submitChangePassword = async () => {
  const cur = pwdForm.current.trim();
  const next = pwdForm.next.trim();
  const confirm = pwdForm.confirm.trim();
  if (!cur || !next || !confirm) {
    message.warning('请填写完整');
    return;
  }
  if (next.length < 6) {
    message.warning('新密码至少 6 位');
    return;
  }
  if (next !== confirm) {
    message.warning('两次输入的新密码不一致');
    return;
  }
  if (!authStore.accessToken) {
    message.warning('请先登录');
    return;
  }
  pwdSubmitting.value = true;
  try {
    await authApi.changePassword({ currentPassword: cur, newPassword: next });
    message.success('密码已修改');
    pwdModalOpen.value = false;
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    pwdSubmitting.value = false;
  }
};

const bindPhone = () => {
  phoneForm.phone = String(authStore.user?.phone || form.phone || '').trim();
  phoneModalOpen.value = true;
};

const submitBindPhone = async () => {
  const p = phoneForm.phone.trim();
  if (!/^1[3-9]\d{9}$/.test(p)) {
    message.warning('请输入有效的 11 位手机号');
    return;
  }
  if (!authStore.accessToken) {
    message.warning('请先登录');
    return;
  }
  phoneSubmitting.value = true;
  try {
    await authApi.bindPhone({ phone: p });
    form.phone = p;
    localStorage.setItem(storageKey.value, JSON.stringify(form));
    await authStore.getProfile();
    message.success('手机号已绑定');
    phoneModalOpen.value = false;
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    phoneSubmitting.value = false;
  }
};

onMounted(async () => {
  authStore.initializeAuth();
  load();
  hydrateFromPhotographerLibrary();
  if (authStore.accessToken && authStore.user?.id) {
    try {
      await authStore.getProfile();
      if (authStore.user?.phone) {
        form.phone = String(authStore.user.phone);
      }
    } catch {
      /* ignore */
    }
  }
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
:deep(.ant-btn-primary.pill:hover),
:deep(.ant-btn-primary.pill:focus) {
  background: #ef3b5d;
  border-color: #ef3b5d;
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
.av.real {
  box-shadow: 0 12px 24px rgba(255, 107, 139, 0.22);
}
.upload-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.upload-hint {
  font-size: 12px;
  color: #9ca3af;
}
.avatar-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}
.avatar-url-fallback {
  margin-top: 8px;
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
.phone-tip {
  margin: 0 0 12px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
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
