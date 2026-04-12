<template>
  <a-modal
    :open="modalVisible"
    :closable="true"
    :mask-closable="false"
    :keyboard="false"
    :footer="null"
    :width="modalWidth"
    centered
    wrap-class-name="ai-generating-wait-modal-wrap"
    class="ai-generating-wait-modal"
    :z-index="1060"
    :destroy-on-close="false"
    @cancel="onUserClose"
  >
    <template #title>
      <div class="modal-title-row">
        <a-spin size="small" />
        <span>{{ featureHint || '正在生成，请稍候' }}</span>
      </div>
    </template>

    <div class="wait-modal-layout">
      <p class="lead">
        正在为您生成内容，通常需要
        <strong>约 20～50 秒</strong
        >。下方为<strong>可选浏览区</strong>（热门目的地、景点与套餐）；若后台暂无数据，可能出现简短提示，<strong>不代表生成失败</strong>。生成完成后本窗口将自动关闭。
      </p>

      <div class="wait-modal-embed-wrap">
        <PackagesBrowseEmbed />
      </div>

      <section class="block muted">
        <p>
          请保持本页打开，勿刷新或关闭浏览器标签；若长时间无响应，可稍后在「AI
          生成历史」中查看是否已保存记录。可点击右上角关闭浏览套餐，生成未完成时可通过右下角按钮再次打开本窗口。
        </p>
      </section>
    </div>
  </a-modal>

  <Teleport to="body">
    <button
      v-show="open && panelDismissed"
      type="button"
      class="ai-wait-reopen-fab"
      aria-label="查看套餐与景点"
      @click="panelDismissed = false"
    >
      📦 查看套餐与景点
    </button>
  </Teleport>
</template>

<script setup lang="ts">
import PackagesBrowseEmbed from '@/components/packages/PackagesBrowseEmbed.vue';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  open: boolean;
  /** 标题旁短说明，如「虚拍建议生成中」 */
  featureHint?: string;
}>();

/** 用户关闭弹窗后，在生成未完成前可再次打开 */
const panelDismissed = ref(false);

const modalVisible = computed(() => props.open && !panelDismissed.value);

const modalWidth = computed(() => {
  if (typeof window === 'undefined') return 1080;
  return Math.min(1080, Math.floor(window.innerWidth * 0.94));
});

function onUserClose() {
  panelDismissed.value = true;
}

watch(
  () => props.open,
  (v, was) => {
    if (!v) {
      panelDismissed.value = false;
      return;
    }
    if (v && !was) {
      panelDismissed.value = false;
    }
  }
);
</script>

<style scoped lang="less">
.modal-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  color: #334155;
}

.wait-modal-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: min(82vh, 860px);
}

.lead {
  margin: 0;
  padding-bottom: 10px;
  border-bottom: 1px dashed #e2e8f0;
  font-size: 0.92rem;
  line-height: 1.65;
  color: #475569;
  flex-shrink: 0;
}

.wait-modal-embed-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.block.muted {
  flex-shrink: 0;
  font-size: 0.82rem;
  color: #94a3b8;
  line-height: 1.55;
  margin: 0;

  p {
    margin: 0;
  }
}
</style>

<style lang="less">
.ai-generating-wait-modal-wrap {
  .ant-modal-header {
    border-bottom: 1px solid #f1f5f9;
  }

  .ant-modal-body {
    padding-top: 12px;
  }
}

.ai-wait-reopen-fab {
  position: fixed;
  right: 20px;
  bottom: 88px;
  z-index: 1055;
  padding: 10px 16px;
  border: none;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #ff758c 0%, #ff5c8a 100%);
  box-shadow: 0 8px 24px rgba(255, 92, 138, 0.45);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(255, 92, 138, 0.55);
  }
}
</style>
