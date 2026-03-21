<template>
  <div class="photographers-page">
    <div class="page-header">
      <h1>本店摄影师</h1>
      <p class="subtitle">
        了解每位老师的擅长题材、资质与拍摄风格、从业年限与代表作品，选择与您契合的摄影师。
      </p>
    </div>

    <a-spin :spinning="loading">
      <div v-if="!list.length && !loading" class="empty-hint">
        <a-empty description="暂无摄影师信息，敬请期待" />
      </div>

      <div v-else class="layout-split">
        <aside class="side-list">
          <div
            v-for="p in list"
            :key="p.id"
            class="side-item"
            :class="{ active: selected?.id === p.id }"
            @click="select(p)"
          >
            <a-avatar :size="48" :src="p.avatar">
              {{ p.name.slice(0, 1) }}
            </a-avatar>
            <div class="side-meta">
              <div class="name">{{ p.name }}</div>
              <div class="title">{{ p.title || '摄影师' }}</div>
            </div>
          </div>
        </aside>

        <main v-if="selected" class="detail-panel">
          <div class="detail-hero">
            <a-avatar :size="96" :src="selected.avatar" class="hero-avatar">
              {{ selected.name.slice(0, 1) }}
            </a-avatar>
            <div>
              <h2>{{ selected.name }}</h2>
              <a-tag color="magenta">{{ selected.title || '本店摄影师' }}</a-tag>
              <div class="hero-meta-line">
                <span v-if="selected.gender" class="meta-chip">{{ selected.gender }}</span>
                <span v-if="selected.age != null" class="meta-chip">{{ selected.age }} 岁</span>
              </div>
              <div class="hero-stat">
                <span class="label">从业年限</span>
                <strong>{{ selected.yearsExperience }}</strong>
                <span class="unit">年</span>
              </div>
            </div>
          </div>

          <a-card
            v-if="selected.specialtyTopics"
            title="擅长题材"
            :bordered="false"
            class="detail-card"
          >
            <p class="body-text">{{ selected.specialtyTopics }}</p>
          </a-card>

          <a-card v-if="selected.awards" title="资质与获奖" :bordered="false" class="detail-card">
            <p class="body-text">{{ selected.awards }}</p>
          </a-card>

          <a-card title="拍摄风格" :bordered="false" class="detail-card">
            <p class="body-text">{{ selected.shootingStyle }}</p>
          </a-card>

          <a-card v-if="selected.bio" title="个人简介" :bordered="false" class="detail-card">
            <p class="body-text">{{ selected.bio }}</p>
          </a-card>

          <a-card title="过往优秀作品" :bordered="false" class="detail-card">
            <div v-if="selected.portfolioImages?.length" class="portfolio-grid">
              <div v-for="(url, idx) in selected.portfolioImages" :key="idx" class="pf-item">
                <a-image :src="url" :alt="`作品 ${idx + 1}`" class="pf-img" />
              </div>
            </div>
            <a-empty v-else description="暂无作品展示" />
          </a-card>
        </main>
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { photographersApi, type PhotographerPublic } from '@/api/photographers';
import { message } from 'ant-design-vue';
import { onMounted, ref, watch } from 'vue';

const loading = ref(false);
const list = ref<PhotographerPublic[]>([]);
const selected = ref<PhotographerPublic | null>(null);

const load = async () => {
  loading.value = true;
  try {
    const data = await photographersApi.getPublic();
    list.value = Array.isArray(data) ? data : [];
    if (list.value.length && !selected.value) {
      selected.value = list.value[0] ?? null;
    }
  } catch (e: unknown) {
    console.error(e);
    message.error('加载摄影师列表失败');
  } finally {
    loading.value = false;
  }
};

const select = (p: PhotographerPublic) => {
  selected.value = p;
};

watch(list, (rows) => {
  if (!rows.length) {
    selected.value = null;
    return;
  }
  if (!selected.value || !rows.some((r) => r.id === selected.value?.id)) {
    selected.value = rows[0] ?? null;
  }
});

onMounted(() => {
  load();
});
</script>

<style scoped lang="less">
.photographers-page {
  min-height: calc(100vh - 64px);
  padding: 24px 32px 48px;
  background: linear-gradient(180deg, #fff5f7 0%, #ffffff 32%);
}

.page-header {
  margin-bottom: 24px;

  h1 {
    margin: 0 0 8px;
    font-size: 26px;
    font-weight: 700;
    color: #1f2937;
  }

  .subtitle {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
    max-width: 640px;
    line-height: 1.6;
  }
}

.empty-hint {
  padding: 48px 0;
}

.layout-split {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.side-list {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  padding: 8px;
  box-shadow: 0 4px 24px rgba(255, 117, 140, 0.08);
  position: sticky;
  top: 88px;

  @media (max-width: 900px) {
    position: static;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}

.side-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s;
  border: 1px solid transparent;

  &:hover {
    background: rgba(255, 117, 140, 0.06);
  }

  &.active {
    background: rgba(255, 117, 140, 0.12);
    border-color: rgba(255, 117, 140, 0.35);
  }

  .side-meta {
    min-width: 0;
  }

  .name {
    font-weight: 600;
    color: #111827;
    font-size: 15px;
  }

  .title {
    font-size: 12px;
    color: #9ca3af;
    margin-top: 2px;
  }
}

.detail-panel {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  padding: 24px 28px 32px;
  box-shadow: 0 8px 32px rgba(17, 24, 39, 0.06);
}

.detail-hero {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f3f4f6;

  h2 {
    margin: 0 0 8px;
    font-size: 22px;
  }

  .hero-avatar {
    border: 3px solid #ffe0e8;
  }

  .hero-meta-line {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .meta-chip {
    display: inline-block;
    padding: 2px 10px;
    font-size: 13px;
    color: #6b7280;
    background: #f3f4f6;
    border-radius: 999px;
  }

  .hero-stat {
    margin-top: 12px;
    font-size: 14px;
    color: #6b7280;

    .label {
      margin-right: 8px;
    }

    strong {
      font-size: 22px;
      color: #ff5c8a;
      margin-right: 4px;
    }

    .unit {
      color: #9ca3af;
    }
  }
}

.detail-card {
  margin-bottom: 16px;

  :deep(.ant-card-head-title) {
    font-weight: 600;
  }
}

.body-text {
  margin: 0;
  line-height: 1.75;
  color: #374151;
  white-space: pre-wrap;
}

.portfolio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.pf-item {
  border-radius: 8px;
  overflow: hidden;
  background: #f9fafb;
}

.pf-img {
  width: 100%;
  height: 160px;
  object-fit: cover;
}
</style>
