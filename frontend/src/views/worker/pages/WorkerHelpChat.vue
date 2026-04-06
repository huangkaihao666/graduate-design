<template>
  <div class="worker-help-chat-page">
    <div class="help-layout">
      <div class="chat-card">
        <div ref="messagesRef" class="chat-messages">
          <div v-if="messages.length === 0" class="empty-state">
            <div class="empty-icon">🤖</div>
            <div class="empty-title">你好，我是工作台智能助手</div>
            <div class="empty-tips">
              你可以这样问我：<br />
              - 接单后在哪里看订单详情？<br />
              - 固定合作妆造师怎么发起或解除？<br />
              - 档期/休息日在哪里设置？
            </div>
          </div>

          <div
            v-for="(item, index) in messages"
            :key="`${item.role}-${index}-${item.content.slice(0, 16)}`"
            class="msg-row"
            :class="item.role"
          >
            <div class="avatar">{{ item.role === 'user' ? '我' : 'AI' }}</div>
            <div class="bubble">{{ item.content }}</div>
          </div>

          <div v-if="loading" class="msg-row assistant">
            <div class="avatar">AI</div>
            <div class="bubble loading-bubble">正在思考中...</div>
          </div>
        </div>

        <div class="chat-actions">
          <a-input
            v-model:value="question"
            size="large"
            placeholder="请输入你的问题，例如：摄影师审核未通过要在哪里修改资料？"
            :maxlength="400"
            @press-enter="handleSend"
          />
          <a-button
            type="default"
            class="send-btn"
            size="large"
            :loading="loading"
            @click="handleSend"
          >
            发送
          </a-button>
          <a-button size="large" :disabled="loading || messages.length === 0" @click="handleClear">
            清空
          </a-button>
        </div>
      </div>

      <aside class="history-sidebar">
        <div class="sidebar-header">
          <button type="button" class="new-chat-btn" :disabled="loading" @click="startNewChat">
            <span class="new-chat-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M12 8v8M8 12h8"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            <span class="new-chat-label">开启新对话</span>
          </button>
        </div>

        <div class="sidebar-quick-questions" aria-label="常见快捷问题">
          <div class="quick-questions-label">常见快捷问题</div>
          <div class="quick-questions-chips">
            <button
              v-for="q in workerQuickQuestions"
              :key="q"
              type="button"
              class="quick-q-btn"
              :disabled="loading"
              @click="handleSend(q)"
            >
              {{ q }}
            </button>
          </div>
        </div>

        <div class="history-title">历史记录</div>
        <div v-if="!authStore.isAuthenticated" class="history-empty">登录后可查看历史记录</div>
        <div v-else-if="historyItems.length === 0" class="history-empty">暂无历史记录</div>
        <div v-else class="history-list">
          <template v-for="(group, idx) in groupedHistory" :key="idx">
            <div v-if="group.items.length" class="history-group">
              <div v-if="group.label" class="history-group-title">{{ group.label }}</div>
              <div
                v-for="item in group.items"
                :key="item.id"
                class="history-item-outer"
                @mouseenter="hoverHistoryId = item.id"
                @mouseleave="onHistoryRowLeave"
              >
                <div class="history-item" :class="{ active: selectedHistoryId === item.id }">
                  <div class="history-item-body" @click="openHistoryItem(item.id)">
                    <div class="history-question">{{ historyDisplayTitle(item) }}</div>
                    <div class="history-time">{{ formatTime(item.createdAt) }}</div>
                  </div>
                  <div
                    v-show="hoverHistoryId === item.id || menuOpenId === item.id"
                    class="history-item-actions"
                  >
                    <button
                      type="button"
                      class="history-more-btn"
                      aria-label="更多操作"
                      @click.stop="toggleHistoryMenu(item.id)"
                    >
                      <span class="history-more-dots" aria-hidden="true">⋯</span>
                    </button>
                    <div
                      v-if="menuOpenId === item.id"
                      class="history-dropdown"
                      role="menu"
                      @click.stop
                    >
                      <button type="button" class="history-dd-item" @click="openEditTitle(item)">
                        <span class="history-dd-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                            <path
                              d="M4 20h4l9.5-9.5a2 2 0 0 0-2.83-2.83L4 16.17V20zM18.5 5.5 19.5 4.5a2 2 0 0 0-2.83 0l-1.06 1.06 4.24 4.24 1.06-1.06a2 2 0 0 0 0-2.83z"
                              fill="currentColor"
                            />
                          </svg>
                        </span>
                        编辑标题
                      </button>
                      <button type="button" class="history-dd-item" @click="togglePinHistory(item)">
                        <span class="history-dd-icon" aria-hidden="true">
                          <svg
                            v-if="!item.isPinned"
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill="none"
                          >
                            <path
                              d="M12 4v12M8 8l4-4 4 4M5 20h14"
                              stroke="currentColor"
                              stroke-width="1.75"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                          <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none">
                            <path d="M12 2l4 6H8l4-6zM12 22l-4-6h8l-4 6z" fill="currentColor" />
                          </svg>
                        </span>
                        {{ item.isPinned ? '取消置顶' : '置顶' }}
                      </button>
                      <button
                        type="button"
                        class="history-dd-item danger"
                        @click="confirmDeleteHistory(item)"
                      >
                        <span class="history-dd-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                            <path
                              d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12zM10 11v6M14 11v6"
                              stroke="currentColor"
                              stroke-width="1.5"
                              stroke-linecap="round"
                            />
                          </svg>
                        </span>
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </aside>
    </div>

    <a-modal
      v-model:open="editTitleModalVisible"
      title="编辑标题"
      ok-text="保存"
      cancel-text="取消"
      :confirm-loading="editTitleSaving"
      destroy-on-close
      @ok="submitEditTitle"
    >
      <a-input v-model:value="editTitleValue" :maxlength="400" show-count placeholder="输入标题" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { aiApi, type CustomerSupportMessage } from '@/api/ai';
