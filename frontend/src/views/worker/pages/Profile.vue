<template>
  <div class="page">
    <div class="grid">
      <section class="main">
        <a-alert
          v-if="approvalBanner"
          :type="approvalBanner.type as any"
          show-icon
          class="approval-alert"
        >
          <template #message>{{ approvalBanner.title }}</template>
          <template #description>
            <div>{{ approvalBanner.desc }}</div>
            <div
              v-if="approvalBanner.showSubmit && approvalProfileMissing.length"
              class="approval-missing-tip"
            >
              暂不可提交：请先点击「保存」将资料同步到服务器，并补充：{{
                approvalProfileMissing.join('、')
              }}
            </div>
            <a-button
              v-if="approvalBanner.showSubmit"
              type="primary"
              size="small"
              class="pill"
              :loading="submitApprovalLoading"
              :disabled="submitApprovalLoading || approvalProfileMissing.length > 0"
              style="margin-top: 10px"
              @click="submitApproval"
            >
              提交管理员审核
            </a-button>
          </template>
        </a-alert>

        <div class="panel">
          <div class="panel-h">
            <div class="panel-title profile-edit-heading">资料编辑</div>
            <a-button type="primary" class="pill" :loading="saving" @click="save">保存</a-button>
          </div>
          <a-form layout="vertical" class="profile-edit-form">
            <a-row :gutter="[20, 16]" align="top" class="avatar-title-row">
              <a-col :xs="24" :lg="15">
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
              </a-col>
              <a-col :xs="24" :lg="9">
                <a-form-item label="头衔">
                  <div class="title-readonly-box">
                    <span class="title-readonly">{{ mineTitleDisplay }}</span>
                  </div>
                  <div class="title-readonly-hint">
                    由管理员在后台设置；如需修改请联系门店管理员。
                  </div>
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="职位">
                  <a-select v-model:value="form.role" class="pill-input">
                    <a-select-option value="photographer">摄影师</a-select-option>
                    <a-select-option value="makeup">化妆师</a-select-option>
                    <a-select-option value="stylist">造型师</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="联系方式">
                  <a-input
                    v-model:value="form.phone"
                    class="pill-input"
                    placeholder="手机号/微信均可"
                  />
                </a-form-item>
              </a-col>
            </a-row>
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
            <a-form-item label="擅长风格">
              <a-textarea
                v-model:value="form.style"
                :rows="2"
                placeholder="如：清透韩系 / 复古胶片 / 法式浪漫"
              />
            </a-form-item>
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
            <a-form-item label="个人简介">
              <a-textarea
                v-model:value="form.bio"
                :rows="3"
                placeholder="介绍你的风格、经验、服务流程等"
              />
            </a-form-item>
            <a-form-item label="档期说明">
              <a-textarea
                v-model:value="form.scheduleNote"
                :rows="2"
                placeholder="例如：每周二店休；节假日可约"
              />
            </a-form-item>
            <a-form-item label="可预约日期">
              <div class="title-readonly-box">
                <p class="schedule-dates-hint">
                  请移步去<router-link to="/worker/schedule" class="schedule-dates-link"
                    >档期管理</router-link
                  >页面设置预约日期
                </p>
              </div>
            </a-form-item>
            <a-form-item label="上传作品">
              <div class="title-readonly-box">
                <p class="schedule-dates-hint">
                  请移步去<router-link to="/worker/portfolio" class="schedule-dates-link"
                    >作品管理</router-link
                  >页面上传作品
                </p>
              </div>
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

        <div v-if="form.role === 'photographer'" class="panel">
          <div class="panel-h"><div class="panel-title">固定合作化妆师</div></div>
          <a-select
            v-model:value="selectedFixedMakeupArtistId"
            allow-clear
            :loading="fixedMakeupLoading"
            placeholder="未绑定，系统将自动匹配"
            style="width: 100%"
          >
            <a-select-option v-for="m in makeupArtistOptions" :key="m.id" :value="m.id">
              {{ m.name }}{{ m.title ? ` · ${m.title}` : ''
              }}{{ m.rating ? ` · ⭐${m.rating}` : '' }}
            </a-select-option>
          </a-select>
          <a-button
            class="pill ghost"
            block
            style="margin-top: 10px"
            :loading="savingFixedMakeup"
            @click="saveFixedMakeupArtist"
          >
            保存固定合作化妆师
          </a-button>
          <div class="tip">仅用于“用户未指定化妆师”时的自动同步分配。</div>
        </div>

        <div class="panel">
          <div class="panel-h"><div class="panel-title">平台通知</div></div>
          <div class="notice">
            <a-spin v-if="noticesLoading" />
            <div
              v-for="n in notices"
              v-else
              :key="n.id"
              class="n-item"
              :class="{ unread: !n.read }"
              @click="markNoticeRead(n.id)"
            >
              <div class="n-title">
                <span>{{ n.title }}</span>
                <span class="n-state" :class="n.read ? 'read' : 'unread'">{{
                  n.read ? '已读' : '未读'
                }}</span>
              </div>
              <div class="n-body">{{ n.body }}</div>
              <div class="n-time">{{ n.timeText }}</div>
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
      :ok-button-props="{ class: 'profile-ok-btn' }"
      :cancel-button-props="{ class: 'profile-cancel-btn' }"
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
      :ok-button-props="{ class: 'profile-ok-btn' }"
      :cancel-button-props="{ class: 'profile-cancel-btn' }"
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
import { ordersApi } from '@/api/orders';
import {
  photographersApi,
  type MakeupArtistPublic,
  type PhotographerMine,
} from '@/api/photographers';
import { useAuthStore } from '@/store/auth';
import { getApiErrorMessage } from '@/utils/apiError';
import { unwrapOrderListPayload } from '@/utils/workerOrders';
import { UploadOutlined } from '@ant-design/icons-vue';
import type { UploadProps } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';

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
const noticesLoading = ref(false);
type NoticeItem = {
  id: string;
  title: string;
  body: string;
  time: number;
  timeText: string;
  read: boolean;
};
const notices = ref<NoticeItem[]>([]);
const makeupArtistOptions = ref<MakeupArtistPublic[]>([]);
const selectedFixedMakeupArtistId = ref<number | null>(null);
const fixedMakeupLoading = ref(false);
const savingFixedMakeup = ref(false);

