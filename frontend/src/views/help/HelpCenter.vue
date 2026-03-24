<template>
  <div class="help-center-page">
    <div class="page-header">
      <h1>💬 帮助中心</h1>
      <p>智能客服在线答疑，支持订单、套餐、预约与 AI 功能相关问题</p>
    </div>

    <div class="help-layout">
      <div class="chat-card">
        <div ref="messagesRef" class="chat-messages">
          <div v-if="messages.length === 0" class="empty-state">
            <div class="empty-icon">🤖</div>
            <div class="empty-title">你好，我是智能客服</div>
            <div class="empty-tips">
              你可以这样问我：<br />
              - 如何下单预约？<br />
              - 支付失败怎么办？<br />
              - AI 风格推荐怎么用？
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
            placeholder="请输入你的问题，例如：我想预约套餐，下一步怎么做？"
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

        <div class="history-title">历史记录</div>
        <div v-if="!authStore.isAuthenticated" class="history-empty">登录后可查看历史记录</div>
        <div v-else-if="historyItems.length === 0" class="history-empty">暂无历史记录</div>
        <div v-else class="history-list">
          <template v-for="group in groupedHistory" :key="group.label">
            <div v-if="group.items.length" class="history-group">
              <div class="history-group-title">{{ group.label }}</div>
              <div
                v-for="item in group.items"
                :key="item.id"
                class="history-item"
                :class="{ active: selectedHistoryId === item.id }"
                @click="openHistoryItem(item.id)"
              >
                <div class="history-question">{{ item.question }}</div>
                <div class="history-time">{{ formatTime(item.createdAt) }}</div>
              </div>
            </div>
          </template>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { aiApi, type CustomerSupportMessage } from '@/api/ai';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import { computed, nextTick, onMounted, ref } from 'vue';

interface HistoryItem {
  id: number;
  question: string;
  answer: string;
  createdAt: string;
}

const question = ref('');
const loading = ref(false);
const messages = ref<CustomerSupportMessage[]>([]);
const messagesRef = ref<HTMLElement | null>(null);
const authStore = useAuthStore();
const historyItems = ref<HistoryItem[]>([]);
const selectedHistoryId = ref<number | null>(null);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
  }
};

const formatTime = (time: string) => {
  const d = new Date(time);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};

const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getHistoryBucket = (createdAt: string): 'today' | 'yesterday' | 'earlier' => {
  const itemDate = new Date(createdAt);
  if (Number.isNaN(itemDate.getTime())) return 'earlier';

  const now = new Date();
  const todayKey = toDateKey(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const yesterdayKey = toDateKey(y);
  const itemKey = toDateKey(itemDate);

  if (itemKey === todayKey) return 'today';
  if (itemKey === yesterdayKey) return 'yesterday';
  return 'earlier';
};

const groupedHistory = computed(() => {
  const today: HistoryItem[] = [];
  const yesterday: HistoryItem[] = [];
  const earlier: HistoryItem[] = [];

  const sorted = [...historyItems.value].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });

  for (const item of sorted) {
    const bucket = getHistoryBucket(item.createdAt);
    if (bucket === 'today') today.push(item);
    else if (bucket === 'yesterday') yesterday.push(item);
    else earlier.push(item);
  }

  return [
    { label: '今天', items: today },
    { label: '昨天', items: yesterday },
    { label: '更早', items: earlier },
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

const handleSend = async () => {
  const content = question.value.trim();
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
    const items = response?.data?.data?.items || response?.data?.items || [];
    historyItems.value = items.map((item: HistoryItem) => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
      createdAt: item.createdAt,
    }));
  } catch (error) {
    console.warn('加载客服历史失败:', error);
  }
};

onMounted(() => {
  loadHistory();
});
</script>

<style scoped lang="less">
.help-center-page {
  min-height: calc(100vh - 140px);
  padding: 8px 0 24px;
}

.page-header {
  margin-bottom: 16px;

  h1 {
    margin: 0 0 8px;
    font-size: 28px;
    font-weight: 700;
    color: #222;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }
}

.help-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 12px;
}

.chat-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.chat-messages {
  height: 520px;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
}

.history-sidebar {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.04);
  padding: 12px;
  display: flex;
  flex-direction: column;
  min-height: 596px;
  min-width: 0;
}

.sidebar-header {
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
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.history-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
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

.history-item {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #ffc4d3;
    background: #fff8fa;
  }

  &.active {
    border-color: #ff89a5;
    background: #fff1f5;
  }
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

.chat-actions {
  display: grid;
  grid-template-columns: 1fr 96px 96px;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #f0f0f0;
  background: #fff;

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
  }

  .history-sidebar {
    min-height: auto;
  }
}

@media (max-width: 768px) {
  .chat-messages {
    height: 420px;
  }

  .chat-actions {
    grid-template-columns: 1fr;
  }
}
</style>