import { useAuthStore } from '@/store/auth';
import { message, Modal } from 'ant-design-vue';
import { computed, nextTick, onMounted, ref } from 'vue';

interface HistoryItem {
  id: number;
  question: string;
  answer: string;
  createdAt: string | number;
  title?: string | null;
  isPinned?: boolean;
  pinnedAt?: string | number;
}

/** 兼容 camelCase / snake_case / MySQL 小写列名 */
const pickCreatedAt = (item: Record<string, unknown>): string | number | undefined => {
  const v = item.createdAt ?? item.created_at ?? item.createdat ?? item['createdAt'];
  if (v == null) return undefined;
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (v instanceof Date) return v.getTime();
  return undefined;
};

const question = ref('');
const loading = ref(false);
const messages = ref<CustomerSupportMessage[]>([]);
const messagesRef = ref<HTMLElement | null>(null);
const authStore = useAuthStore();
const historyItems = ref<HistoryItem[]>([]);
/** 服务端返回的中国时区「今天/昨天」锚点，避免本机系统日期错误导致分组异常 */
const historyGrouping = ref<{ today: string; yesterday: string } | null>(null);
const selectedHistoryId = ref<number | null>(null);
const hoverHistoryId = ref<number | null>(null);
const menuOpenId = ref<number | null>(null);
const editTitleModalVisible = ref(false);
const editTitleValue = ref('');
const editingItemId = ref<number | null>(null);
const editTitleSaving = ref(false);

/** 与后端演示账号映射一致，用于快捷问题文案分流 */
const DEMO_PHOTO_EMAILS = new Set(['lin@qq.com', 'zhang@qq.com', 'chen@qq.com']);
const DEMO_MAKEUP_EMAILS = new Set(['hzs@qq.com', 'zhou@qq.com', 'yan@qq.com']);