const mineProfile = ref<PhotographerMine | null>(null);
const submitApprovalLoading = ref(false);

/** 与后端提交审核校验一致（基于已保存到服务器的档案） */
function approvalProfileMissingLabels(
  mine: PhotographerMine | null,
  phone: string | undefined | null
): string[] {
  const missing: string[] = [];
  if (!mine) return ['摄影师档案'];
  const nameOk = String(mine.name || '').trim();
  if (!nameOk) missing.push('姓名');
  if (!String(mine.avatar || '').trim()) missing.push('头像');
  const bio = String(mine.bio || '').trim();
  if (!bio || bio.length < 10) missing.push('个人简介（至少10个字）');
  const style = String(mine.shootingStyle || '').trim();
  if (!style || style === '（请补充拍摄风格）') missing.push('擅长风格');
  const p = String(phone || '').trim();
  if (!/^1[3-9]\d{9}$/.test(p)) missing.push('绑定11位手机号');
  if (!String(mine.specialtyTopics || '').trim()) missing.push('擅长题材');
  const imgs = Array.isArray(mine.portfolioImages) ? mine.portfolioImages.filter(Boolean) : [];
  if (imgs.length < 1) missing.push('至少一张作品');
  return missing;
}

const approvalProfileMissing = computed(() => {
  if (!authStore.user?.workerPhotographerId) return [];
  const st = String(
    mineProfile.value?.approvalStatus ?? authStore.user?.photographerApprovalStatus ?? ''
  );
  if (!['draft', 'rejected'].includes(st)) return [];
  return approvalProfileMissingLabels(mineProfile.value, authStore.user?.phone);
});

const approvalBanner = computed(() => {
  if (!authStore.user?.workerPhotographerId) return null;
  const st = String(
    mineProfile.value?.approvalStatus ?? authStore.user?.photographerApprovalStatus ?? ''
  );
  if (st === 'draft') {
    return {
      type: 'info' as const,
      title: '资料待提交审核',
      desc: '请完善左侧资料并保存后，点击「提交管理员审核」。审核通过后方可接单。',
      showSubmit: true,
    };
  }
  if (st === 'pending') {
    return {
      type: 'warning' as const,
      title: '审核中',
      desc: '管理员正在审核你的摄影师档案，请耐心等待。',
      showSubmit: false,
    };
  }
  if (st === 'rejected') {
    const note =
      mineProfile.value?.approvalReviewNote ?? authStore.user?.photographerApprovalNote ?? '';
    return {
      type: 'error' as const,
      title: '审核未通过',
      desc: (note ? `${note} — ` : '') + '请在「个人中心」修改后重新提交审核。',
      showSubmit: true,
    };
  }
  if (st === 'approved') {
    return {
      type: 'success' as const,
      title: '审核已通过',
      desc: '你已具备接单权限。若用户端「本店摄影师」暂未展示，需管理员在后台启用前台展示。',
      showSubmit: false,
    };
  }
  return null;
});

