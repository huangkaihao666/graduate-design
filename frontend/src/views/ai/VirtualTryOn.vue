<template>
  <div class="virtual-try-on-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>🤖 AI 虚拍生成</h1>
      <p>上传生活照，AI 为您生成高保真婚纱大片</p>
    </div>

    <div class="content-grid">
      <!-- 左侧：上传和配置 -->
      <div class="left-panel">
        <!-- 图片上传 -->
        <div class="upload-section">
          <h2>第 1 步：上传照片</h2>
          <div
            class="upload-area"
            :class="{ active: dragActive }"
            @click="() => fileInput?.click()"
            @dragover.prevent="dragActive = true"
            @dragleave.prevent="dragActive = false"
            @drop.prevent="handleDrop"
          >
            <div v-if="!uploadedImage" class="upload-placeholder">
              <span class="upload-icon">📸</span>
              <p>拖拽照片到此或点击选择</p>
              <small>支持 JPG、PNG 格式，文件大小不超过 10MB</small>
              <input
                type="file"
                accept="image/jpeg,image/png"
                @change="handleFileUpload"
                ref="fileInput"
                style="display: none"
              />
            </div>
            <div v-else class="image-preview">
              <a-image
                :src="uploadedImage"
                :alt="uploadedFileName"
                :preview="true"
                class="upload-preview-image"
                :fallback="uploadedImage"
              />
              <button type="button" class="remove-btn" @click="clearImage">✕ 重新选择</button>
            </div>
          </div>
        </div>

        <!-- 风格选择 -->
        <div class="style-section">
          <h2>第 2 步：选择风格</h2>
          <div class="style-grid">
            <div
              v-for="style in availableStyles"
              :key="style.id"
              class="style-card"
              :class="{ active: selectedStyle === style.id }"
              @click="
                () => {
                  selectedStyle = style.id;
                  saveStateToStorage();
                }
              "
            >
              <div class="style-icon">{{ style.icon }}</div>
              <div class="style-name">{{ style.name }}</div>
              <div class="style-desc">{{ style.description }}</div>
            </div>
          </div>
        </div>

        <!-- 个性化偏好 -->
        <div class="preferences-section">
          <h2>第 3 步：个性化偏好（可选）</h2>
          <a-form layout="vertical">
            <a-form-item label="妆容风格">
              <a-select
                v-model:value="preferences.makeup"
                placeholder="选择妆容风格"
                allow-clear
                @change="saveStateToStorage"
              >
                <a-select-option value="natural">自然清透</a-select-option>
                <a-select-option value="romantic">浪漫烟熏</a-select-option>
                <a-select-option value="elegant">典雅气质</a-select-option>
                <a-select-option value="vintage">复古优雅</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="发型风格">
              <a-select
                v-model:value="preferences.hairstyle"
                placeholder="选择发型风格"
                allow-clear
                @change="saveStateToStorage"
              >
                <a-select-option value="updo">盘发</a-select-option>
                <a-select-option value="loose">飘逸长卷</a-select-option>
                <a-select-option value="half-up">半扎</a-select-option>
                <a-select-option value="sleek">贴头皮</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="服装风格">
              <a-select
                v-model:value="preferences.dress"
                placeholder="选择服装风格"
                allow-clear
                @change="saveStateToStorage"
              >
                <a-select-option value="romantic">浪漫蓬裙</a-select-option>
                <a-select-option value="minimalist">简约修身</a-select-option>
                <a-select-option value="vintage">复古婚纱</a-select-option>
                <a-select-option value="modern">现代设计</a-select-option>
              </a-select>
            </a-form-item>
          </a-form>
        </div>

        <!-- 生成按钮 -->
        <a-button
          type="primary"
          size="large"
          block
          :loading="generating"
          :disabled="!uploadedImage || !selectedStyle"
          @click="handleGenerate"
          class="generate-btn"
        >
          {{ generating ? '正在生成虚拍建议...' : '✨ 生成虚拍建议' }}
        </a-button>
      </div>

      <!-- 右侧：结果展示 -->
      <div class="right-panel">
        <div v-if="generating" class="loading-state">
          <div class="spinner"></div>
          <p>正在生成虚拍建议...</p>
          <small>这可能需要 30-60 秒，请耐心等待 ✨</small>
        </div>

        <div v-else-if="!result" class="empty-state">
          <span class="empty-icon">✨</span>
          <p>完成左侧配置后，点击按钮生成虚拍建议</p>
        </div>

        <div v-else class="result-container">
          <!-- 结果概览 -->
          <div class="result-summary">
            <h2>{{ result.style }} - 虚拍效果</h2>
            <div class="result-time">生成时间：{{ formatTime(result.timestamp) }}</div>
          </div>

          <!-- 修改后的图片展示 -->
          <div class="image-comparison">
            <div class="comparison-item">
              <div class="label">原始照片</div>
              <a-image
                v-if="uploadedImage"
                :src="uploadedImage"
                :alt="uploadedFileName"
                :preview="true"
                class="comparison-image"
                :fallback="uploadedImage"
              />
            </div>
            <div class="arrow">→</div>
            <div class="comparison-item">
              <div class="label">{{ result.style }} 风格效果</div>
              <a-image
                v-if="result.modifiedImageUrl"
                :src="result.modifiedImageUrl"
                alt="修改后的图片"
                :preview="true"
                class="comparison-image modified-preview"
                :fallback="result.modifiedImageUrl"
              />
            </div>
          </div>

          <!-- 详细建议 -->
          <a-collapse class="advice-collapse">
            <!-- 妆容建议 -->
            <template #items>
              <a-collapse-panel key="makeup" header="💄 妆容建议">
                <p>{{ result.makeupAdvice }}</p>
              </a-collapse-panel>

              <!-- 发型建议 -->
              <a-collapse-panel key="hairstyle" header="💇 发型建议">
                <p>{{ result.hairstyleAdvice }}</p>
              </a-collapse-panel>

              <!-- 服装建议 -->
              <a-collapse-panel key="dress" header="👗 服装建议">
                <p>{{ result.dressAdvice }}</p>
              </a-collapse-panel>

              <!-- 拍摄技巧 -->
              <a-collapse-panel key="tips" header="📸 拍摄技巧">
                <ul class="tips-list">
                  <li v-for="(tip, index) in result.shootingTips" :key="index">
                    {{ tip }}
                  </li>
                </ul>
              </a-collapse-panel>

              <!-- 预览描述 -->
              <a-collapse-panel key="preview" header="🎬 预览效果">
                <p>{{ result.previewDescription }}</p>
              </a-collapse-panel>
            </template>
          </a-collapse>

          <!-- 操作按钮 -->
          <div class="result-actions">
            <a-button type="primary" @click="handleSaveHistory"> 💾 保存到历史 </a-button>
            <a-button @click="handleReset">🔄 重新生成</a-button>
            <a-button type="text" danger @click="handleDownload"> ⬇️ 下载建议 </a-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { aiApi, VirtualTryOnRequest } from '@/api/ai';