const workerQuickQuestions = computed(() => {
  const email = String(authStore.user?.email || '')
    .trim()
    .toLowerCase();
  const k = String(authStore.user?.workerKind || '')
    .trim()
    .toLowerCase();
  const isPhoto = DEMO_PHOTO_EMAILS.has(email) || k === 'photographer';
  const isMakeup = DEMO_MAKEUP_EMAILS.has(email) || k === 'makeup';

  if (isPhoto) {
    return [
      '接单后在哪里查看订单详情和客户信息？',
      '档期与休息日在哪里设置？会怎么影响接单？',
      '个人中心如何提交审核资料并绑定固定合作妆造师？',
      '定制需求广场如何接单与沟通？',
      '审核未通过时提示的修改入口在哪里？',
    ];
  }
  if (isMakeup) {
    return [
      '妆造相关任务在订单里如何查看与确认？',
      '摄影师的固定合作邀请在哪里同意或拒绝？',
      '申请解除固定合作或处理对方解除申请的流程是什么？',
      '「妆容建议」页面如何上传照片识别并生成方案？',
      '个人中心资料审核未通过时如何修改后重新提交？',
    ];
  }
  return [
    '工作台订单列表和订单详情里能看到哪些信息？',
    '档期与休息日在哪里设置？',
    '个人中心档案审核与固定合作相关入口在哪里？',
    '消息中心一般会收到哪些通知？',
    '摄影师和妆造师在工作台的主要区别是什么？',
  ];
});

const scrollToBottom = async () => {
  await nextTick();
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
  }
};

/**
 * 解析后端返回的创建时间（ISO、时间戳、MySQL 风格 "YYYY-MM-DD HH:mm:ss" 等）
 */
const parseCreatedAt = (raw: string | number | Date | undefined | null): Date | null => {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }
  if (typeof raw === 'number') {
    const ms = raw < 1e12 ? raw * 1000 : raw;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(raw).trim();
  if (!s) return null;
  let d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    d = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      m[6] != null ? Number(m[6]) : 0
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const dm = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dm) {
    d = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

/** 中国时区日历日 YYYY-MM-DD，与列表时间展示、后端 grouping 一致 */
const formatYmdInShanghai = (d: Date): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (y && m && day) return `${y}-${m}-${day}`;
  return '';
};

const shanghaiYesterdayYmdFrom = (todayYmd: string): string => {
  const [y, mo, d] = todayYmd.split('-').map(Number);
  if (!y || !mo || !d) return '';
  const noon = new Date(
    `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00+08:00`
  );
  return formatYmdInShanghai(new Date(noon.getTime() - 86400000));
};

/** 用 Asia/Shanghai 日历日 + 服务端锚点（若有）分组 */
const getHistoryBucket = (
  createdAt: string | number | undefined
): 'today' | 'yesterday' | 'earlier' => {
  const itemDate = parseCreatedAt(createdAt);
  if (!itemDate) return 'earlier';

  const itemYmd = formatYmdInShanghai(itemDate);
  if (!itemYmd) return 'earlier';

  const todayYmd = historyGrouping.value?.today ?? formatYmdInShanghai(new Date());
  const yesterdayYmd = historyGrouping.value?.yesterday ?? shanghaiYesterdayYmdFrom(todayYmd);

  if (itemYmd === todayYmd) return 'today';
  if (itemYmd === yesterdayYmd) return 'yesterday';
  return 'earlier';
};

const formatTime = (time: string | number) => {
  const d = parseCreatedAt(time);
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};

const historyDisplayTitle = (item: HistoryItem) => {
  const t = item.title?.trim();
  if (t) return t;
  return item.question;
};

