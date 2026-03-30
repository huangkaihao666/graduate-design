<template>
  <div class="page">
    <div class="grid">
      <section class="panel list">
        <div class="list-head">
          <a-input-search
            v-model:value="kw"
            allow-clear
            placeholder="搜索客户"
            class="pill-input"
          />
        </div>
        <div class="conv">
          <div
            v-for="c in filteredConvs"
            :key="c.id"
            class="conv-item"
            :class="{ active: selected?.id === c.id }"
            @click="select(c)"
          >
            <a-avatar :size="38">{{ (c.name || '客').slice(0, 1) }}</a-avatar>
            <div class="meta">
              <div class="row1">
                <span class="name">{{ c.name }}</span>
                <span class="row1-right">
                  <span v-if="c.unread" class="badge">{{ c.unread }}</span>
                  <a-button type="text" size="small" class="del-btn" @click.stop="removeConv(c)">
                    删除
                  </a-button>
                </span>
              </div>
              <div class="row2" :style="convPreviewStyle(c.last)">{{ c.last }}</div>
            </div>
          </div>
          <a-empty v-if="!filteredConvs.length" description="暂无会话（本地演示）" />
        </div>
      </section>

      <section class="panel chat">
        <div class="chat-head">
          <div class="chat-title">
            <a-avatar :size="30">{{ selected?.name?.slice(0, 1) || 'C' }}</a-avatar>
            <strong>{{ selected?.name || '请选择会话' }}</strong>
          </div>
          <a-space>
            <a-upload :show-upload-list="false" :custom-request="sendImage">
              <a-button class="pill ghost" size="small">发送图片</a-button>
            </a-upload>
            <a-button class="pill ghost" size="small" @click="markRead">标为已读</a-button>
          </a-space>
        </div>

        <div ref="msgsRef" class="msgs">
          <div v-for="m in messages" :key="m.id" class="msg" :class="{ mine: m.from === 'staff' }">
            <div class="bubble" :style="bubbleStyleForContent(m.content)">
              <template v-if="isImage(m.content)">
                <img :src="m.content" alt="图片" />
              </template>
              <template v-else>
                {{ m.content }}
              </template>
            </div>
            <div class="ts">{{ m.at }}</div>
          </div>
          <a-empty v-if="!messages.length" description="暂无消息" />
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
        <div class="panel">
          <div class="panel-h"><div class="panel-title">客户信息卡片</div></div>
          <div v-if="selected" class="info">
            <div class="kv">
              <span class="k">姓名</span><span class="v">{{ selected.name }}</span>
            </div>
            <div class="kv">
              <span class="k">电话</span><span class="v">{{ selected.phone }}</span>
            </div>
            <div class="kv">
              <span class="k">订单号</span><span class="v">{{ selected.orderNo }}</span>
            </div>
            <div class="kv">
              <span class="k">拍摄时间</span><span class="v">{{ selected.time }}</span>
            </div>
          </div>
          <div v-else class="empty">请选择会话</div>
        </div>

        <div class="panel">
          <div class="panel-h"><div class="panel-title">快捷回复</div></div>
          <div class="quick">
            <a-button
              v-for="(t, idx) in quickReplies"
              :key="idx"
              class="pill ghost quick-btn"
              :title="t"
              @click="sendQuick(t)"
            >
              {{ t }}
            </a-button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { httpClient } from '@/api/client';
import { useAuthStore } from '@/store/auth';
import {
  isOrderThreadId,
  orderNoFromThreadId,
  orderThreadId,
  previewLastMessageFromOrderStorage,
  sharedOrderMessagesKeyPrefixV2,
  sharedOrderMessagesStorageKey,
} from '@/utils/orderChatStorage';
import { unwrapOrderListPayload } from '@/utils/workerOrders';
import type { UploadProps } from 'ant-design-vue';
import { message, Modal } from 'ant-design-vue';
import dayjs from 'dayjs';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';