import { useAuthStore } from '@/store/auth';

// 状态管理
const uploadedImage = ref<string>('');
const uploadedFileName = ref<string>('');
const dragActive = ref<boolean>(false);
const selectedStyle = ref<string>('romantic');
const generating = ref<boolean>(false);
const result = ref<any>(null);
const lastRequest = ref<VirtualTryOnRequest | null>(null);
const fileInput = ref<HTMLInputElement>();

const preferences = reactive({
  makeup: undefined,
  hairstyle: undefined,
  dress: undefined,
});

const availableStyles = ref<any[]>([]);
const authStore = useAuthStore();

// 状态持久化的 key
const STORAGE_KEY = 'virtual-try-on-state';

// 保存状态到 sessionStorage
const saveStateToStorage = () => {
  try {
    const state = {
      uploadedImage: uploadedImage.value,
      uploadedFileName: uploadedFileName.value,
      selectedStyle: selectedStyle.value,
      preferences: { ...preferences },
      result: result.value,
      lastRequest: lastRequest.value,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('保存状态失败:', error);
  }
};

// 从 sessionStorage 恢复状态
const restoreStateFromStorage = () => {
  try {
    const savedState = sessionStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const state = JSON.parse(savedState);
      uploadedImage.value = state.uploadedImage || '';
      uploadedFileName.value = state.uploadedFileName || '';
      selectedStyle.value = state.selectedStyle || 'romantic';
      if (state.preferences) {
        preferences.makeup = state.preferences.makeup;
        preferences.hairstyle = state.preferences.hairstyle;
        preferences.dress = state.preferences.dress;
      }
      result.value = state.result || null;
      lastRequest.value = state.lastRequest || null;
      console.log('已恢复虚拍试衣页面状态');
    }
  } catch (error) {
    console.error('恢复状态失败:', error);
  }
};