const groupedHistory = computed(() => {
  const today: HistoryItem[] = [];
  const yesterday: HistoryItem[] = [];
  const earlier: HistoryItem[] = [];

  const pinned = historyItems.value.filter((x) => x.isPinned);
  const unpinned = historyItems.value.filter((x) => !x.isPinned);

  /** 置顶：统一排在列表最上方，按置顶时间倒序（新置顶的在前） */
  const pinnedSorted = [...pinned].sort((a, b) => {
    const pa = parseCreatedAt(a.pinnedAt)?.getTime() ?? parseCreatedAt(a.createdAt)?.getTime() ?? 0;
    const pb = parseCreatedAt(b.pinnedAt)?.getTime() ?? parseCreatedAt(b.createdAt)?.getTime() ?? 0;
    return pb - pa;
  });

  const sortedUnpinned = [...unpinned].sort((a, b) => {
    const ta = parseCreatedAt(a.createdAt)?.getTime() ?? 0;
    const tb = parseCreatedAt(b.createdAt)?.getTime() ?? 0;
    return tb - ta;
  });

  for (const item of sortedUnpinned) {
    const bucket = getHistoryBucket(item.createdAt);
    if (bucket === 'today') today.push(item);
    else if (bucket === 'yesterday') yesterday.push(item);
    else earlier.push(item);
  }

  return [
    { label: '已置顶', items: pinnedSorted },
    { label: '', items: today },
    { label: '', items: yesterday },
    { label: '', items: earlier },
  ];
});

const startNewChat = () => {
  selectedHistoryId.value = null;
  messages.value = [];
  question.value = '';
};

const openHistoryItem = (id: number) => {
  const item = historyItems.value.find((x) => x.id === id);
  if (!item) return;
  selectedHistoryId.value = id;
  messages.value = [
    { role: 'user', content: item.question },
    { role: 'assistant', content: item.answer },
  ];
  scrollToBottom();
};

const onHistoryRowLeave = () => {
  hoverHistoryId.value = null;
  menuOpenId.value = null;
};

const toggleHistoryMenu = (id: number) => {
  menuOpenId.value = menuOpenId.value === id ? null : id;
};

const openEditTitle = (item: HistoryItem) => {
  menuOpenId.value = null;
  editingItemId.value = item.id;
  editTitleValue.value = item.title?.trim() ? item.title.trim() : item.question;
  editTitleModalVisible.value = true;
};

const submitEditTitle = async () => {
  if (editingItemId.value == null) {
    return Promise.reject();
  }
  editTitleSaving.value = true;
  try {
    await aiApi.updateCustomerSupportHistoryTitle(editingItemId.value, {
      title: editTitleValue.value.trim(),
    });
    message.success('标题已更新');
    editTitleModalVisible.value = false;
    await loadHistory();
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '保存失败');
    throw e;
  } finally {
    editTitleSaving.value = false;
  }
};

const togglePinHistory = async (item: HistoryItem) => {
  menuOpenId.value = null;
  try {
    await aiApi.toggleCustomerSupportHistoryPin(item.id);
    message.success('已更新');
    await loadHistory();
  } catch (e: unknown) {
    const err = e as { message?: string };
    message.error(err?.message || '操作失败');
  }
};

const confirmDeleteHistory = (item: HistoryItem) => {
  menuOpenId.value = null;
  Modal.confirm({
    title: '删除此条历史？',
    content: '删除后无法恢复。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        await aiApi.deleteCustomerSupportHistory(item.id);
        message.success('已删除');
        if (selectedHistoryId.value === item.id) {
          selectedHistoryId.value = null;
          messages.value = [];
        }
        await loadHistory();
      } catch (e: unknown) {
        const err = e as { message?: string };
        message.error(err?.message || '删除失败');
        throw e;
      }
    },
  });
};

