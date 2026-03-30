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
            <a-popconfirm
              title="删除该会话？"
              ok-text="删除"
              cancel-text="取消"
              ok-type="danger"
              placement="left"
              @confirm="removeConv(c)"
            >
              <a-button type="text" danger size="small" class="conv-del-btn" @click.stop>
                删除
              </a-button>
            </a-popconfirm>
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
              <span class="k">拍摄日期</span><span class="v">{{ sessionShootingDateDisplay }}</span>
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
  forEachSharedOrderMessageStorageKey,
  isOrderThreadId,
  orderNoFromThreadId,
  orderThreadId,
  previewLastMessageFromOrderStorage,
  sharedOrderMessagesStorageKey,
} from '@/utils/orderChatStorage';
import type { UploadProps } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import dayjs from 'dayjs';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

type UConv = {
  id: string;
  peerName: string;
  last: string;
  unread: number;
  orderNo: string;
  time: string;
  /** 本店摄影师档案 id，用于隔离不同摄影师的订单会话存储 */
  photographerId?: number;
  /** 左侧列表已同步到的最后一条消息 id，用于摄影师新消息时累加未读 */
  listTailMsgId?: string;
};
type Msg = { id: string; from: 'staff' | 'customer'; content: string; at: string };

/** 与「我的订单」本地存储一致，用于补全会话里的拍摄日 */
const ORDER_HISTORY_STORAGE_KEY = 'online-order-history';

function isFullYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '').trim());
}

/** 将路由参数、订单字段等统一为 YYYY-MM-DD；无法识别时返回原字符串便于后续从订单补全 */
function normalizeShootingDate(raw: unknown): string {
  if (raw == null || raw === '') return '';
  const first = Array.isArray(raw) ? raw[0] : raw;
  const s = String(first).trim();
  if (!s) return '';
  const ymd = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (ymd) return ymd[1];
  const d = dayjs(s);
  if (d.isValid() && (s.includes('T') || s.includes('-') || s.length >= 8)) {
    return d.format('YYYY-MM-DD');
  }
  return s;
}

function shootingDateFromOrderHistory(orderNo: string): string | null {
  if (!orderNo) return null;
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_STORAGE_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw) as { orderNo?: string; shootingDate?: unknown }[];
    if (!Array.isArray(list)) return null;
    const o = list.find((x) => x.orderNo === orderNo);
    if (!o || o.shootingDate == null) return null;
    const n = normalizeShootingDate(o.shootingDate);
    return isFullYmd(n) ? n : null;
  } catch {
    return null;
  }
}

/** 列表里存的 time 不完整时，用订单本地记录写回并持久化 */
function patchConvShootingDateFromOrder(c: UConv): void {
  if (!c.orderNo) return;
  const cur = normalizeShootingDate(c.time);
  if (isFullYmd(cur)) return;
  const fromO = shootingDateFromOrderHistory(c.orderNo);
  if (!fromO) return;
  const idx = convs.value.findIndex((x) => x.id === c.id);
  if (idx < 0) return;
  convs.value[idx].time = fromO;
  if (selected.value?.id === c.id) selected.value = convs.value[idx];
  saveConvs();
}

