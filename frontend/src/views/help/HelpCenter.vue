<template>
  <div class="help-center-page">
    <div class="page-header">
      <h1>💬 帮助中心</h1>
      <p>智能客服在线答疑，支持订单、套餐、预约与 AI 功能相关问题</p>
    </div>

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
        <a-button type="primary" size="large" :loading="loading" @click="handleSend">
          发送
        </a-button>
        <a-button size="large" :disabled="loading || messages.length === 0" @click="handleClear">
          清空
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { aiApi, type CustomerSupportMessage } from '@/api/ai';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import { nextTick, onMounted, ref } from 'vue';

const question = ref('');
const loading = ref(false);
const messages = ref<CustomerSupportMessage[]>([]);
const messagesRef = ref<HTMLElement | null>(null);
const authStore = useAuthStore();

const scrollToBottom = async () => {
  await nextTick();
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
  }
};

const handleSend = async () => {
  const content = question.value.trim();
  if (!content || loading.value) return;

  messages.value.push({ role: 'user', content });
  question.value = '';
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
    const restored: CustomerSupportMessage[] = [];

    items.forEach((item: { question?: string; answer?: string }) => {
      if (item.question) restored.push({ role: 'user', content: item.question });
      if (item.answer) restored.push({ role: 'assistant', content: item.answer });
    });

    messages.value = restored;
    await scrollToBottom();
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