const handleSend = async (preset?: string) => {
  const content = String(preset != null && preset !== '' ? preset : question.value).trim();
  if (!content || loading.value) return;

  messages.value.push({ role: 'user', content });
  question.value = '';
  selectedHistoryId.value = null;
  await scrollToBottom();

  loading.value = true;
  try {
    const response = await aiApi.customerSupport({
      question: content,
      history: messages.value.filter((item) => item.role === 'user' || item.role === 'assistant'),
    });

    const answer =
      response?.data?.data?.answer ||
      response?.data?.answer ||
      response?.answer ||
      '暂时无法回答，请稍后重试。';
    messages.value.push({ role: 'assistant', content: answer });
    await scrollToBottom();

    if (authStore.isAuthenticated) {
      try {
        await aiApi.saveCustomerSupportHistory({
          question: content,
          answer,
        });
        await loadHistory();
      } catch (saveError) {
        console.warn('保存客服历史失败:', saveError);
      }
    }
  } catch (error: any) {
    message.error(error?.message || '发送失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

const handleClear = () => {
  messages.value = [];
  question.value = '';
};

const loadHistory = async () => {
  if (!authStore.isAuthenticated) return;

  try {
    const response = await aiApi.getCustomerSupportHistory({
      page: 1,
      pageSize: 100,
    });
    const body = response as Record<string, unknown>;
    const inner = (body?.data as Record<string, unknown> | undefined)?.data ?? body?.data;
    const innerObj = inner as Record<string, unknown> | undefined;
    const items = Array.isArray(innerObj?.items)
      ? (innerObj.items as (HistoryItem & Record<string, unknown>)[])
      : [];
    const g = innerObj?.grouping as { today?: string; yesterday?: string } | undefined;
    if (g?.today && g?.yesterday) {
      historyGrouping.value = { today: g.today, yesterday: g.yesterday };
    } else {
      historyGrouping.value = null;
    }

    historyItems.value = items.map((item: HistoryItem & Record<string, unknown>) => {
      const createdAt = pickCreatedAt(item) ?? item.createdAt ?? '';
      const titleRaw = item.title;
      const title = typeof titleRaw === 'string' && titleRaw.trim() ? titleRaw.trim() : null;
      const pinRaw = item.isPinned ?? item.ispinned;
      const pinnedRaw = item.pinnedAt ?? item.pinnedat;
      let pinnedAt: string | number | undefined;
      if (typeof pinnedRaw === 'string' || typeof pinnedRaw === 'number') {
        pinnedAt = pinnedRaw;
      } else if (pinnedRaw instanceof Date) {
        pinnedAt = pinnedRaw.getTime();
      }
      return {
        id: Number(item.id),
        question: String(item.question ?? ''),
        answer: String(item.answer ?? ''),
        createdAt,
        title,
        isPinned: Boolean(pinRaw),
        pinnedAt,
      };
    });
  } catch (error) {
    console.warn('加载客服历史失败:', error);
  }
};

onMounted(() => {
  authStore.initializeAuth();
  loadHistory();
});
</script>

<style scoped lang="less">
.worker-help-chat-page {
  min-height: 0;
  background: linear-gradient(180deg, #fff5f7 0%, #ffffff 40%);
  padding: 0 0 24px;
  max-width: 1100px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 0 0 20px;
  }
}

.help-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 12px;
  align-items: stretch;
  /* 工作台内容区内：左右同高、各自内部滚动（已去掉顶部说明区） */
  height: calc(100vh - 115px);
  min-height: 445px;
  max-height: calc(100vh - 71px);
}

.chat-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px;
  background: #fafafa;
}

.history-sidebar {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.04);
  padding: 20px 12px 12px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  min-width: 0;
}

.sidebar-header {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.new-chat-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 20px;
  background: #fff5f7;
  color: #5c4a52;
  border: 1px solid #f8bbd0;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(248, 187, 208, 0.35);
  transition:
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;

  &:hover:not(:disabled) {
    background: #fff0f5;
    border-color: #ffb6c1;
    box-shadow: 0 2px 8px rgba(255, 182, 193, 0.35);
  }

  &:active:not(:disabled) {
    background: #ffe8ef;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.new-chat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #5c4a52;
}

.new-chat-label {
  line-height: 1.2;
}

.history-title {
  display: block;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 8px;
}

.history-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-group-title {
  font-size: 12px;
  font-weight: 600;
  color: #999;
  padding: 4px 2px 2px;
  letter-spacing: 0.02em;
}

.history-item-outer {
  position: relative;
}

.history-item {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 8px;
  transition:
    border-color 0.2s,
    background 0.2s;

  &:hover {
    border-color: #ffc4d3;
    background: #f8f8f8;
  }

  &.active {
    border-color: #ff89a5;
    background: #fff1f5;

    &:hover {
      background: #fff1f5;
    }
  }
}

.history-item-body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.history-item-actions {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
}

.history-more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: #f0f0f0;
  color: #666;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #e5e5e5;
    color: #333;
  }
}