const sessionShootingDateDisplay = computed(() => {
  const c = selected.value;
  if (!c) return '';
  let t = normalizeShootingDate(c.time);
  if (!isFullYmd(t) && c.orderNo) {
    const fromO = shootingDateFromOrderHistory(c.orderNo);
    if (fromO) t = fromO;
  }
  if (isFullYmd(t)) return t;
  return t || '—';
});

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
      '1）预约与沟通：下单或确认订单后，可在「消息中心」与摄影师/客服对齐拍摄风格、集合地点、档期与套餐包含项（服装套数、场景数量等）。建议提前说明身体不便、忌口道具等个性化需求。',
      '2）行前准备：按约定时间到达集合点或门店，携带身份证（如需）、合同或订单号；若含妆造，请预留化妆与试光时间，避免压缩正式拍摄时段。',
      '3）拍摄执行：摄影师会引导站位、表情与互动，也会根据光线与现场微调路线；若遇小雨、人流高峰等，会协商替代取景或短暂等待，请尽量配合现场安全提示。',
      '4）休息与补拍：长时间外景可安排短休、补水；若对某一组镜头不满意，可在当场提出补拍或调整，具体以现场时间与套餐约定为准。',
      '5）选片与交付：拍摄结束后进入选片与精修排期；成片交付方式（网盘/邮箱/线下拷贝）与周期以套餐及门店说明为准。',
    ],
  },
  {
    key: 'pick',
    label: '选片规则',
    icon: '✅',
    detail: [
      '1）预览与初筛：通常会先提供缩略图或小样供筛选「入选片」，再对入选照片做精修；每套套餐的「可选预览数量」「赠送精修张数」以套餐页与合同为准。',
      '2）加片与加修：超出套餐包含张数的部分，可按张计费加修；不同门店单价可能不同，选片前可向客服确认当前价目与是否含调色、磨皮、瘦身等范围。',
      '3）风格与备注：若希望统一成某种色调（如日系、胶片、电影感），请在选片时一次性备注清楚，避免精修中途反复大改导致周期延长。',
      '4）定稿与修改：精修初稿确认后，一般可在约定次数内提出局部修改（如肤色、构图微调）；超出次数或整体重调可能产生额外费用，以门店规则为准。',
      '5）底片与原片：是否赠送全部底片、原片格式与分辨率，以套餐说明为准；未包含的项目请勿自行商用传播，以免产生版权纠纷。',
    ],
  },
  {
    key: 'after',
    label: '售后政策',
    icon: '🛡️',
    detail: [
      '1）交付与验收：收到成片后请尽快下载并验收；若链接失效或文件损坏，请在交付说明中的期限内联系补发，逾期可能需重新申请导出。',
      '2）改期与取消：因天气、身体等原因需改期，请尽早通过消息或电话说明；距拍摄日较近的改期可能涉及档期占用费，具体以门店公示或合同为准。',
      '3）精修异议：对色调、胖瘦、瑕疵处理等有意见，请在「首次交付后的反馈窗口期」内集中提出，便于一次性返工；超时后再提出大范围重做可能无法免费支持。',
      '4）退款与争议：若因门店原因无法履约，按合同约定办理延期或退款；因个人原因临时取消，已发生成本（档期、化妆师、场地等）可能按规则扣除，建议下单前仔细阅读套餐须知。',
      '5）隐私与使用：门店与摄影师通常仅在宣传授权范围内使用样片；若您不同意公开展示，请在签约或拍摄前书面/消息中明确说明。',
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

const threadStorageKeyForConv = (c: UConv) => {
  if (isOrderThreadId(c.id)) {
    return sharedOrderMessagesStorageKey(c.orderNo, c.photographerId);
  }
  return `user_${uid()}_msg_thread_${c.id}`;
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

const storageKeyMatchesConv = (storageKey: string, c: UConv) => {
  const no = String(c.orderNo || orderNoFromThreadId(c.id) || '').trim();
  if (!no) return false;
  return (
    storageKey === threadStorageKeyForConv(c) ||
    storageKey === `shared_order_chat_${no}` ||
    storageKey.endsWith(`_${no}`)
  );
};

/** 从共用 localStorage 同步订单会话的最后预览与未读（摄影师在另一端发送后左侧可见） */
const syncSharedOrderConvsFromStorage = () => {
  let changed = false;
  const additions: UConv[] = [];

  forEachSharedOrderMessageStorageKey((info) => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(info.storageKey);
    } catch {
      return;
    }
    const lastPreview = previewLastMessageFromOrderStorage(raw);
    let msgs: Msg[] = [];
    try {
      msgs = normalizeMsgs(raw ? JSON.parse(raw) : []);
    } catch {
      return;
    }
    const lastMsg = msgs[msgs.length - 1];
    const tailId = lastMsg?.id != null ? String(lastMsg.id) : '';
    const id = orderThreadId(info.orderNo);

    const idx = convs.value.findIndex((c) => c.id === id);
    if (idx < 0) {
      additions.push({
        id,
        peerName: '工作人员',
        last: lastPreview,
        unread: lastMsg?.from === 'staff' ? 1 : 0,
        orderNo: info.orderNo,
        time: dayjs().format('YYYY-MM-DD'),
        photographerId: info.photographerId,
      });
      changed = true;
      return;
    }

    const row = convs.value[idx];
    if (info.photographerId && !row.photographerId) {
      row.photographerId = info.photographerId;
      changed = true;
    }
    if (row.last !== lastPreview) {
      row.last = lastPreview;
      changed = true;
    }

    if (!tailId) return;

    if (row.listTailMsgId === undefined) {
      if (lastMsg?.from === 'staff' && selected.value?.id !== row.id) {
        row.unread = Math.max(row.unread || 0, 1);
        changed = true;
      }
      row.listTailMsgId = tailId;
      changed = true;
      return;
    }

    if (
      tailId !== row.listTailMsgId &&
      lastMsg?.from === 'staff' &&
      selected.value?.id !== row.id
    ) {
      row.unread = (row.unread || 0) + 1;
      changed = true;
    }
  });

  if (additions.length) {
    convs.value = [...additions, ...convs.value];
    changed = true;
  }
  if (changed) saveConvs();
};

/** 进入会话或收到当前会话新消息时：对齐尾部 id 并清零未读 */
const acknowledgePeek = (c: UConv) => {
  const idx = convs.value.findIndex((x) => x.id === c.id);
  if (idx < 0) return;
  const tailId = messages.value[messages.value.length - 1]?.id;
  if (tailId != null && String(tailId)) convs.value[idx].listTailMsgId = String(tailId);
  convs.value[idx].unread = 0;
  saveConvs();
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
  let time = normalizeShootingDate(q.time ?? q.shootingDate);
  if (!isFullYmd(time)) {
    const fromO = shootingDateFromOrderHistory(orderNo);
    if (fromO) time = fromO;
  }
  /* 仍非完整日期（如仅「11」）则清空，避免写入错误片段；无日期时再默认当天 */
  if (!isFullYmd(time)) time = '';
  if (!time) time = dayjs().format('YYYY-MM-DD');
  const pidRaw = Number(q.photographerId ?? q.pid ?? 0);
  const photographerId = Number.isFinite(pidRaw) && pidRaw > 0 ? Math.floor(pidRaw) : undefined;
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
      photographerId,
    };
    convs.value.unshift(ex);
  } else {
    ex.peerName = peerName || ex.peerName;
    const merged = isFullYmd(time)
      ? time
      : shootingDateFromOrderHistory(orderNo) ||
        (isFullYmd(normalizeShootingDate(ex.time)) ? ex.time : '');
    ex.time = isFullYmd(merged) ? merged : ex.time;
    if (photographerId) ex.photographerId = photographerId;
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
  const raw = localStorage.getItem(threadStorageKeyForConv(c));
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
  localStorage.setItem(threadStorageKeyForConv(selected.value), JSON.stringify(messages.value));
};