type Conv = {
  id: string;
  name: string;
  last: string;
  unread: number;
  phone: string;
  orderNo: string;
  time: string;
  /** 本店摄影师档案 id，与 users.workerPhotographerId 一致，用于隔离消息存储 */
  photographerId?: number;
  /** 列表已同步到的最后一条消息 id，用于客户新消息时累加未读 */
  listTailMsgId?: string;
};
/** staff=工作人员，customer=用户；与 /user/chat 共用订单会话存储 */
type Msg = { id: string; from: 'staff' | 'customer'; content: string; at: string };

const kw = ref('');
const convs = ref<Conv[]>([]);
const selected = ref<Conv | null>(null);
const messages = ref<Msg[]>([]);
const draft = ref('');
const msgsRef = ref<HTMLElement | null>(null);

const quickReplies = [
  '已确认档期，我们按约定时间见哦～',
  '拍摄前注意事项：早点休息、补水、准备浅色内衣～',
  '当天建议提前 20 分钟到达，我们会协助更衣与补妆。',
  '如果需要改期，请尽早告知我，我来帮你协调档期～',
];

const authStore = useAuthStore();
const route = useRoute();
const uid = () => authStore.user?.id ?? 'guest';

/** 订单号 → 客户姓名（来自工作台订单接口） */
const orderCustomerNameByNo = ref<Record<string, string>>({});

const customerDisplayName = (orderNo: string) => {
  const no = String(orderNo || '').trim();
  const hit = orderCustomerNameByNo.value[no];
  return hit ? hit.trim() : '客户';
};

/** 左侧预览：按字数决定行数，视觉上有“长短”变化 */
const convPreviewStyle = (last: string) => {
  const n = [...String(last || '')].length;
  const lines = n <= 12 ? 1 : n <= 36 ? 2 : 3;
  return {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical' as const,
    WebkitLineClamp: lines,
    overflow: 'hidden',
    wordBreak: 'break-word' as const,
    whiteSpace: 'normal',
    lineHeight: '1.45',
    minHeight: `${lines * 1.45}em`,
  };
};

async function refreshOrderCustomerNames() {
  if (!authStore.accessToken) return;
  try {
    const res: unknown = await httpClient.get('/orders/worker');
    const list = unwrapOrderListPayload(res as any);
    const next: Record<string, string> = {};
    for (const o of Array.isArray(list) ? list : []) {
      const no = String((o as any)?.orderNo || '').trim();
      const nm = String((o as any)?.contactName || '').trim();
      if (no && nm) next[no] = nm;
    }
    orderCustomerNameByNo.value = next;
  } catch {
    /* ignore */
  }
}

function applyCustomerNamesToConversations() {
  const map = orderCustomerNameByNo.value;
  let changed = false;
  for (const c of convs.value) {
    if (!isOrderThreadId(c.id)) continue;
    const nm = map[c.orderNo];
    if (nm && c.name !== nm) {
      c.name = nm;
      changed = true;
    }
  }
  if (changed) saveConvs();
}

const workerPhotographerPk = () => Number(authStore.user?.workerPhotographerId || 0);

/** 订单会话按摄影师档案 id 分桶，避免多名摄影师共用同一 localStorage 键 */
const threadKeyForConv = (c: Conv) => {
  if (isOrderThreadId(c.id)) {
    const orderNo = orderNoFromThreadId(c.id);
    const pid = Number(c.photographerId || workerPhotographerPk());
    return sharedOrderMessagesStorageKey(orderNo, pid > 0 ? pid : undefined);
  }
  return `worker_${uid()}_msg_thread_${c.id}`;
};
const convListKey = () => `worker_${uid()}_convs_v1`;
const lastSelectedKey = () => `worker_${uid()}_last_conv_id`;

const filteredConvs = computed(() => {
  const q = kw.value.trim().toLowerCase();
  if (!q) return convs.value;
  return convs.value.filter((c) =>
    String(c.name || '')
      .toLowerCase()
      .includes(q)
  );
});