// 清空状态和存储
const clearStateAndStorage = () => {
  uploadedImage.value = '';
  uploadedFileName.value = '';
  selectedStyle.value = 'romantic';
  preferences.makeup = undefined;
  preferences.hairstyle = undefined;
  preferences.dress = undefined;
  result.value = null;
  lastRequest.value = null;
  sessionStorage.removeItem(STORAGE_KEY);
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// 获取可用风格列表
onMounted(async () => {
  // 先恢复保存的状态
  restoreStateFromStorage();

  try {
    const response: any = await aiApi.getStyles();
    // 后端返回格式: { statusCode: 200, message: '...', data: { styles: [...] } }
    // 前端响应拦截器返回 response.data，所以这里收到的是: { statusCode: 200, message: '...', data: { styles: [...] } }
    // 需要访问 response.data.styles 来获取实际的风格列表
    const stylesData = response?.data || response;
    availableStyles.value = stylesData?.styles || [];

    if (availableStyles.value.length === 0) {
      console.warn('获取到的风格列表为空，使用默认风格列表');
      throw new Error('风格列表为空');
    }
    console.log('获取到的风格列表:', availableStyles.value);
  } catch (error) {
    console.error('获取风格列表失败:', error);
    message.error('获取风格列表失败，已使用默认风格');
    // 如果 API 失败，使用默认风格列表
    availableStyles.value = [
      {
        id: 'romantic',
        name: '浪漫梦幻',
        description: '注重柔和光线和浪漫氛围的风格',
        icon: '✨',
      },
      {
        id: 'artistic',
        name: '艺术文艺',
        description: '强调艺术感和创意构图的风格',
        icon: '🎨',
      },
      {
        id: 'bohemian',
        name: '波西米亚',
        description: '自由奔放、充满异域风情的风格',
        icon: '🌻',
      },
      {
        id: 'minimalist',
        name: '极简现代',
        description: '简洁大气、注重线条和留白的风格',
        icon: '⬜',
      },
      {
        id: 'classical',
        name: '古典优雅',
        description: '庄重典雅、融合传统元素的风格',
        icon: '👑',
      },
      {
        id: 'adventure',
        name: '冒险活力',
        description: '充满能量、展现青春活力的风格',
        icon: '⛰️',
      },
    ];
  }
});

// 处理文件上传
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      message.error('文件大小不能超过 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImage.value = e.target?.result as string;
      uploadedFileName.value = file.name;
      // 保存状态
      saveStateToStorage();
    };
    reader.readAsDataURL(file);
  }
};

// 清除图片
const clearImage = () => {
  uploadedImage.value = '';
  uploadedFileName.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  // 保存状态
  saveStateToStorage();
};

// 处理拖拽上传
const handleDrop = (event: DragEvent) => {
  dragActive.value = false;
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      message.error('请上传图片文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('文件大小不能超过 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImage.value = e.target?.result as string;
      uploadedFileName.value = file.name;
      // 保存状态
      saveStateToStorage();
    };
    reader.readAsDataURL(file);
  }
};