const select = (c: UConv) => {
  patchConvShootingDateFromOrder(c);
  const fresh = convs.value.find((x) => x.id === c.id) || c;
  selected.value = fresh;
  loadMessages(fresh);
  acknowledgePeek(fresh);
  try {
    localStorage.setItem(lastSelKey(), fresh.id);
  } catch {
    /* ignore */
  }
};

/** 删除左侧会话：移除列表项并清空本地消息存储 */
const removeConv = (c: UConv) => {
  const key = threadStorageKeyForConv(c);
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  const idx = convs.value.findIndex((x) => x.id === c.id);
  if (idx >= 0) convs.value.splice(idx, 1);
  saveConvs();

  if (selected.value?.id === c.id) {
    const next = convs.value[0] ?? null;
    selected.value = next;
    messages.value = [];
    if (next) {
      loadMessages(next);
      acknowledgePeek(next);
      try {
        localStorage.setItem(lastSelKey(), next.id);
      } catch {
        /* ignore */
      }
    } else {
      try {
        localStorage.removeItem(lastSelKey());
      } catch {
        /* ignore */
      }
    }
  }
  message.success('已删除会话');
};

const sendText = () => {
  if (!selected.value) return;
  const text = draft.value.trim();
  if (!text) return;
  const mid = String(Date.now());
  messages.value.push({
    id: mid,
    from: 'customer',
    content: text,
    at: dayjs().format('MM-DD HH:mm'),
  });
  draft.value = '';
  persist();
  const idx = convs.value.findIndex((x) => x.id === selected.value?.id);
  if (idx >= 0) {
    convs.value[idx].last = text;
    convs.value[idx].listTailMsgId = mid;
    convs.value[idx].unread = 0;
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
      from: 'customer',
      content: url,
      at: dayjs().format('MM-DD HH:mm'),
    });
    persist();
    const idx = convs.value.findIndex((x) => x.id === selected.value?.id);
    if (idx >= 0) {
      convs.value[idx].last = '[图片]';
      convs.value[idx].listTailMsgId = mid;
      convs.value[idx].unread = 0;
    }
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
  syncSharedOrderConvsFromStorage();
  convs.value.forEach((c) => {
    if (c.orderNo) patchConvShootingDateFromOrder(c);
  });
  if (selected.value) {
    patchConvShootingDateFromOrder(selected.value);
    const cur = convs.value.find((x) => x.id === selected.value?.id) || selected.value;
    selected.value = cur;
    loadMessages(cur);
    acknowledgePeek(cur);
  }
};