const storageKey = computed(() => `worker_profile_local_v1_${authStore.user?.id ?? 'guest'}`);
const noticeReadKey = computed(() => `worker_notice_read_ids_v1_${authStore.user?.id ?? 'guest'}`);

const form = reactive({
  role: 'photographer',
  avatar: '',
  phone: '',
  style: '',
  bio: '',
  gender: '',
  age: undefined as number | undefined,
  yearsExperience: 0,
  specialtyTopics: '',
  awards: '',
  scheduleNote: '',
});

const displayName = computed(() => String(authStore.user?.name || '工作人员'));

const mineTitleDisplay = computed(() => {
  const t = String(mineProfile.value?.title || '').trim();
  return t || '（尚未设置）';
});

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

const applyMineToForm = (hit: PhotographerMine) => {
  mineProfile.value = hit;
  form.avatar = hit.avatar || '';
  form.style = hit.shootingStyle || '';
  form.bio = hit.bio || '';
  form.gender = hit.gender || '';
  form.age = hit.age;
  form.yearsExperience = Number(hit.yearsExperience || 0);
  form.specialtyTopics = hit.specialtyTopics || '';
  form.awards = hit.awards || '';
  form.scheduleNote = hit.scheduleNote || '';
  selectedFixedMakeupArtistId.value = hit.fixedMakeupArtistId ?? null;
};

const loadMakeupArtistOptions = async () => {
  fixedMakeupLoading.value = true;
  try {
    makeupArtistOptions.value = await photographersApi.getPublicMakeupArtists();
  } catch {
    makeupArtistOptions.value = [];
  } finally {
    fixedMakeupLoading.value = false;
  }
};

const saveFixedMakeupArtist = async () => {
  if (!authStore.user?.workerPhotographerId) {
    message.warning('当前账号未关联摄影师档案');
    return;
  }
  savingFixedMakeup.value = true;
  try {
    await photographersApi.setMineFixedMakeupArtist(selectedFixedMakeupArtistId.value);
    await hydrateFromMine();
    message.success('固定合作化妆师已保存');
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    savingFixedMakeup.value = false;
  }
};

const hydrateFromMine = async () => {
  if (!authStore.user?.workerPhotographerId) return;
  try {
    const hit = await photographersApi.getMine();
    applyMineToForm(hit);
  } catch {
    /* ignore */
  }
};

/** 无后端档案时的兜底（演示账号等） */
const hydrateFromPublicByName = async () => {
  const name = displayName.value.trim();
  if (!name) return;
  try {
    const list = await photographersApi.getPublic();
    const hit = list.find((x) => String(x.name || '').trim() === name);
    if (!hit) return;
    if (!form.avatar) form.avatar = hit.avatar || '';
    if (!form.style) form.style = hit.shootingStyle || '';
    if (!form.bio) form.bio = hit.bio || '';
    if (!form.gender) form.gender = hit.gender || '';
    if (form.age == null) form.age = hit.age;
    if (!form.yearsExperience) form.yearsExperience = Number(hit.yearsExperience || 0);
    if (!form.specialtyTopics) form.specialtyTopics = hit.specialtyTopics || '';
    if (!form.awards) form.awards = hit.awards || '';
    if (!form.scheduleNote) form.scheduleNote = hit.scheduleNote || '';
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

const formatNoticeTime = (ts: number) => {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
};

const parseTs = (v: unknown): number => {
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : Date.now();
};

const loadReadIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(noticeReadKey.value);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set<string>();
  }
};

const saveReadIds = (ids: Set<string>) => {
  localStorage.setItem(noticeReadKey.value, JSON.stringify(Array.from(ids)));
};

const save = async () => {
  localStorage.setItem(storageKey.value, JSON.stringify(form));
  const name = displayName.value.trim();
  if (!name) {
    message.success('已保存本地资料');
    return;
  }
  if (!authStore.user?.workerPhotographerId) {
    message.warning('已保存本地资料；当前账号未关联摄影师档案，无法同步服务器');
    return;
  }
  saving.value = true;
  try {
    const hit = await photographersApi.updateMine({
      name,
      avatar: form.avatar.trim() || null,
      shootingStyle: form.style.trim() || '（请补充拍摄风格）',
      yearsExperience: Number(form.yearsExperience || 0),
      bio: form.bio.trim() || null,
      gender: form.gender?.trim() || null,
      age: form.age ?? null,
      specialtyTopics: form.specialtyTopics.trim() || null,
      awards: form.awards.trim() || null,
      scheduleNote: form.scheduleNote.trim() || null,
    });
    applyMineToForm(hit);
    await authStore.getProfile();
    message.success('已保存并同步到服务器');
  } catch {
    message.warning('已保存本地资料；同步服务器失败，请稍后重试');
  } finally {
    saving.value = false;
  }
};

