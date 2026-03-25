<template>
  <div class="page">
    <div class="head">
      <div>
        <div class="title">消息中心</div>
        <div class="sub">会话列表 + 聊天窗口（文字/图片）+ 右侧客户信息与快捷回复。</div>
      </div>
    </div>

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
            <a-avatar :size="38">{{ c.name.slice(0, 1) }}</a-avatar>
            <div class="meta">
              <div class="row1">
                <span class="name">{{ c.name }}</span>
                <span v-if="c.unread" class="badge">{{ c.unread }}</span>
              </div>
              <div class="row2">{{ c.last }}</div>
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

        <div class="msgs">
          <div v-for="m in messages" :key="m.id" class="msg" :class="{ mine: m.from === 'me' }">
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
          <a-empty v-if="!messages.length" description="暂无消息" />
        </div>

        <div class="composer">
          <a-textarea
            v-model:value="draft"
            :rows="2"
            placeholder="输入消息，回车发送（Shift+Enter 换行）"
            @pressEnter="onEnter"
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
              class="pill ghost"
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
import { message } from 'ant-design-vue';
import type { UploadProps } from 'ant-design-vue';
import dayjs from 'dayjs';
import { computed, onMounted, ref } from 'vue';

type Conv = {
  id: string;
  name: string;
  last: string;
  unread: number;
  phone: string;
  orderNo: string;
  time: string;
};
type Msg = { id: string; from: 'me' | 'them'; content: string; at: string };

const kw = ref('');
const convs = ref<Conv[]>([]);
const selected = ref<Conv | null>(null);
const messages = ref<Msg[]>([]);
const draft = ref('');

const quickReplies = [
  '已确认档期，我们按约定时间见哦～',
  '拍摄前注意事项：早点休息、补水、准备浅色内衣～',
  '当天建议提前 20 分钟到达，我们会协助更衣与补妆。',
  '如果需要改期，请尽早告知我，我来帮你协调档期～',
];

const storageKey = (id: string) => `worker_msg_thread_${id}`;

const filteredConvs = computed(() => {
  const q = kw.value.trim().toLowerCase();
  if (!q) return convs.value;
  return convs.value.filter((c) => c.name.toLowerCase().includes(q));
});

const isImage = (content: string) => {
  return /^data:image\//.test(content) || /\.(png|jpe?g|webp|gif)$/i.test(content);
};

const loadSeedConvs = () => {
  // 本地演示：生成一些会话
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

const loadMessages = (c: Conv) => {
  const raw = localStorage.getItem(storageKey(c.id));
  const list = raw ? (JSON.parse(raw) as Msg[]) : [];
  messages.value = Array.isArray(list) ? list : [];
  if (!messages.value.length) {
    messages.value = [
      {
        id: 'm1',
        from: 'them',
        content: '老师你好～我想了解一下拍摄风格',
        at: dayjs().subtract(1, 'day').format('MM-DD HH:mm'),
      },
      {
        id: 'm2',
        from: 'me',
        content: '好的～你更喜欢清透韩系还是复古胶片感呢？',
        at: dayjs().subtract(1, 'day').add(5, 'minute').format('MM-DD HH:mm'),
      },
    ];
    persist();
  }
};

const persist = () => {
  if (!selected.value) return;
  localStorage.setItem(storageKey(selected.value.id), JSON.stringify(messages.value));
};

const select = (c: Conv) => {
  selected.value = c;
  loadMessages(c);
};

const markRead = () => {
  if (!selected.value) return;
  const idx = convs.value.findIndex((x) => x.id === selected.value?.id);
  if (idx >= 0) convs.value[idx].unread = 0;
  message.success('已标为已读');
};

const sendText = () => {
  if (!selected.value) return;
  const text = draft.value.trim();
  if (!text) return;
  messages.value.push({
    id: String(Date.now()),
    from: 'me',
    content: text,
    at: dayjs().format('MM-DD HH:mm'),
  });
  draft.value = '';
  persist();
  const idx = convs.value.findIndex((x) => x.id === selected.value?.id);
  if (idx >= 0) convs.value[idx].last = text;
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
    messages.value.push({
      id: String(Date.now()),
      from: 'me',
      content: url,
      at: dayjs().format('MM-DD HH:mm'),
    });
    persist();
    const idx = convs.value.findIndex((x) => x.id === selected.value?.id);
    if (idx >= 0) convs.value[idx].last = '[图片]';
    options.onSuccess?.(url);
    message.success('图片已发送（本地演示）');
  };
  reader.onerror = () => options.onError?.(new Error('读取图片失败'));
  reader.readAsDataURL(raw);
};

onMounted(() => {
  loadSeedConvs();
  if (selected.value) loadMessages(selected.value);
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
  grid-template-columns: 320px 1fr 320px;
  gap: 16px;
  align-items: start;
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
  gap: 10px;
  background: linear-gradient(180deg, rgba(255, 245, 247, 0.35) 0%, rgba(255, 255, 255, 1) 45%);
}
.msg {
  max-width: 72%;
}
.msg.mine {
  margin-left: auto;
  text-align: right;
}
.bubble {
  background: #f3f4f6;
  border-radius: 12px;
  padding: 10px 12px;
  white-space: pre-wrap;
  line-height: 1.6;
  color: #111827;
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
  margin-top: 4px;
  font-size: 12px;
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
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
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