const onStorage = (e: StorageEvent) => {
  if (!e.key || !e.key.startsWith('shared_order_chat_')) return;
  syncSharedOrderConvsFromStorage();
  if (selected.value && isOrderThreadId(selected.value.id)) {
    if (storageKeyMatchesConv(e.key, selected.value)) {
      loadMessages(selected.value);
      acknowledgePeek(selected.value);
    }
  }
};

onMounted(() => {
  authStore.initializeAuth();
  bootstrap();
  window.addEventListener('storage', onStorage);
});

onUnmounted(() => {
  window.removeEventListener('storage', onStorage);
});

watch(
  () => [route.query.orderNo, route.query.photographerId],
  () => {
    upsertFromQuery();
    syncSharedOrderConvsFromStorage();
    if (selected.value) {
      loadMessages(selected.value);
      acknowledgePeek(selected.value);
    }
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
  max-width: none;
  margin: 0;
  padding: 20px 40px 32px;

  @media (max-width: 768px) {
    padding: 16px 40px 24px;
  }
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
  padding: 10px 12px;
  border-radius: var(--r);
  border: 1px solid rgba(17, 24, 39, 0.1);
  background: #fff;
  box-shadow: 0 1px 3px rgba(17, 24, 39, 0.04);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}
.conv-item:hover {
  background: rgba(255, 107, 139, 0.06);
  border-color: rgba(255, 107, 139, 0.22);
  box-shadow: 0 4px 12px rgba(17, 24, 39, 0.06);
}
.conv-item.active {
  background: linear-gradient(135deg, rgba(255, 107, 139, 0.12) 0%, rgba(255, 155, 180, 0.08) 100%);
  border-color: rgba(255, 107, 139, 0.35);
  box-shadow: 0 4px 14px rgba(255, 107, 139, 0.14);
}

.conv-del-btn {
  flex-shrink: 0;
  font-size: 12px;
  padding: 0 4px;
  height: auto;
  line-height: 1.2;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.conv-item:hover .conv-del-btn,
.conv-item:focus-within .conv-del-btn {
  opacity: 1;
  pointer-events: auto;
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

/* 输入框聚焦：去掉默认蓝色，改为粉色 */
.composer :deep(.ant-input),
.composer :deep(.ant-input-affix-wrapper),
.composer :deep(.ant-input-textarea-affix-wrapper) {
  border-radius: 12px;
}

.composer :deep(.ant-input:focus),
.composer :deep(.ant-input-focused),
.composer :deep(.ant-input-affix-wrapper-focused),
.composer :deep(.ant-input-textarea-affix-wrapper-focused) {
  border-color: var(--pink) !important;
  box-shadow: none !important;
}

.composer :deep(.ant-input:hover),
.composer :deep(.ant-input-affix-wrapper:hover),
.composer :deep(.ant-input-textarea-affix-wrapper:hover) {
  border-color: var(--pink) !important;
}
.pill {
  border-radius: 999px;
  background: var(--pink);
  border-color: var(--pink);
}

/* 覆盖 Ant 默认蓝色 active/focus（仅消息页 pill 按钮） */
:deep(.pill.ant-btn-primary) {
  background: var(--pink);
  border-color: var(--pink);
}
:deep(.pill.ant-btn-primary:hover),
:deep(.pill.ant-btn-primary:focus) {
  background: #ff4d7a;
  border-color: #ff4d7a;
}
:deep(.pill.ant-btn-primary:active) {
  background: #be123c;
  border-color: #be123c;
}
:deep(.pill.ant-btn-primary:not(:disabled):focus-visible) {
  box-shadow: 0 0 0 3px rgba(255, 107, 139, 0.25);
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
  flex-shrink: 0;
  color: #6b7280;
}
.v {
  flex: 1;
  min-width: 0;
  color: #111827;
  text-align: right;
  white-space: normal;
  word-break: break-word;
}
.empty {
  color: #9ca3af;
  font-size: 13px;
}
</style>