const submitApproval = async () => {
  const missing = approvalProfileMissingLabels(mineProfile.value, authStore.user?.phone);
  if (missing.length) {
    message.warning(`请先完善个人信息并保存后再提交，尚缺：${missing.join('、')}`);
    return;
  }
  submitApprovalLoading.value = true;
  try {
    await photographersApi.submitApproval();
    await authStore.getProfile();
    await hydrateFromMine();
    message.success('已提交管理员审核');
  } catch (e: unknown) {
    message.error(getApiErrorMessage(e));
  } finally {
    submitApprovalLoading.value = false;
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

const markNoticeRead = (id: string) => {
  const i = notices.value.findIndex((x) => x.id === id);
  if (i === -1 || notices.value[i]?.read) return;
  notices.value[i] = { ...notices.value[i], read: true };
  const ids = loadReadIds();
  ids.add(id);
  saveReadIds(ids);
};

const loadNotices = async () => {
  noticesLoading.value = true;
  try {
    const workerRes = await ordersApi.getWorkerOrders();
    const workerOrders = unwrapOrderListPayload(workerRes as any);
    const rows = Array.isArray(workerOrders) ? workerOrders : [];

    const pendingTake = rows.filter(
      (x: any) => !Number(x?.workerUserId || 0) && !String(x?.workerTakenAt || '').trim()
    ).length;
    const pendingReschedule = rows.filter(
      (x: any) => String(x?.rescheduleRequestStatus || '').toLowerCase() === 'pending'
    ).length;
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayShootings = rows.filter(
      (x: any) => String(x?.shootingDate || '').slice(0, 10) === todayKey
    ).length;

    const realOrderNotices: Array<Omit<NoticeItem, 'read' | 'timeText'>> = [];
    if (pendingTake > 0 && authStore.user?.photographerCanTakeOrders) {
      const latestTs = Math.max(
        ...rows
          .filter(
            (x: any) => !Number(x?.workerUserId || 0) && !String(x?.workerTakenAt || '').trim()
          )
          .map((x: any) => parseTs(x?.createdAt))
      );
      realOrderNotices.push({
        id: `order-pending-take-${pendingTake}-${latestTs}`,
        title: '待接单提醒',
        body: `当前有 ${pendingTake} 条订单待接单，请及时处理。`,
        time: latestTs,
      });
    }
    if (pendingReschedule > 0) {
      const latestTs = Math.max(
        ...rows
          .filter((x: any) => String(x?.rescheduleRequestStatus || '').toLowerCase() === 'pending')
          .map((x: any) => parseTs(x?.rescheduleRequestedAt || x?.updatedAt || x?.createdAt))
      );
      realOrderNotices.push({
        id: `order-reschedule-pending-${pendingReschedule}-${latestTs}`,
        title: '改期申请提醒',
        body: `当前有 ${pendingReschedule} 条改期申请待处理。`,
        time: latestTs,
      });
    }
    if (todayShootings > 0) {
      const latestTs = Math.max(
        ...rows
          .filter((x: any) => String(x?.shootingDate || '').slice(0, 10) === todayKey)
          .map((x: any) => parseTs(`${String(x?.shootingDate).slice(0, 10)}T09:00:00`))
      );
      realOrderNotices.push({
        id: `order-today-shooting-${todayShootings}-${todayKey}`,
        title: '今日拍摄提醒',
        body: `今天有 ${todayShootings} 条拍摄安排，请提前确认客户沟通与档期。`,
        time: latestTs,
      });
    }
    if (!realOrderNotices.length) {
      realOrderNotices.push({
        id: `order-empty-${todayKey}`,
        title: '订单提醒',
        body: '当前暂无待处理订单提醒。',
        time: Date.now() - 60 * 1000,
      });
    }

    const realSystemNotices: Array<Omit<NoticeItem, 'read' | 'timeText'>> = [];
    const profileTs = parseTs(authStore.user?.updatedAt);
    if (authStore.user?.phone) {
      realSystemNotices.push({
        id: `sys-phone-bound-${String(authStore.user.phone)}`,
        title: '账号状态',
        body: `已绑定手机号：${String(authStore.user.phone)}`,
        time: profileTs,
      });
    } else {
      realSystemNotices.push({
        id: 'sys-phone-unbound',
        title: '账号安全提醒',
        body: '建议尽快绑定手机号，便于接收通知与找回账号。',
        time: profileTs,
      });
    }
    if (authStore.user?.workerPhotographerId) {
      realSystemNotices.push({
        id: `sys-worker-bind-${authStore.user.workerPhotographerId}`,
        title: '档案关联状态',
        body: `当前账号已关联摄影师档案（ID: ${authStore.user.workerPhotographerId}）。`,
        time: profileTs - 1000,
      });
    }
    realSystemNotices.push({
      id: `sys-order-overview-${rows.length}`,
      title: '订单数据概览',
      body: `系统已同步到你名下共 ${rows.length} 条订单记录。`,
      time: Date.now() - 2000,
    });
    const readIds = loadReadIds();
    notices.value = [...realOrderNotices, ...realSystemNotices]
      .map((x) => ({
        ...x,
        read: readIds.has(x.id),
        timeText: formatNoticeTime(x.time),
      }))
      .sort((a, b) => b.time - a.time);
  } catch {
    notices.value = [
      {
        id: `sys-load-error-${Date.now()}`,
        title: '系统公告',
        body: '系统通知加载失败，请稍后重试。',
        time: Date.now(),
        timeText: formatNoticeTime(Date.now()),
        read: false,
      },
    ];
  } finally {
    noticesLoading.value = false;
  }
};

watch(
  () => authStore.user?.photographerApprovalStatus,
  () => {
    if (mineProfile.value && authStore.user?.photographerApprovalStatus) {
      mineProfile.value = {
        ...mineProfile.value,
        approvalStatus: String(authStore.user.photographerApprovalStatus),
        approvalReviewNote: authStore.user.photographerApprovalNote ?? null,
      };
    }
  }
);

onMounted(async () => {
  authStore.initializeAuth();
  load();
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
  await hydrateFromMine();
  await loadMakeupArtistOptions();
  if (!mineProfile.value) {
    await hydrateFromPublicByName();
  }
  void loadNotices();
});
</script>

<style scoped lang="less">
.page {
  --pink: #ff6b8b;
  --r: 12px;
}

.approval-alert {
  margin-bottom: 14px;
}

.approval-missing-tip {
  margin-top: 8px;
  font-size: 13px;
  color: #b45309;
  line-height: 1.5;
}

.schedule-dates-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #dc2626;
  font-weight: 600;
}

.schedule-dates-link {
  color: #b91c1c;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
  margin: 0 2px;
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

.profile-edit-heading {
  font-size: 18px;
  line-height: 1.3;
}

.profile-edit-form :deep(.ant-form-item-label > label) {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  height: auto;
  line-height: 1.45;
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

.title-readonly-box {
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 6px 10px;
  min-height: 32px;
  display: flex;
  align-items: center;
  background: #fafafa;
  box-sizing: border-box;
}

.title-readonly {
  font-size: 14px;
  font-weight: 400;
  color: #111827;
  line-height: 1.5;
  word-break: break-word;
}

.title-readonly-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.45;
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
.avatar-title-row {
  margin-bottom: 0;
}

.avatar-title-row :deep(.ant-col) {
  display: flex;
}

.avatar-title-row :deep(.ant-form-item) {
  flex: 1;
  width: 100%;
  margin-bottom: 16px;
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
  cursor: pointer;
}
.n-item.unread {
  border-color: rgba(255, 107, 139, 0.32);
  background: rgba(255, 107, 139, 0.12);
}
.n-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-weight: 900;
  color: #111827;
}
.n-state {
  font-size: 12px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 107, 139, 0.25);
}
.n-state.unread {
  color: #be185d;
  background: rgba(255, 107, 139, 0.12);
}
.n-state.read {
  color: #64748b;
  background: rgba(148, 163, 184, 0.12);
  border-color: rgba(148, 163, 184, 0.28);
}
.n-body {
  margin-top: 4px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}
.n-time {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
}
</style>

<style lang="less">
.ant-btn.profile-ok-btn {
  background: #ff6b8b !important;
  border-color: #ff6b8b !important;
  color: #fff !important;
  box-shadow: none !important;
}

.ant-btn.profile-ok-btn:hover,
.ant-btn.profile-ok-btn:focus,
.ant-btn.profile-ok-btn:active {
  background: #ef476f !important;
  border-color: #ef476f !important;
  color: #fff !important;
  box-shadow: none !important;
}

.ant-btn.profile-cancel-btn:hover,
.ant-btn.profile-cancel-btn:focus,
.ant-btn.profile-cancel-btn:active {
  color: #d6336c !important;
  border-color: #ff9fbc !important;
  background: #fff5f8 !important;
  box-shadow: none !important;
}
</style>
