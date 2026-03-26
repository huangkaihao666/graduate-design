<template>
  <div class="user-chat-page">
    <div class="grid">
      <section class="panel list">
        <div class="list-head">
          <a-input-search
            v-model:value="kw"
            allow-clear
            placeholder="搜索订单号 / 摄影师"
            class="pill-input"
          />
          <div class="conv-filters">
            <button
              type="button"
              class="filter-pill"
              :class="{ active: convFilter === 'all' }"
              @click="convFilter = 'all'"
            >
              全部
            </button>
            <button
              type="button"
              class="filter-pill"
              :class="{ active: convFilter === 'unread' }"
              @click="convFilter = 'unread'"
            >
              未读
            </button>
            <button
              type="button"
              class="filter-pill"
              :class="{ active: convFilter === 'ongoing' }"
              @click="convFilter = 'ongoing'"
            >
              订单进行中
            </button>
          </div>
        </div>
        <div class="conv">
          <div
            v-for="c in filteredConvs"
            :key="c.id"
            class="conv-item"
            :class="{ active: selected?.id === c.id }"
            @click="select(c)"
          >
            <a-avatar :size="38">{{ peerInitial(c) }}</a-avatar>
            <div class="meta">
              <div class="row1">
                <span class="name">{{ c.peerName }}</span>
                <span v-if="c.unread" class="badge">{{ c.unread }}</span>
              </div>
              <div class="row2">{{ c.last }}</div>
            </div>
          </div>
          <a-empty
            v-if="!filteredConvs.length"
            description="暂无会话，可在「我的订单」中联系摄影师"
          />
        </div>
      </section>

      <section class="panel chat">
        <div class="chat-head">
          <div class="chat-title">
            <a-avatar :size="30">{{ selected ? peerInitial(selected) : '💬' }}</a-avatar>
            <strong>{{ selected?.peerName || '请选择会话' }}</strong>
          </div>
          <a-space>
            <a-upload :show-upload-list="false" :custom-request="sendImage">
              <a-button class="pill ghost" size="small">发送图片</a-button>
            </a-upload>
          </a-space>
        </div>

        <div ref="msgsRef" class="msgs">
          <div
            v-for="m in messages"
            :key="m.id"
            class="msg"
            :class="{ mine: m.from === 'customer' }"
          >
            <div class="bubble">
              <template v-if="isImage(m.content)">
                <img :src="m.content" alt="图片" />
              </template>
              <template v-else>
                {{ m.content }}
              </template>
            </div>
            <div class="ts">{{ m.at }}</div>
          </div>
          <a-empty v-if="!messages.length" description="暂无消息，输入下方开始沟通" />
        </div>

        <div class="composer">
          <a-textarea
            v-model:value="draft"
            :rows="2"
            placeholder="输入消息，回车发送（Shift+Enter 换行）"
            @press-enter="onEnter"
          />
          <a-button type="primary" class="pill" :disabled="!selected" @click="sendText"
            >发送</a-button
          >
        </div>
      </section>

      <aside class="right">
        <div class="panel info-panel">
          <div class="panel-h"><div class="panel-title">会话信息</div></div>
          <div v-if="selected" class="info">
            <div class="kv">
              <span class="k">对方</span><span class="v">{{ selected.peerName }}</span>
            </div>
            <div class="kv">
              <span class="k">订单号</span><span class="v">{{ selected.orderNo }}</span>
            </div>
            <div class="kv">
              <span class="k">拍摄日</span><span class="v">{{ selected.time }}</span>
            </div>
          </div>
          <div v-else class="empty">请选择左侧会话</div>
        </div>

        <!-- 常见问题（放在右侧会话信息下方） -->
        <div class="panel faq-panel">
          <div class="panel-h"><div class="panel-title">常见问题</div></div>
          <div class="faq-list">
            <button
              v-for="it in faqItems"
              :key="it.key"
              type="button"
              class="faq-item"
              @click="openFaq(it.key)"
            >
              <span class="i">{{ it.icon }}</span>
              <span class="t">{{ it.label }}</span>
            </button>
          </div>
        </div>

        <div class="panel quick-panel">
          <div class="panel-h">
            <div class="panel-title">快捷回复</div>
          </div>
          <div class="quick-list">
            <a-button
              v-for="(t, idx) in quickReplies"
              :key="idx"
              class="pill ghost quick-btn"
              :title="t"
              block
              @click="sendQuick(t)"
            >
              <span class="quick-text">{{ t }}</span>
            </a-button>
          </div>
        </div>
      </aside>
    </div>

    <a-drawer
      v-model:open="faqOpen"
      :title="activeFaq?.label || '常见问题'"
      placement="right"
      :width="420"
    >
      <div v-if="activeFaq" class="faq-detail">
        <div class="faq-detail-title">{{ activeFaq.label }}</div>
        <div class="faq-detail-body">
          <template v-for="(p, idx) in activeFaq.detail" :key="idx">
            <p>{{ p }}</p>
          </template>
        </div>
      </div>
      <a-empty v-else description="请选择一个问题" />
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/store/auth';
import {
  isOrderThreadId,
  orderNoFromThreadId,
  orderThreadId,
  sharedOrderMessagesStorageKey,
} from '@/utils/orderChatStorage';
import type { UploadProps } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import dayjs from 'dayjs';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