// 生成虚拍建议
const handleGenerate = async () => {
  if (!uploadedImage.value || !selectedStyle.value) {
    message.warning('请先上传照片并选择风格');
    return;
  }

  generating.value = true;
  try {
    // 使用用户实际上传的图片（Base64 格式）
    // uploadedImage.value 已经是 Base64 格式：data:image/jpeg;base64,...
    const request: VirtualTryOnRequest = {
      imageUrl: uploadedImage.value, // 使用用户上传的图片，而不是固定的 URL
      style: selectedStyle.value,
      preferences: {
        makeup: preferences.makeup,
        hairstyle: preferences.hairstyle,
        dress: preferences.dress,
      },
    };
    lastRequest.value = request;

    const response = await aiApi.virtualTryOn(request);
    // 处理嵌套的响应结构，取最内层的 data
    result.value = response.data?.data || response.data;
    message.success('虚拍建议生成成功！');

    // 保存状态到 sessionStorage
    saveStateToStorage();

    // 如果用户已登录，自动保存到历史记录
    if (authStore.isAuthenticated && result.value && lastRequest.value) {
      try {
        console.log('[VirtualTryOn] 开始自动保存历史记录...', {
          type: 'virtual-try-on',
          hasInput: !!lastRequest.value,
          hasOutput: !!result.value,
        });
        const saveResponse = await aiApi.saveHistory({
          type: 'virtual-try-on',
          input: { ...lastRequest.value },
          output: result.value,
        });
        console.log('[VirtualTryOn] 历史记录保存成功:', saveResponse);
        // 静默保存，不显示额外提示
      } catch (saveError: any) {
        // 保存失败不影响主流程，但记录详细错误
        console.error('[VirtualTryOn] 自动保存历史记录失败:', saveError);
        console.error('[VirtualTryOn] 错误详情:', {
          message: saveError?.message,
          statusCode: saveError?.statusCode,
          data: saveError?.data,
        });
      }
    } else {
      console.log('[VirtualTryOn] 跳过自动保存:', {
        isAuthenticated: authStore.isAuthenticated,
        hasResult: !!result.value,
        hasRequest: !!lastRequest.value,
      });
    }
  } catch (error: any) {
    message.error(error.message || '生成失败，请重试');
    console.error('虚拍生成错误:', error);
  } finally {
    generating.value = false;
  }
};

// 保存到历史
const handleSaveHistory = async () => {
  if (!result.value || !lastRequest.value) {
    message.warning('请先生成虚拍建议');
    return;
  }

  if (!authStore.isAuthenticated) {
    message.warning('请先登录后再保存历史记录');
    return;
  }

  try {
    console.log('[VirtualTryOn] 手动保存历史记录...', {
      type: 'virtual-try-on',
      hasInput: !!lastRequest.value,
      hasOutput: !!result.value,
    });
    const saveResponse = await aiApi.saveHistory({
      type: 'virtual-try-on',
      input: { ...lastRequest.value },
      output: result.value,
    });
    console.log('[VirtualTryOn] 手动保存成功:', saveResponse);
    message.success('已保存到历史记录');
  } catch (error: any) {
    console.error('[VirtualTryOn] 手动保存失败:', error);
    console.error('[VirtualTryOn] 错误详情:', {
      message: error?.message,
      statusCode: error?.statusCode,
      data: error?.data,
    });
    message.error(error?.message || '保存失败，请检查是否已登录');
  }
};

// 重新生成
const handleReset = () => {
  clearStateAndStorage();
  message.info('已清空，可以重新开始生成');
};

// 下载建议
const handleDownload = () => {
  const content = JSON.stringify(result.value, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `虚拍建议-${new Date().getTime()}.json`;
  link.click();
  window.URL.revokeObjectURL(url);
  message.success('已下载建议文件');
};

// 格式化时间
const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString('zh-CN');
};
</script>