const isImage = (content: string) => {
  return /^data:image\//.test(content) || /\.(png|jpe?g|webp|gif)$/i.test(content);
};

/** 图片气泡单独限宽；文本由 .bubble 的 max-width + fit-content 控制，避免 ch 单位把中文短句挤成两行 */
const bubbleStyleForContent = (content: string) => {
  const c = String(content || '');
  if (isImage(c)) {
    return { maxWidth: 'min(85%, 260px)' };
  }
  return {};
};

const loadSeedConvs = () => {
  // 本地演示：生成一些会话（非订单 id，仅本端演示线程）
  convs.value = [
    {
      id: 'c1',
      name: '小米',
      last: '老师我想要韩系清透风～',
      unread: 2,
      phone: '138****1234',
      orderNo: 'A20260325',
      time: '2026-04-12',
    },
    {
      id: 'c2',
      name: '小雨',
      last: '档期可以改到下周吗',
      unread: 0,
      phone: '139****8899',
      orderNo: 'A20260318',
      time: '2026-04-19',
    },
    {
      id: 'c3',
      name: '阿宁',
      last: '收到，谢谢老师～',
      unread: 1,
      phone: '137****0077',
      orderNo: 'A20260228',
      time: '2026-05-01',
    },
  ];
  if (!selected.value) selected.value = convs.value[0] ?? null;
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

/** 打开会话并加载消息后：对齐尾部 id、清零未读 */
const acknowledgeWorkerPeek = (c: Conv | null | undefined) => {
  if (!c) return;
  const idx = convs.value.findIndex((x) => x.id === c.id);
  if (idx < 0) return;
  const tailId = messages.value[messages.value.length - 1]?.id;
  if (tailId != null && String(tailId)) convs.value[idx].listTailMsgId = String(tailId);
  convs.value[idx].unread = 0;
  saveConvs();
};

/** 只扫描当前绑定摄影师的 v2 键，不会把其他摄影师的会话拉进来 */
const discoverSharedOrderChats = () => {
  const myPid = workerPhotographerPk();
  if (!myPid) return;

  const prefix = sharedOrderMessagesKeyPrefixV2(myPid);
  const additions: Conv[] = [];
  let changed = false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const orderNo = key.slice(prefix.length).trim();
      if (!orderNo) continue;
      const id = orderThreadId(orderNo);
      const raw = localStorage.getItem(key);
      const last = previewLastMessageFromOrderStorage(raw, '用户已留言，请点击查看');
      let msgs: Msg[] = [];
      try {
        msgs = normalizeMsgs(raw ? JSON.parse(raw) : []);
      } catch {
        continue;
      }
      const lastMsg = msgs[msgs.length - 1];
      const tailId = lastMsg?.id != null ? String(lastMsg.id) : '';

      const idx = convs.value.findIndex((c) => c.id === id);
      if (idx >= 0) {
        const row = convs.value[idx];
        if (!row.photographerId) {
          row.photographerId = myPid;
          changed = true;
        }
        if (row.last !== last) {
          row.last = last;
          changed = true;
        }
        if (!tailId) continue;

        if (row.listTailMsgId === undefined) {
          if (lastMsg?.from === 'customer' && selected.value?.id !== row.id) {
            row.unread = Math.max(row.unread || 0, 1);
            changed = true;
          }
          row.listTailMsgId = tailId;
          changed = true;
          continue;
        }

        if (
          tailId !== row.listTailMsgId &&
          lastMsg?.from === 'customer' &&
          selected.value?.id !== row.id
        ) {
          row.unread = (row.unread || 0) + 1;
          changed = true;
        }
        continue;
      }

      additions.push({
        id,
        name: customerDisplayName(orderNo),
        last,
        unread: lastMsg?.from === 'customer' ? 1 : 0,
        phone: '-',
        orderNo,
        time: dayjs().format('YYYY-MM-DD'),
        photographerId: myPid,
      });
    }
  } catch {
    /* ignore */
  }
  if (additions.length) {
    convs.value = [...additions, ...convs.value];
    changed = true;
  }
  if (changed) {
    applyCustomerNamesToConversations();
    saveConvs();
  }
};