type UConv = {
  id: string;
  peerName: string;
  last: string;
  unread: number;
  orderNo: string;
  time: string;
};
type Msg = { id: string; from: 'staff' | 'customer'; content: string; at: string };

const authStore = useAuthStore();
const route = useRoute();
const uid = () => authStore.user?.id ?? 'guest';
const kw = ref('');
const convFilter = ref<'all' | 'unread' | 'ongoing'>('all');
const convs = ref<UConv[]>([]);
const selected = ref<UConv | null>(null);
const messages = ref<Msg[]>([]);
const draft = ref('');
const quickReplies = [
  '老师您好，我这边想确认一下拍摄时间安排。',
  '我偏好自然清新风格，妆造建议可以给我一些吗？',
  '请问拍摄当天需要提前多久到场？',
  '如果临时下雨，拍摄方案可以怎么调整？',
  '好的收到，谢谢老师～',
];
const msgsRef = ref<HTMLElement | null>(null);

type FaqKey = 'flow' | 'pick' | 'after';
type FaqItem = { key: FaqKey; label: string; icon: string; detail: string[] };

const faqItems: FaqItem[] = [
  {
    key: 'flow',
    label: '拍摄流程',
    icon: '🧾',
    detail: [
      '1）沟通确认：确定风格、地点、时间与套餐内容。',
      '2）到店/集合：核对信息，协助更衣与补妆（如含妆造）。',
      '3）正式拍摄：摄影师引导姿势与情绪，边拍边调整细节。',
      '4）选片与精修：按规则选片，进入精修与交付流程。',
    ],
  },
  {
    key: 'pick',
    label: '选片规则',
    icon: '✅',
    detail: [
      '一般会提供预览片供挑选（具体数量以套餐为准）。',
      '精修张数按套餐包含数量，超出部分可按张加修。',
      '如需特殊风格（胶片、复古、电影感等），请提前说明。',
    ],
  },
  {
    key: 'after',
    label: '售后政策',
    icon: '🛡️',
    detail: [
      '交付内容：精修照片/原片是否赠送以套餐说明为准。',
      '改期规则：如需改期请尽早沟通，以档期与规则为准。',
      '问题反馈：如对精修效果有调整建议，可在交付周期内沟通修改。',
    ],
  },
];

const faqOpen = ref(false);
const activeFaqKey = ref<FaqKey | null>(null);
const activeFaq = computed(() => faqItems.find((x) => x.key === activeFaqKey.value) || null);
const openFaq = (key: FaqKey) => {
  activeFaqKey.value = key;
  faqOpen.value = true;
};

const convListKey = () => `user_${uid()}_chat_convs_v1`;
const lastSelKey = () => `user_${uid()}_chat_last_conv`;

const threadStorageKey = (id: string) => {
  if (isOrderThreadId(id)) return sharedOrderMessagesStorageKey(orderNoFromThreadId(id));
  return `user_${uid()}_msg_thread_${id}`;
};

const filteredConvs = computed(() => {
  const q = kw.value.trim().toLowerCase();
  const byKeyword = !q
    ? convs.value
    : convs.value.filter(
        (c) => c.peerName.toLowerCase().includes(q) || c.orderNo.toLowerCase().includes(q)
      );

  return byKeyword.filter((c) => {
    if (convFilter.value === 'unread') return c.unread > 0;
    if (convFilter.value === 'ongoing') {
      // 简化规则：有订单号且非“已完成”标记，视为进行中
      return !!c.orderNo && !/完成|completed/i.test(c.last || '');
    }
    return true;
  });
});

const peerInitial = (c: UConv) => c.peerName?.trim()?.slice(0, 1) || '摄';

const isImage = (content: string) => {
  return /^data:image\//.test(content) || /\.(png|jpe?g|webp|gif)$/i.test(content);
};

const normalizeMsgs = (list: unknown): Msg[] => {
  if (!Array.isArray(list)) return [];
  return list.map((raw: any) => {
    let f = raw?.from;
    if (f === 'me') f = 'staff';
    if (f === 'them') f = 'customer';
    if (f !== 'staff' && f !== 'customer') f = 'customer';
    return { ...raw, from: f } as Msg;
  });
};

