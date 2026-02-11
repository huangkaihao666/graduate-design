<script setup lang="ts">
import { computed } from 'vue'

export interface Props {
  type?: 'primary' | 'secondary' | 'danger' | 'default'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
  size: 'medium',
  disabled: false,
  loading: false,
})

const buttonClass = computed(() => ({
  [`btn-${props.type}`]: true,
  [`btn-${props.size}`]: true,
  'btn-disabled': props.disabled || props.loading,
}))
</script>

<template>
  <button :class="['btn', buttonClass]" :disabled="disabled || loading">
    <span v-if="loading" class="loading-spinner"></span>
    <slot></slot>
  </button>
</template>

<style scoped>
.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 500;
  transition: all 0.3s ease;
  cursor: pointer;
}

/* Size variants */
.btn-small {
  padding: 0.25rem 0.75rem;
  font-size: 12px;
}

.btn-medium {
  padding: 0.5rem 1rem;
  font-size: 14px;
}

.btn-large {
  padding: 0.75rem 1.5rem;
  font-size: 16px;
}

/* Type variants */
.btn-primary {
  background-color: #409eff;
  color: white;
}

.btn-primary:hover {
  background-color: #66b1ff;
}

.btn-secondary {
  background-color: #67c23a;
  color: white;
}

.btn-secondary:hover {
  background-color: #85ce61;
}

.btn-danger {
  background-color: #f56c6c;
  color: white;
}

.btn-danger:hover {
  background-color: #f78989;
}

.btn-default {
  background-color: #f5f7fa;
  color: #303133;
  border: 1px solid #dcdfe6;
}

.btn-default:hover {
  background-color: #f5f7fa;
  color: #409eff;
}

/* States */
.btn-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