/** 从服务器拉过列表后，给历史订单会话补上 photographerId，读写键与 v2 一致 */
const ensureOrderConvsPhotographerId = () => {
  const myPid = workerPhotographerPk();
  if (!myPid) return;
  let changed = false;
  for (const c of convs.value) {
    if (isOrderThreadId(c.id) && !c.photographerId) {
      c.photographerId = myPid;
      changed = true;
    }
  }
  if (changed) saveConvs();
};

const loadConvs = () => {
  try {
    const raw = localStorage.getItem(convListKey());
    if (!raw) return false;
    const list = JSON.parse(raw) as Conv[];
    if (!Array.isArray(list) || !list.length) return false;
    convs.value = list;
    return true;
  } catch {
    return false;
  }
};

const restoreLastSelected = () => {
  try {
    const id = String(localStorage.getItem(lastSelectedKey()) || '').trim();
    if (!id) return;
    const c = convs.value.find((x) => x.id === id);
    if (c) selected.value = c;
  } catch {
    /* ignore */
  }
};

const upsertConvFromOrder = () => {
  const q = route.query || {};
  const name = String(q.name || '').trim();
  const phone = String(q.phone || '').trim();
  const orderNo = String(q.orderNo || '').trim();
  if (!orderNo) return;

  const myPid = workerPhotographerPk();
  const id = `order_${orderNo}`;
  const existing = convs.value.find((c) => c.id === id);
  if (!existing) {
    convs.value.unshift({
      id,
      name: name || customerDisplayName(orderNo),
      last: '点击这里开始与客户沟通…',
      unread: 0,
      phone: phone || '-',
      orderNo,
      time: dayjs().format('YYYY-MM-DD'),
      photographerId: myPid > 0 ? myPid : undefined,
    });
  } else {
    // 同步最新的展示信息（避免订单页改了客户名/手机号后不一致）
    existing.name = (name || '').trim() || customerDisplayName(orderNo) || existing.name;
    existing.phone = phone || existing.phone;
    existing.orderNo = orderNo || existing.orderNo;
    if (myPid > 0) existing.photographerId = myPid;
  }

  selected.value = convs.value.find((c) => c.id === id) || selected.value;
  if (selected.value?.id === id) selected.value.unread = 0;
  saveConvs();
  try {
    localStorage.setItem(lastSelectedKey(), id);
  } catch {
    /* ignore */
  }
};

const loadMessages = (c: Conv) => {
  const raw = localStorage.getItem(threadKeyForConv(c));
  const list = raw ? (JSON.parse(raw) as Msg[]) : [];
  messages.value = normalizeMsgs(list);
  if (!messages.value.length) {
    // 订单会话：与用户端共用存储，不自动写演示文案，避免两端不一致
    if (isOrderThreadId(c.id)) {
      return;
    }
    messages.value = [
      {
        id: 'm1',
        from: 'customer',
        content: '老师你好～我想了解一下拍摄风格',
        at: dayjs().subtract(1, 'day').format('MM-DD HH:mm'),
      },
      {
        id: 'm2',
        from: 'staff',
        content: '好的～你更喜欢清透韩系还是复古胶片感呢？',
        at: dayjs().subtract(1, 'day').add(5, 'minute').format('MM-DD HH:mm'),
      },
    ];
    persist();
  }
  nextTick(() => scrollToBottom());
};

const scrollToBottom = () => {
  const el = msgsRef.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
};

const persist = () => {
  if (!selected.value) return;
  localStorage.setItem(threadKeyForConv(selected.value), JSON.stringify(messages.value));
};

const select = (c: Conv) => {
  selected.value = c;
  loadMessages(c);
  acknowledgeWorkerPeek(c);
  try {
    localStorage.setItem(lastSelectedKey(), c.id);
  } catch {
    /* ignore */
  }
};