const saveConvs = () => {
  try {
    localStorage.setItem(convListKey(), JSON.stringify(convs.value));
  } catch {
    /* ignore */
  }
};

const loadConvs = () => {
  try {
    const raw = localStorage.getItem(convListKey());
    if (!raw) return false;
    const list = JSON.parse(raw) as UConv[];
    if (!Array.isArray(list) || !list.length) return false;
    convs.value = list;
    return true;
  } catch {
    return false;
  }
};

const restoreLast = () => {
  try {
    const id = String(localStorage.getItem(lastSelKey()) || '').trim();
    if (!id) return;
    const c = convs.value.find((x) => x.id === id);
    if (c) selected.value = c;
  } catch {
    /* ignore */
  }
};

const upsertFromQuery = () => {
  const q = route.query || {};
  const orderNo = String(q.orderNo || '').trim();
  if (!orderNo) return;
  const peerName = String(q.peerName || q.photographerName || '工作人员').trim();
  const time = String(q.time || q.shootingDate || '').trim() || dayjs().format('YYYY-MM-DD');
  const id = orderThreadId(orderNo);
  let ex = convs.value.find((c) => c.id === id);
  if (!ex) {
    ex = {
      id,
      peerName,
      last: '开始与工作人员沟通',
      unread: 0,
      orderNo,
      time,
    };
    convs.value.unshift(ex);
  } else {
    ex.peerName = peerName || ex.peerName;
    ex.time = time || ex.time;
  }
  selected.value = ex;
  try {
    localStorage.setItem(lastSelKey(), id);
  } catch {
    /* ignore */
  }
  saveConvs();
};

const loadMessages = (c: UConv) => {
  const raw = localStorage.getItem(threadStorageKey(c.id));
  const list = raw ? JSON.parse(raw) : [];
  messages.value = normalizeMsgs(list);
  nextTick(() => scrollToBottom());
};

const scrollToBottom = () => {
  const el = msgsRef.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
};

const persist = () => {
  if (!selected.value) return;
  localStorage.setItem(threadStorageKey(selected.value.id), JSON.stringify(messages.value));
};

const select = (c: UConv) => {
  selected.value = c;
  loadMessages(c);
  try {
    localStorage.setItem(lastSelKey(), c.id);
  } catch {
    /* ignore */
  }
};

const sendText = () => {
  if (!selected.value) return;
  const text = draft.value.trim();
  if (!text) return;
  messages.value.push({
    id: String(Date.now()),
    from: 'customer',
    content: text,
    at: dayjs().format('MM-DD HH:mm'),
  });
  draft.value = '';
  persist();
  const idx = convs.value.findIndex((x) => x.id === selected.value?.id);
  if (idx >= 0) convs.value[idx].last = text;
  saveConvs();
  nextTick(() => scrollToBottom());
};

const sendQuick = (t: string) => {
  draft.value = t;
  sendText();
};

const onEnter = (evt: KeyboardEvent) => {
  if (evt.shiftKey) return;
  evt.preventDefault();
  sendText();
};

const sendImage: UploadProps['customRequest'] = async (options) => {
  if (!selected.value) {
    message.warning('请先选择会话');
    return;
  }
  const raw = options.file as File;
  const reader = new FileReader();
  reader.onload = () => {
    const url = String(reader.result || '');
    if (!url) return;
    messages.value.push({
      id: String(Date.now()),
      from: 'customer',
      content: url,
      at: dayjs().format('MM-DD HH:mm'),
    });
    persist();
    const idx = convs.value.findIndex((x) => x.id === selected.value?.id);
    if (idx >= 0) convs.value[idx].last = '[图片]';
    saveConvs();
    options.onSuccess?.(url);
    message.success('已发送');
    nextTick(() => scrollToBottom());
  };
  reader.onerror = () => options.onError?.(new Error('读取失败'));
  reader.readAsDataURL(raw);
};

const bootstrap = () => {
  if (!loadConvs()) convs.value = [];
  upsertFromQuery();
  restoreLast();
  if (selected.value) loadMessages(selected.value);
};

onMounted(() => {
  authStore.initializeAuth();
  bootstrap();
});

watch(
  () => route.query.orderNo,
  () => {
    upsertFromQuery();
    if (selected.value) loadMessages(selected.value);
  }
);
</script>