<style scoped lang="less">
.virtual-try-on-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 10px;
  }

  p {
    font-size: 1.1rem;
    opacity: 0.9;
  }
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.left-panel,
.right-panel {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.left-panel {
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.upload-section,
.style-section,
.preferences-section {
  h2 {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 15px;
    color: #333;
  }
}

.upload-area {
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;
  background: #fafafa;
  position: relative;

  &:hover {
    border-color: #ff758c;
    background: #fff5f7;
  }

  &.active {
    border-color: #ff758c;
    background: #fff5f7;
  }

  input {
    display: none;
  }
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  .upload-icon {
    font-size: 3rem;
  }

  p {
    font-weight: 500;
    color: #333;
    margin: 0;
  }

  small {
    color: #999;
  }
}

.image-preview {
  position: relative;

  .upload-preview-image {
    max-width: 100%;
    max-height: 300px;
    border-radius: 8px;
    cursor: pointer;
    display: block;

    :deep(.ant-image-img) {
      max-width: 100%;
      max-height: 300px;
      border-radius: 8px;
      object-fit: cover;
    }

    &:hover {
      opacity: 0.9;
    }
  }

  .remove-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    font-size: 1.2rem;
    cursor: pointer;
    transition: background 0.3s;

    &:hover {
      background: rgba(0, 0, 0, 0.8);
    }
  }
}

.style-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.style-card {
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: white;

  &:hover {
    border-color: #ff758c;
    background: #fff5f7;
    transform: translateY(-2px);
  }

  &.active {
    border-color: #ff758c;
    background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
    color: white;

    .style-desc {
      color: rgba(255, 255, 255, 0.9);
    }
  }

  .style-icon {
    font-size: 1.8rem;
    margin-bottom: 8px;
  }

  .style-name {
    font-weight: 600;
    font-size: 0.95rem;
    margin-bottom: 4px;
  }

  .style-desc {
    font-size: 0.75rem;
    color: #999;
    line-height: 1.3;
  }
}

.generate-btn {
  margin-top: 10px;
  height: 48px;
  font-size: 1rem;
  font-weight: 600;
  background: linear-gradient(90deg, #ff758c 0%, #ff7eb3 100%);
  border: none;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 117, 140, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.right-panel {
  padding: 30px;
  display: flex;
  flex-direction: column;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #666;
  gap: 20px;

  .spinner {
    width: 60px;
    height: 60px;
    border: 4px solid #f0f0f0;
    border-top: 4px solid #ff758c;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  p {
    font-size: 1.1rem;
    font-weight: 500;
    margin: 0;
  }

  small {
    font-size: 0.9rem;
    color: #999;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #999;

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  p {
    font-size: 1rem;
  }
}

.result-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-summary {
  padding: 16px;
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
  border-radius: 12px;
  color: white;

  h2 {
    margin: 0 0 8px 0;
    font-size: 1.3rem;
  }

  .result-time {
    font-size: 0.85rem;
    opacity: 0.9;
  }
}

.advice-collapse {
  :deep(.ant-collapse-header) {
    font-weight: 600;
    font-size: 1rem;

    &:hover {
      color: #ff758c;
    }
  }

  :deep(.ant-collapse-content-box) {
    padding: 16px 12px;
    font-size: 0.95rem;
    line-height: 1.6;
    color: #666;
  }
}

.tips-list {
  margin: 0;
  padding-left: 20px;

  li {
    margin-bottom: 8px;
    list-style-type: disc;
  }
}

.result-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;

  button {
    flex: 1;
    min-width: 120px;
  }
}

.image-comparison {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
  margin: 20px 0;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.comparison-item {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #666;
    text-align: center;
  }
}

.comparison-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  transition: all 0.3s;
  cursor: pointer;
  display: block;

  :deep(.ant-image-img) {
    max-width: 100%;
    max-height: 300px;
    border-radius: 6px;
    object-fit: cover;
  }

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: scale(1.02);
  }

  &.modified-preview {
    :deep(.ant-image-img) {
      filter: brightness(100%) contrast(1) saturate(1);
    }
  }
}

.arrow {
  font-size: 1.5rem;
  color: #ff758c;
  font-weight: bold;
  text-align: center;
}
</style>