const markRead = () => {
  if (!selected.value) return;
  acknowledgeWorkerPeek(selected.value);
  message.success('已标为已读');
};

const removeConv = (c: Conv) => {
  Modal.confirm({
    class: 'worker-confirm-modal',
    title: '确认删除该会话？',
    content: '删除后将同时清空该会话的本地聊天记录，且不可恢复。',
    okText: '确认删除',
    cancelText: '取消',
    okType: 'danger',
    onOk: () => {
      const id = c.id;
      const idx = convs.value.findIndex((x) => x.id === id);
      if (idx === -1) return;

      convs.value.splice(idx, 1);
      try {
        localStorage.removeItem(threadKeyForConv(c));
      } catch {
        /* ignore */
      }

      if (selected.value?.id === id) {
        selected.value = convs.value[0] || null;
        if (selected.value) {
          loadMessages(selected.value);
          acknowledgeWorkerPeek(selected.value);
          try {
            localStorage.setItem(lastSelectedKey(), selected.value.id);
          } catch {
            /* ignore */
          }
        } else {
          messages.value = [];
          try {
            localStorage.removeItem(lastSelectedKey());
          } catch {
            /* ignore */
          }
        }
      }
      saveConvs();
      message.success('会话已删除');
    },
  });
};

const sendText = () => {
  if (!selected.value) return;
  const text = draft.value.trim();
  if (!text) return;
  const mid = String(Date.now());
  messages.value.push({
    id: mid,
    from: 'staff',
    content: text,
    at: dayjs().format('MM-DD HH:mm'),
  });
  draft.value = '';
  persist();
  const idx = convs.value.findIndex((x) => x.id === selected.value?.id);
  if (idx >= 0) {
    convs.value[idx].last = text;
    convs.value[idx].listTailMsgId = mid;
  }
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
    const mid = String(Date.now());
    messages.value.push({
      id: mid,
      from: 'staff',
      content: url,
      at: dayjs().format('MM-DD HH:mm'),
    });
    persist();
    const idx = convs.value.findIndex((x) => x.id === selected.value?.id);
    if (idx >= 0) {
      convs.value[idx].last = '[图片]';
      convs.value[idx].listTailMsgId = mid;
    }
    saveConvs();
    options.onSuccess?.(url);
    message.success('图片已发送（本地演示）');
    nextTick(() => scrollToBottom());
  };
  reader.onerror = () => options.onError?.(new Error('读取图片失败'));
  reader.readAsDataURL(raw);
};

/** 用户在同浏览器另一标签发消息后，本页可收到 storage 事件并补全会话列表 */
const onStorage = (e: StorageEvent) => {
  const myPid = workerPhotographerPk();
  if (!myPid || !e.key?.startsWith(sharedOrderMessagesKeyPrefixV2(myPid))) return;
  discoverSharedOrderChats();
  if (selected.value && isOrderThreadId(selected.value.id)) {
    loadMessages(selected.value);
    acknowledgeWorkerPeek(selected.value);
  }
};

onMounted(async () => {
  authStore.initializeAuth();
  if (authStore.accessToken) {
    try {
      await authStore.getProfile();
    } catch {
      /* ignore */
    }
  }
  const loaded = loadConvs();
  if (!loaded) loadSeedConvs();
  ensureOrderConvsPhotographerId();
  await refreshOrderCustomerNames();
  applyCustomerNamesToConversations();
  discoverSharedOrderChats();
  upsertConvFromOrder();
  applyCustomerNamesToConversations();
  restoreLastSelected();
  if (selected.value) {
    loadMessages(selected.value);
    acknowledgeWorkerPeek(selected.value);
  }
  window.addEventListener('storage', onStorage);
});

onUnmounted(() => {
  window.removeEventListener('storage', onStorage);
});
</script>