<style scoped lang="less">
.user-chat-page {
  --pink: #ff6b8b;
  --r: 12px;
  --chat-height: 700px;
  min-height: calc(100vh - 72px);
  background: linear-gradient(180deg, #fff5f7 0%, #ffffff 45%);
  max-width: 1400px;
  margin: 0 auto;
  padding: 28px 20px 32px;
}
.head {
  margin-bottom: 18px;
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
  line-height: 1.5;
}
.grid {
  display: grid;
  grid-template-columns: 300px 1fr 280px;
  gap: 16px;
  align-items: start;
  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
}
.panel {
  background: #fff;
  border: 1px solid rgba(17, 24, 39, 0.16);
  border-radius: var(--r);
  box-shadow: 0 10px 26px rgba(17, 24, 39, 0.05);
}
.list {
  padding: 12px;
  height: var(--chat-height);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.list-head {
  margin-bottom: 10px;
}
.pill-input :deep(.ant-input-affix-wrapper) {
  border-radius: 999px !important;
}
.conv-filters {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-pill {
  border: 1px solid rgba(255, 107, 139, 0.2);
  background: rgba(255, 107, 139, 0.06);
  color: #d6336c;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}
.filter-pill:hover {
  background: rgba(255, 107, 139, 0.1);
}
.filter-pill.active {
  background: linear-gradient(135deg, #ff6b8b 0%, #ff9bb4 100%);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 6px 14px rgba(255, 107, 139, 0.24);
}
.conv {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.faq-list {
  display: grid;
  gap: 10px;
}
.faq-panel {
  padding: 12px;
}
.faq-panel .panel-h {
  margin-bottom: 10px;
}
.faq-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--r);
  border: 1px solid rgba(255, 107, 139, 0.18);
  background: rgba(255, 107, 139, 0.06);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}
.faq-item:hover {
  background: rgba(255, 107, 139, 0.1);
  border-color: rgba(255, 107, 139, 0.26);
}
.faq-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 107, 139, 0.22);
}
.faq-item .i {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 107, 139, 0.18);
  background: rgba(255, 107, 139, 0.08);
}
.faq-item .t {
  font-weight: 800;
  color: #374151;
}

.faq-detail-title {
  font-weight: 900;
  color: #111827;
  margin-bottom: 10px;
}
.faq-detail-body {
  color: #4b5563;
  line-height: 1.75;
  font-size: 14px;
}
.conv-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: var(--r);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.conv-item:hover {
  background: rgba(255, 107, 139, 0.06);
}
.conv-item.active {
  background: linear-gradient(135deg, rgba(255, 107, 139, 0.12) 0%, rgba(255, 155, 180, 0.08) 100%);
  border-color: rgba(255, 107, 139, 0.25);
}
.meta {
  min-width: 0;
  flex: 1;
}
.row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.name {
  font-weight: 900;
  color: #111827;
}
.badge {
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  background: #ff4d4f;
  border-radius: 999px;
  padding: 2px 8px;
}
.row2 {
  margin-top: 2px;
  color: #9ca3af;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chat {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: var(--chat-height);
  min-height: var(--chat-height);
}
.chat-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(17, 24, 39, 0.16);
}
.chat-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
}
.msgs {
  flex: 1;
  padding: 14px;
  overflow: auto;
  background: linear-gradient(180deg, #fff5f7 0%, #fff 40%);
  min-height: 0;
}
.msg {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 12px;
}
.msg.mine {
  align-items: flex-end;
}
.bubble {
  max-width: 78%;
  padding: 10px 12px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(17, 24, 39, 0.08);
  word-break: break-word;
}
.msg.mine .bubble {
  background: linear-gradient(135deg, rgba(255, 107, 139, 0.18) 0%, rgba(255, 155, 180, 0.14) 100%);
  border-color: rgba(255, 107, 139, 0.25);
}
.bubble img {
  max-width: 220px;
  border-radius: 10px;
  display: block;
}
.ts {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
}
.composer {
  padding: 12px 14px;
  border-top: 1px solid rgba(17, 24, 39, 0.16);
  display: flex;
  gap: 10px;
  align-items: flex-end;
}
.pill {
  border-radius: 999px;
  background: var(--pink);
  border-color: var(--pink);
}
.pill.ghost {
  background: rgba(255, 107, 139, 0.1);
  border-color: rgba(255, 107, 139, 0.2);
  color: #d6336c;
}
.info-panel {
  padding: 12px;
}
.faq-panel {
  margin-top: 16px;
}
.quick-panel {
  margin-top: 16px;
  padding: 12px;
}
.quick-list {
  display: grid;
  gap: 10px;
}
.quick-btn {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  text-align: left;
}
.quick-text {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.panel-h {
  margin-bottom: 10px;
}
.panel-title {
  font-weight: 900;
  color: #111827;
}
.info .kv {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(17, 24, 39, 0.18);
  font-size: 14px;
}
.k {
  color: #6b7280;
}
.v {
  color: #111827;
  text-align: right;
}
.empty {
  color: #9ca3af;
  font-size: 13px;
}
</style>
