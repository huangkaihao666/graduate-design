<template>
  <div class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-description">{{ description }}</p>
    <slot name="action">
      <button v-if="actionText && actionUrl" @click="handleAction" class="empty-action-btn">
        {{ actionText }}
      </button>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  actionText?: string;
  actionUrl?: string;
}

const props = withDefaults(defineProps<Props>(), {
  icon: '📭',
  description: '',
  actionText: '',
  actionUrl: '',
});

const router = useRouter();

const handleAction = () => {
  if (props.actionUrl) {
    router.push(props.actionUrl);
  }
};
</script>

<style scoped lang="less">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  min-height: 300px;

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.6;
  }

  .empty-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
  }

  .empty-description {
    font-size: 14px;
    color: #999;
    margin-bottom: 24px;
    max-width: 400px;
  }

  .empty-action-btn {
    padding: 8px 24px;
    background: linear-gradient(90deg, #ff758c 0%, #ff7eb3 100%);
    color: white;
    border: none;
    border-radius: 20px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 117, 140, 0.3);
    }
  }
}
</style>