<style scoped lang="less">
.page {
  --pink: #ff6b8b;
  --r: 12px;
  // 固定为“可视高度”，避免消息撑高整页
  height: calc(100vh - 64px - 18px - 28px);
  display: flex;
  flex-direction: column;
  min-height: 0;
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
  grid-template-columns: 320px 1fr 320px;
  gap: 16px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
}

.panel {
  background: #fff;
  border: 1px solid rgba(17, 24, 39, 0.08);
  border-radius: var(--r);
  box-shadow: 0 10px 26px rgba(17, 24, 39, 0.05);
}

.list {
  padding: 12px;
  min-height: 0;
  overflow: hidden;
}
.list-head {
  margin-bottom: 10px;
}
.pill-input :deep(.ant-input-affix-wrapper) {
  border-radius: 999px !important;
}
.conv {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow: auto;
}
.conv-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: var(--r);
  border: 1px solid rgba(17, 24, 39, 0.12);
  background: #fff;
  box-shadow: 0 4px 12px rgba(17, 24, 39, 0.04);
  cursor: pointer;
  transition: all 0.2s ease;
}
.conv-item:hover {
  background: rgba(255, 107, 139, 0.05);
  border-color: rgba(255, 107, 139, 0.28);
  box-shadow: 0 6px 14px rgba(255, 107, 139, 0.1);
}
.conv-item.active {
  background: linear-gradient(135deg, rgba(255, 107, 139, 0.12) 0%, rgba(255, 155, 180, 0.08) 100%);
  border-color: rgba(255, 107, 139, 0.38);
  box-shadow: 0 8px 16px rgba(255, 107, 139, 0.12);
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
.row1-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
.del-btn {
  color: #be123c;
  padding: 0 6px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
}
.del-btn:hover {
  color: #9f1239;
}
.conv-item:hover .del-btn,
.conv-item.active .del-btn {
  opacity: 1;
  pointer-events: auto;
}
.row2 {
  margin-top: 2px;
  color: #9ca3af;
  font-size: 12px;
}

.chat {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.chat-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(17, 24, 39, 0.08);
  background: rgba(255, 107, 139, 0.03);
}
.chat-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #111827;
}

.msgs {
  flex: 1;
  padding: 14px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: linear-gradient(180deg, rgba(255, 245, 247, 0.35) 0%, rgba(255, 255, 255, 1) 45%);
  min-height: 0;
}
.msg {
  max-width: 85%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.msg.mine {
  margin-left: auto;
  align-items: flex-end;
  text-align: right;
}
.bubble {
  background: #f3f4f6;
  border-radius: 10px;
  padding: 6px 11px;
  white-space: pre-wrap;
  line-height: 1.45;
  color: #111827;
  /* 宽度相对 .msg：.msg 已 max-width:85%，这里再用 85% 会叠乘变窄，短中文易被挤成两行 */
  width: max-content;
  max-width: min(100%, 560px);
  flex-shrink: 0;
  overflow-wrap: break-word;
  word-break: normal;
  box-sizing: border-box;
}
.msg.mine .bubble {
  background: linear-gradient(135deg, #ff6b8b 0%, #ff9bb4 100%);
  color: #fff;
}
.bubble img {
  max-width: 240px;
  border-radius: 10px;
  display: block;
}
.ts {
  margin-top: 2px;
  font-size: 11px;
  color: #9ca3af;
}
.composer {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid rgba(17, 24, 39, 0.08);
  align-items: flex-end;
}

.right .panel {
  padding: 14px;
  margin-bottom: 14px;
}
.right {
  min-height: 0;
  overflow: auto;
}
.panel-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  padding: 9px 0;
  border-bottom: 1px dashed rgba(17, 24, 39, 0.1);
}
.info .kv:last-child {
  border-bottom: none;
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
}
.quick {
  display: grid;
  gap: 10px;
}
.quick-btn {
  width: 100%;
  max-width: none;
  display: inline-flex;
  justify-content: flex-start;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
</style>