.history-more-dots {
  font-size: 16px;
  line-height: 1;
  letter-spacing: -2px;
}

.history-dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  min-width: 148px;
  padding: 6px 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid #f0f0f0;
  z-index: 20;
}

.history-dd-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #333;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #f7f7f7;
  }

  &.danger {
    color: #ff4d4f;

    &:hover {
      background: #fff2f0;
    }
  }
}

.history-dd-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: inherit;
}

.history-question {
  font-size: 13px;
  color: #333;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 4px;
}

.history-time {
  font-size: 12px;
  color: #999;
}

.history-empty {
  font-size: 13px;
  color: #999;
  padding: 12px 4px;
}

.empty-state {
  color: #888;
  text-align: center;
  padding-top: 80px;

  .empty-icon {
    font-size: 40px;
    margin-bottom: 8px;
  }

  .empty-title {
    color: #333;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .empty-tips {
    line-height: 1.8;
    font-size: 13px;
  }
}

.msg-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;

  .avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #ddd;
    color: #333;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .bubble {
    max-width: min(80%, 760px);
    padding: 10px 12px;
    border-radius: 10px;
    line-height: 1.65;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 14px;
  }

  &.user {
    justify-content: flex-end;

    .avatar {
      order: 2;
      background: #ffccd7;
    }

    .bubble {
      order: 1;
      background: #ffeff3;
      border: 1px solid #ffd7e2;
      color: #222;
    }
  }

  &.assistant {
    .avatar {
      background: #d9e8ff;
    }

    .bubble {
      background: #fff;
      border: 1px solid #e6e6e6;
      color: #222;
    }
  }
}

.loading-bubble {
  color: #666 !important;
}

.sidebar-quick-questions {
  flex-shrink: 0;
  padding-bottom: 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  min-height: 0;
}

.quick-questions-label {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 8px;
  font-weight: 600;
}

.quick-questions-chips {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 2px;
}

.quick-q-btn {
  font-size: 12px;
  line-height: 1.4;
  text-align: left;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 107, 139, 0.4);
  background: rgba(255, 107, 139, 0.06);
  color: #be185d;
  cursor: pointer;
  width: 100%;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 107, 139, 0.12);
    border-color: rgba(236, 72, 153, 0.55);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.chat-actions {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr 96px 96px;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #f0f0f0;
  background: #fff;

  /* 输入框 hover/focus：从默认蓝色改为粉色（无外发光） */
  :deep(.ant-input-affix-wrapper:hover),
  :deep(.ant-input:hover) {
    border-color: #ff6b8b !important;
  }
  :deep(.ant-input-affix-wrapper-focused),
  :deep(.ant-input-focused),
  :deep(.ant-input:focus) {
    border-color: #ff6b8b !important;
    box-shadow: none !important;
  }

  :deep(.send-btn.ant-btn) {
    background: #fff5f7 !important;
    border-color: #f8bbd0 !important;
    color: #5c4a52 !important;
    font-weight: 500;
    box-shadow: 0 1px 3px rgba(248, 187, 208, 0.35);

    &:hover:not(:disabled) {
      background: #fff0f5 !important;
      border-color: #ffb6c1 !important;
      color: #5c4a52 !important;
    }

    &:active:not(:disabled) {
      background: #ffe8ef !important;
      border-color: #f8bbd0 !important;
    }

    &:focus-visible {
      border-color: #ffb6c1 !important;
    }
  }
}

@media (max-width: 1024px) {
  .help-layout {
    grid-template-columns: 1fr;
    height: auto;
    max-height: none;
    min-height: 0;
  }

  .chat-card {
    height: auto;
    min-height: 0;
  }

  .chat-messages {
    flex: none;
    height: 465px;
    min-height: 305px;
  }

  .history-sidebar {
    height: auto;
    max-height: none;
    overflow: visible;
    min-height: 0;
  }

  .history-list {
    max-height: 345px;
    overflow-y: auto;
  }
}

@media (max-width: 768px) {
  .chat-messages {
    height: 425px;
  }

  .chat-actions {
    grid-template-columns: 1fr;
  }
}
</style>
