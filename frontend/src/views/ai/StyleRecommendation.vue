<template>
  <div class="style-recommendation-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>✨ 智能风格推荐</h1>
      <p>根据您的审美偏好，AI 为您推荐最匹配的拍摄风格与全球景点</p>
    </div>

    <div class="content-grid">
      <!-- 左侧：配置表单 -->
      <div class="left-panel">
        <a-form layout="vertical" class="recommendation-form">
          <!-- 审美描述 -->
          <a-form-item label="您的审美偏好" required>
            <a-textarea
              v-model:value="formData.preferences"
              placeholder="请描述您喜欢的风格、氛围、颜色等，例如：我喜欢清新唯美的感觉，偏好绿色和蓝色系，想要有艺术感..."
              :rows="4"
              show-count
              :maxlength="500"
              @change="saveStateToStorage"
            />
            <!-- 智能输入辅助：快捷模板 + 关键词推荐 -->
            <div class="input-assist">
              <div class="assist-row">
                <span class="assist-label">快捷模板：</span>
                <div class="assist-chips">
                  <button
                    v-for="tpl in preferenceTemplates"
                    :key="tpl.key"
                    type="button"
                    class="assist-chip"
                    @click="applyTemplate(tpl.text)"
                  >
                    {{ tpl.label }}
                  </button>
                </div>
              </div>
              <div class="assist-row">
                <span class="assist-label">可选关键词：</span>
                <div class="assist-chips">
                  <button
                    v-for="kw in keywordSuggestions"
                    :key="kw"
                    type="button"
                    class="assist-chip keyword"
                    @click="appendKeyword(kw)"
                  >
                    {{ kw }}
                  </button>
                </div>
              </div>
            </div>
          </a-form-item>

          <!-- 预算 -->
          <a-form-item label="预算范围（可选）">
            <a-select
              v-model:value="formData.budget"
              placeholder="选择您的预算范围"
              allow-clear
              @change="saveStateToStorage"
            >
              <a-select-option :value="10000">¥0-10000</a-select-option>
              <a-select-option :value="20000">¥10000-20000</a-select-option>
              <a-select-option :value="50000">¥20000-50000</a-select-option>
              <a-select-option :value="100000">¥50000-100000</a-select-option>
              <a-select-option :value="100001">¥100000+</a-select-option>
            </a-select>
          </a-form-item>

          <!-- 适合场景 -->
          <a-form-item label="适合场景（可多选）">
            <a-checkbox-group v-model:value="formData.occasions" @change="saveStateToStorage">
              <a-checkbox value="wedding">婚礼</a-checkbox>
              <a-checkbox value="engagement">订婚</a-checkbox>
              <a-checkbox value="anniversary">周年纪念</a-checkbox>
              <a-checkbox value="honeymoon">蜜月</a-checkbox>
              <a-checkbox value="pre-wedding">婚前写真</a-checkbox>
            </a-checkbox-group>
          </a-form-item>

          <!-- 行动按钮 -->
          <a-form-item>
            <a-button
              type="primary"
              size="large"
              block
              :loading="loading"
              class="submit-btn"
              @click="handleRecommend"
            >
              {{ loading ? '正在生成推荐...' : '🎨 生成个性化推荐' }}
            </a-button>
          </a-form-item>
        </a-form>
      </div>

      <!-- 右侧：详细推荐 -->
      <div class="right-panel">
        <div v-if="!result && !loading" class="empty-state">
          <span class="empty-icon">🎨</span>
          <p>填写左侧信息后，点击按钮获取个性化推荐</p>
        </div>

        <div v-else class="recommendation-detail">
          <!-- 推荐卡片：生成结果后展示在右侧顶部，点击切换下方详情 -->
          <div v-if="result" class="recommendation-cards">
            <div
              v-for="(style, index) in result.recommendedStyles"
              :key="index"
              class="recommendation-card"
              :class="{ active: selectedRecommendation === index }"
              @click="
                () => {
                  selectedRecommendation = index;
                  saveStateToStorage();
                }
              "
            >
              <div class="card-header">
                <h3>{{ style.name }}</h3>
              </div>
              <div class="card-meta">
                <span class="season-tag">🌍 {{ seasonCardLabel(style.season) }}</span>
              </div>
            </div>
          </div>

          <!-- 选中的推荐详情 -->
          <div v-if="selectedRecommendation !== null && result" class="detail-card">
            <div class="detail-title-only">
              <h2>{{ result.recommendedStyles[selectedRecommendation].name }}</h2>
            </div>

            <div class="detail-section detail-muted-panel">
              <div>
                <h3><span class="detail-section-ico" aria-hidden="true">🌍</span>推荐季节</h3>
                <p>{{ result.recommendedStyles[selectedRecommendation].season }}</p>
              </div>
              <div class="detail-muted-panel-split">
                <h3><span class="detail-section-ico" aria-hidden="true">🎨</span>风格特点</h3>
                <p>{{ result.recommendedStyles[selectedRecommendation].description }}</p>
              </div>
            </div>

            <div class="detail-section">
              <h3>推荐景点</h3>
              <div class="spots-grid">
                <div
                  v-for="(spot, index) in result.recommendedStyles[selectedRecommendation].topSpots"
                  :key="index"
                  class="spot-card"
                  @click="openSpotDetail(spot, index)"
                >
                  <div class="spot-number">{{ index + 1 }}</div>
                  <div class="spot-name">{{ spot }}</div>
                </div>
              </div>
            </div>

            <div class="detail-section detail-muted-panel">
              <h3><span class="detail-section-ico" aria-hidden="true">💡</span>个性化建议</h3>
              <p>{{ result.personalizedAdvice }}</p>
            </div>

            <!-- 操作按钮 -->
            <div class="detail-actions">
              <a-button type="primary" @click="handleSaveRecommendation"> 💾 保存推荐 </a-button>
              <a-button @click="handleDownloadRecommendation"> ⬇️ 下载详情 </a-button>
              <a-button @click="handleReset"> 🔄 重新生成 </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 景点详情模态框 -->
    <a-modal
      v-model:open="spotDetailModalVisible"
      title="景点详情"
      :width="700"
      :footer="null"
      @cancel="closeSpotDetail"
    >
      <div v-if="selectedSpot" class="spot-detail">
        <div class="spot-detail-header">
          <h2>{{ selectedSpot.name }}</h2>
          <span class="spot-rank">推荐排名：第 {{ selectedSpot.index + 1 }} 名</span>
        </div>

        <div class="spot-detail-content">
          <div class="detail-item">
            <h3>📍 景点介绍</h3>
            <p>{{ selectedSpot.description || getSpotDescription(selectedSpot.name) }}</p>
          </div>

          <div class="detail-item">
            <h3>🎨 推荐理由</h3>
            <p>
              {{
                selectedSpot.reason ||
                `该景点完美契合"${result.recommendedStyles[selectedRecommendation]?.name}"风格，是拍摄${result.recommendedStyles[selectedRecommendation]?.style || '浪漫'}风格照片的理想选择。`
              }}
            </p>
          </div>

          <div class="detail-item">
            <h3>📸 拍摄建议</h3>
            <ul>
              <li v-for="(tip, tipIndex) in getSpotShootingTips(selectedSpot.name)" :key="tipIndex">
                {{ tip }}
              </li>
            </ul>
          </div>

          <div class="detail-item">
            <h3>⏰ 最佳拍摄时间</h3>
            <p>{{ getBestShootingTime(selectedSpot.name) }}</p>
          </div>

          <div class="detail-item">
            <h3>💡 实用信息</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">推荐季节：</span>
                <span class="info-value">{{
                  result.recommendedStyles[selectedRecommendation]?.season || '四季皆宜'
                }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">拍摄风格：</span>
                <span class="info-value">{{
                  result.recommendedStyles[selectedRecommendation]?.name || '—'
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>

    <AiGeneratingWaitModal :open="loading" feature-hint="个性化推荐生成中" />
  </div>
</template>

<script setup lang="ts">
import AiGeneratingWaitModal from '@/components/ai/AiGeneratingWaitModal.vue';
import { runAiFlight, useAiFlightPending } from '@/utils/ai-generation-flight';
import { ref, reactive, onMounted, watch } from 'vue';
import { message } from 'ant-design-vue';
import { aiApi, StyleRecommendationRequest } from '@/api/ai';
import { useAuthStore } from '@/store/auth';

const formData = reactive({
  preferences: '',
  budget: undefined,
  occasions: [],
});

// 智能输入辅助：预设模板与关键词
const preferenceTemplates = [
  {
    key: 'romantic_sea',
    label: '浪漫海边',
    text: '我喜欢清新唯美、略带梦幻感的海边风格，希望有金色夕阳、柔和海风和自然互动的画面，整体色调偏米白和暖金色，氛围轻松浪漫。',
  },
  {
    key: 'art_city',
    label: '文艺城市',
    text: '我偏好有设计感和故事感的城市街拍风格，希望场景有老建筑、咖啡馆、小巷等，整体色调偏低饱和，画面有一点电影质感和文艺气息。',
  },
  {
    key: 'vintage',
    label: '复古典雅',
    text: '我喜欢复古、略带仪式感的风格，希望有古典建筑、拱门、长廊等元素，服装可以偏礼服或旗袍，整体氛围优雅、有质感。',
  },
  {
    key: 'minimal',
    label: '极简高级',
    text: '我偏好极简、干净的画面，希望背景简单、留白多，强调线条和光影，整体色调偏黑白灰或莫兰迪色，氛围冷静高级。',
  },
];

const keywordSuggestions = [
  '清新自然',
  '电影感',
  '法式浪漫',
  'ins 风',
  '复古胶片',
  '高级灰',
  '森系',
  '港风',
  '通透质感',
  '氛围感灯光',
];

const loading = useAiFlightPending('style-recommendation');
const result = ref<any>(null);
const selectedRecommendation = ref<number | null>(null);
const authStore = useAuthStore();
const spotDetailModalVisible = ref(false);
const selectedSpot = ref<{
  name: string;
  index: number;
  description?: string;
  reason?: string;
} | null>(null);

// 应用快捷模板
const applyTemplate = (text: string) => {
  formData.preferences = text;
  saveStateToStorage();
};

// 追加关键词（避免重复，自动加分隔符）
const appendKeyword = (keyword: string) => {
  if (!keyword) return;
  if (formData.preferences.includes(keyword)) {
    message.info('该关键词已在描述中');
    return;
  }
  const prefix = formData.preferences.trim() ? '；' : '';
  formData.preferences = `${formData.preferences.trim()}${prefix}${keyword}`;
  saveStateToStorage();
};

/** 卡片上只展示季节时间段：去掉「，」后的补充说明 */
const seasonCardLabel = (season: string | undefined) => {
  if (!season || typeof season !== 'string') return '';
  const s = season.trim();
  const cut = s.indexOf('，');
  return cut === -1 ? s : s.slice(0, cut).trim();
};

// 状态持久化的 key
const STORAGE_KEY = 'style-recommendation-state';

// 保存状态到 sessionStorage
const saveStateToStorage = () => {
  try {
    const state = {
      preferences: formData.preferences,
      budget: formData.budget,
      occasions: [...formData.occasions],
      result: result.value,
      selectedRecommendation: selectedRecommendation.value,
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
      formData.preferences = state.preferences || '';
      formData.budget = state.budget;
      formData.occasions = state.occasions || [];
      result.value = state.result || null;
      selectedRecommendation.value = state.selectedRecommendation ?? null;
      console.log('已恢复风格推荐页面状态');
    }
  } catch (error) {
    console.error('恢复状态失败:', error);
  }
};

// 清空状态和存储
const clearStateAndStorage = () => {
  formData.preferences = '';
  formData.budget = undefined;
  formData.occasions = [];
  result.value = null;
  selectedRecommendation.value = null;
  sessionStorage.removeItem(STORAGE_KEY);
  message.info('已清空，可以重新开始生成');
};

// 生成推荐
const handleRecommend = async () => {
  if (!formData.preferences.trim()) {
    message.warning('请输入您的审美偏好');
    return;
  }

  await runAiFlight('style-recommendation', async () => {
    try {
      const request: StyleRecommendationRequest = {
        preferences: formData.preferences,
        budget: formData.budget,
        occasions: formData.occasions.length > 0 ? formData.occasions : undefined,
      };

      const response = await aiApi.recommendStyle(request);
      // 处理嵌套的响应结构，取最内层的 data
      result.value = response.data?.data || response.data;
      selectedRecommendation.value = 0;
      message.success('推荐生成成功！');

      // 保存状态到 sessionStorage
      saveStateToStorage();

      // 如果用户已登录，自动保存到历史记录
      if (authStore.isAuthenticated && result.value) {
        try {
          await aiApi.saveHistory({
            type: 'style-recommendation',
            input: { ...formData },
            output: result.value,
          });
          // 静默保存，不显示额外提示
        } catch (saveError: any) {
          // 保存失败不影响主流程，只记录日志
          console.warn('自动保存历史记录失败:', saveError);
        }
      }
    } catch (error: any) {
      message.error(error.message || '生成失败，请重试');
    }
  });
};

// 保存推荐
const handleSaveRecommendation = async () => {
  try {
    await aiApi.saveHistory({
      type: 'style-recommendation',
      input: formData,
      output: result.value,
    });
    message.success('已保存到历史记录');
  } catch (error: any) {
    message.error(error.message || '保存失败');
  }
};

// 下载推荐
const handleDownloadRecommendation = () => {
  const content = JSON.stringify(result.value, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `风格推荐-${new Date().getTime()}.json`;
  link.click();
  window.URL.revokeObjectURL(url);
  message.success('已下载推荐文件');
};

// 重新生成（清空）
const handleReset = () => {
  clearStateAndStorage();
};

// 打开景点详情
const openSpotDetail = (spotName: string, index: number) => {
  selectedSpot.value = {
    name: spotName,
    index,
  };
  spotDetailModalVisible.value = true;
};

// 关闭景点详情
const closeSpotDetail = () => {
  spotDetailModalVisible.value = false;
  selectedSpot.value = null;
};

/** 景点介绍：按具体景点撰写，每条约 80～100 字（便于弹窗阅读） */
const SPOT_DESCRIPTIONS: Record<string, string> = {
  巴厘岛:
    '巴厘岛位于印度尼西亚爪哇岛以东，兼具火山、梯田园、黑沙滩与印度教庙宇，乌布、金巴兰与库塔一带海景层次丰富。清晨薄雾与傍晚金色海岸线最适合轻婚纱与度假风旅拍，注意雨季云量与涨潮安全。',
  马尔代夫:
    '马尔代夫由上千珊瑚岛组成，海水通透、白沙细腻，水屋栈道与潟湖层次极佳，是海岛仪式与蜜月旅拍的热门地。建议把握日出日落短窗，注意防晒与海风对发型的影响，并预留水上交通接驳时间。',
  三亚: '三亚地处海南岛最南端，亚龙湾、海棠湾与椰梦长廊串联起热带海岸风光，椰林、礁石与游艇码头可形成多样机位。冬春晴多雨少、光线稳定，适合海边轻婚纱；夏秋需关注台风与阵雨对行程的影响。',
  大理: '大理苍山洱海同框，古城、喜洲与双廊一线白族民居与扎染作坊错落，湖光与云层变化丰富。四季皆可旅拍，春秋更清爽；洱东环海路风大，宜备防风外套并合理安排转场，兼顾人文与自然环境人像。',
  丽江: '丽江古城与束河古镇以石板巷、水系与木结构院落著称，玉龙雪山可作远景。高原紫外线强、昼夜温差大，建议清晨柔光拍古城街巷，午后转场雪山方向时注意保暖与高反，服装以可叠穿层次为宜。',
  北京故宫:
    '故宫中轴线殿宇庄严、红墙金瓦与汉白玉台基对比强烈，御花园与角楼区域则更适合叙事性构图。需实名预约、禁商业灯架与部分区域限流，宜选开馆后或闭馆前人流略低时段，镜头以中长焦压缩空间层次。',
  故宫: '故宫中轴线殿宇庄严、红墙金瓦与汉白玉台基对比强烈，御花园与角楼区域则更适合叙事性构图。需实名预约、禁商业灯架与部分区域限流，宜选开馆后或闭馆前人流略低时段，镜头以中长焦压缩空间层次。',
  颐和园:
    '颐和园昆明湖与万寿山借景成园，长廊彩绘、十七孔桥与石舫各具符号感，皇家园林尺度宏大。春秋湖面反光柔和，冬季雪景清冷；园区面积大，旅拍宜提前规划步行动线与游船衔接，避免赶场影响状态。',
  上海外滩:
    '外滩万国建筑群临江而立，浦江对岸陆家嘴天际线形成经典夜景对望，适合都市仪式感与电影感婚照。夜间人流与车流密集，需注意安全距离与补光色温；清晨江雾或雨后路面反光可带来不同质感。',
  外滩: '外滩万国建筑群临江而立，浦江对岸陆家嘴天际线形成经典夜景对望，适合都市仪式感与电影感婚照。夜间人流与车流密集，需注意安全距离与补光色温；清晨江雾或雨后路面反光可带来不同质感。',
  杭州西湖:
    '西湖苏堤、白堤与杨公堤串联湖光山色，雷峰塔、断桥与茅家埠在不同季节呈现水墨或浓彩气质。春夏绿荫与荷花、秋日桂花与薄雾皆可入画；节假日断桥一带拥挤，可改走西里湖或乌龟潭换取更安静取景。',
  西湖: '西湖苏堤、白堤与杨公堤串联湖光山色，雷峰塔、断桥与茅家埠在不同季节呈现水墨或浓彩气质。春夏绿荫与荷花、秋日桂花与薄雾皆可入画；节假日断桥一带拥挤，可改走西里湖或乌龟潭换取更安静取景。',
  厦门鼓浪屿:
    '鼓浪屿步行岛街巷起伏，红砖洋楼、钢琴码头与菽庄花园海景错落，南洋与殖民地建筑细节丰富。渡轮需预约、岛上禁机动车，旅拍宜轻装并预留上下坡时间；午后海风与树影斑驳，适合清新文艺路线。',
  鼓浪屿:
    '鼓浪屿步行岛街巷起伏，红砖洋楼、钢琴码头与菽庄花园海景错落，南洋与殖民地建筑细节丰富。渡轮需预约、岛上禁机动车，旅拍宜轻装并预留上下坡时间；午后海风与树影斑驳，适合清新文艺路线。',
  成都宽窄巷子:
    '宽窄巷子由宽、窄、井三条平行街巷组成，川西院落门头、青砖墙与竹椅茶座构成市井烟火背景。昼夜氛围差异大，夜景灯笼暖色突出；商业人流多，建议工作日清晨拍摄并尊重居民与店铺经营边界。',
  重庆洪崖洞:
    '洪崖洞依山就势、吊脚楼层层叠叠，与千厮门大桥、江面游船共同构成山城夜景名片。夜景灯光饱和度高，注意曝光与肤色还原；坡道与台阶多，建议舒适鞋履并规划从滨江路到平台的多层机位动线。',
  西安大唐不夜城:
    '大唐不夜城以唐风雕塑、灯光秀与仿唐街区串联，夜间氛围浓郁、色彩饱和。适合汉服与轻戏剧感构图，但人流极大，需提前占位并注意灯具与表演时段；可与大雁塔北广场喷泉联动取景，留意安全管理。',
  大唐不夜城:
    '大唐不夜城以唐风雕塑、灯光秀与仿唐街区串联，夜间氛围浓郁、色彩饱和。适合汉服与轻戏剧感构图，但人流极大，需提前占位并注意灯具与表演时段；可与大雁塔北广场喷泉联动取景，留意安全管理。',
  布达拉宫:
    '布达拉宫雄踞拉萨红山之巅，宫墙、金顶与转经道层次鲜明，具有强烈地标性与宗教氛围。高原日照强、温差大，拍摄需尊重宗教礼仪与禁拍区域；宜选清晨斜光与广场远景长焦压缩，避免剧烈运动引发不适。',
  广州沙面:
    '沙面岛保留租界时期欧陆建筑群，林荫道、拱廊与彩色百叶窗细节统一，街道尺度适合步行旅拍。四季绿植丰茂，梅雨季节注意地面湿滑与雾气；岛内车流受限，可结合珠江夜景做半日城市轻婚纱路线。',
  青岛八大关:
    '八大关汇聚多国花园洋房与林荫路，「一关一树」季相变化明显，花石楼与第二海水浴场衔接山海。春秋梧桐与雪松层次佳，夏季海滨游客多；礁石区拍摄需关注潮汐与防滑，风大时备定型与防风外套。',
  八大关:
    '八大关汇聚多国花园洋房与林荫路，「一关一树」季相变化明显，花石楼与第二海水浴场衔接山海。春秋梧桐与雪松层次佳，夏季海滨游客多；礁石区拍摄需关注潮汐与防滑，风大时备定型与防风外套。',
  苏州平江路:
    '平江路沿古城水道展开，石桥、摇橹船与白墙黛瓦构成典型江南水乡肌理，支巷里藏小园与手作店铺。清晨薄雾与雨后石板反光最出片；河道狭窄、游客密集，宜错峰并注意相机防潮与行人礼让。',
  南京夫子庙:
    '夫子庙秦淮河畔灯影桨声、画舫与牌坊街巷密集，夜景暖色与水波反射适合轻复古与民国风。节假日人流极高，建议预约画舫时段并提前踩点机位；注意河岸安全与灯具色温，白天可转老门东延续叙事。',
  哈尔滨中央大街:
    '中央大街面包石路面与巴洛克、新艺术运动立面并存，冬季冰雪雕与暖色橱窗形成强烈对比。严寒需防冻伤与电池续航管理，哈气与雪花可为画面加分；街拍注意车辆与防滑鞋，室内转场可快速回暖补妆。',
  长沙橘子洲:
    '橘子洲湘江心岛视野开阔，青年毛泽东雕像与沿江林荫道为地标，春有江风夏有绿荫。大型活动与烟花日人流管控严格，需提前查询公告；江面反光强，建议偏振镜与早晚柔光，兼顾城市天际线层次。',
  天津五大道意式风情区:
    '天津五大道意式风情区位于和平区，汇集意式、英式、法式等近代建筑遗存，街巷平缓、梧桐掩映，被誉为「万国建筑博览」街巷。春秋晨昏光线柔和，可拍欧式仪式感，也可借咖啡馆与里弄生活营造电影感旅拍。',
  天津意式风情区:
    '天津五大道意式风情区位于和平区，汇集意式、英式、法式等近代建筑遗存，街巷平缓、梧桐掩映，被誉为「万国建筑博览」街巷。春秋晨昏光线柔和，可拍欧式仪式感，也可借咖啡馆与里弄生活营造电影感旅拍。',
  五大道:
    '天津五大道意式风情区位于和平区，汇集意式、英式、法式等近代建筑遗存，街巷平缓、梧桐掩映，被誉为「万国建筑博览」街巷。春秋晨昏光线柔和，可拍欧式仪式感，也可借咖啡馆与里弄生活营造电影感旅拍。',
  意式风情区:
    '天津五大道意式风情区位于和平区，汇集意式、英式、法式等近代建筑遗存，街巷平缓、梧桐掩映，被誉为「万国建筑博览」街巷。春秋晨昏光线柔和，可拍欧式仪式感，也可借咖啡馆与里弄生活营造电影感旅拍。',
};

const normalizeSpotLookup = (s: string) => s.trim().replace(/[\s·．.]/g, '');

/** 未命中词库时：仍给出可操作的旅拍说明，总字数约 80～100（随景点名长度略浮动） */
const fallbackSpotIntroduction = (spotName: string) =>
  `「${spotName}」适合作为旅拍外景地：建议事先核对开放与交通管制，优选清晨或日落前后柔光，结合街区步行动线规划转场顺序，配轻便婚纱与极简补光，便于在半天内兼顾仪式感与环境人像。`;

const getSpotDescription = (spotName: string): string => {
  const raw = spotName.trim();
  if (!raw) return fallbackSpotIntroduction('该景点');
  const norm = normalizeSpotLookup(raw);
  const direct = SPOT_DESCRIPTIONS[raw] || SPOT_DESCRIPTIONS[norm];
  if (direct) return direct;

  const keys = Object.keys(SPOT_DESCRIPTIONS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const nk = normalizeSpotLookup(key);
    if (norm.includes(nk) || raw.includes(key)) {
      return SPOT_DESCRIPTIONS[key];
    }
  }
  return fallbackSpotIntroduction(raw);
};

// 获取景点拍摄建议
const getSpotShootingTips = (spotName: string): string[] => {
  const tips: Record<string, string[]> = {
    巴厘岛: [
      '利用日出和日落时分的柔和光线拍摄',
      '选择海边、稻田或寺庙等特色场景',
      '穿着轻盈的婚纱，展现自然随性的风格',
      '捕捉海浪、椰林等自然元素',
    ],
    马尔代夫: [
      '充分利用海天一色的背景',
      '选择水屋、沙滩等特色场景',
      '利用清澈的海水拍摄水下或倒影效果',
      '捕捉夕阳西下的浪漫时刻',
    ],
    三亚: [
      '选择椰林、海滩、礁石等多样化场景',
      '利用早晨和傍晚的黄金光线',
      '穿着飘逸的婚纱，展现海边浪漫',
      '捕捉海浪、海风等动态元素',
    ],
    大理: [
      '选择洱海边、古城内、苍山下等场景',
      '利用白族建筑和民族元素',
      '穿着简约优雅的婚纱，展现文艺气质',
      '捕捉古城韵味和自然风光',
    ],
    丽江: [
      '选择古城街道、玉龙雪山、束河古镇等场景',
      '利用纳西族建筑和民族文化元素',
      '穿着古典优雅的婚纱，展现文化底蕴',
      '捕捉古城韵味和雪山壮丽',
    ],
  };
  return (
    tips[spotName] || [
      '选择最佳光线时段进行拍摄',
      '充分利用当地特色景观和建筑',
      '穿着与场景风格匹配的婚纱',
      '捕捉自然和人文的完美结合',
    ]
  );
};

// 获取最佳拍摄时间
const getBestShootingTime = (spotName: string): string => {
  const times: Record<string, string> = {
    巴厘岛: '早晨 6:00-9:00 和傍晚 17:00-19:00（避开正午强光）',
    马尔代夫: '早晨 6:00-8:00 和傍晚 17:00-19:00（最佳光线时段）',
    三亚: '早晨 6:00-9:00 和傍晚 17:00-19:00（避免中午强光）',
    大理: '早晨 7:00-9:00 和傍晚 17:00-19:00（光线柔和）',
    丽江: '早晨 7:00-9:00 和傍晚 17:00-19:00（光线最佳）',
  };
  return times[spotName] || '早晨 7:00-9:00 和傍晚 17:00-19:00（黄金光线时段）';
};

watch(loading, (now, prev) => {
  if (prev && !now) {
    restoreStateFromStorage();
  }
});

onMounted(() => {
  restoreStateFromStorage();
});
</script>

<style scoped lang="less">
.style-recommendation-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: linear-gradient(180deg, #fff5f7 0%, #ffffff 32%);
  padding: 0 80px 40px;

  @media (max-width: 768px) {
    padding: 0 36px 32px;
  }
}

.page-header {
  flex-shrink: 0;
  text-align: center;
  padding-top: 28px;
  margin-bottom: 28px;
  color: #334155;
  text-shadow: none;

  h1 {
    font-size: 2.1rem;
    font-weight: 700;
    margin-bottom: 10px;
  }

  p {
    font-size: 1.05rem;
    opacity: 0.9;
  }
}

.content-grid {
  // flex: 1 1 0 + min-height:0 让双栏在视口内占满剩余高度，子面板才能独立 overflow 滚动
  flex: 1 1 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  align-items: stretch;

  @media (max-width: 1024px) {
    flex: none;
    min-height: auto;
    max-height: none;
    grid-template-columns: 1fr;
  }
}

.left-panel,
.right-panel {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);

  @media (min-width: 1025px) {
    min-height: 0;
    max-height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}

.left-panel {
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.recommendation-form {
  :deep(.ant-form-item-label > label) {
    font-weight: 600;
    color: #333;

    &::after {
      content: ' ';
    }
  }
}

// 输入辅助样式
.input-assist {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  .assist-row {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    flex-wrap: wrap;
  }

  .assist-label {
    font-size: 12px;
    color: #999;
    flex-shrink: 0;
    margin-top: 4px;
  }

  .assist-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .assist-chip {
    border: none;
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 12px;
    cursor: pointer;
    background: #f5f5f5;
    color: #666;
    transition: all 0.2s;
    white-space: nowrap;

    &:hover {
      background: #ffebef;
      color: #ff4d8a;
      transform: translateY(-1px);
    }

    &.keyword {
      background: #fafafa;
    }
  }
}

.submit-btn {
  height: 48px;
  font-size: 1rem;
  font-weight: 600;
  background: linear-gradient(90deg, #ff758c 0%, #ff7eb3 100%);
  border: none;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 117, 140, 0.4);
  }
}

.recommendation-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: 100%;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.recommendation-card {
  min-width: 0;
  padding: 12px 10px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
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

    .card-meta .season-tag {
      background: rgba(255, 255, 255, 0.3);
      color: white;
    }
  }

  .card-header {
    margin-bottom: 8px;

    h3 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      line-height: 1.35;
      word-break: break-word;
    }
  }

  .card-meta {
    display: flex;
    gap: 6px;

    .season-tag {
      font-size: 0.72rem;
      background: #f0f0f0;
      padding: 4px 8px;
      border-radius: 4px;
      line-height: 1.4;
      white-space: normal;
      word-break: break-word;
    }
  }
}

.right-panel {
  padding: 30px;
  display: flex;
  flex-direction: column;
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

.recommendation-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-title-only {
  text-align: center;
  padding: 0;

  h2 {
    margin: 0;
    font-size: 1.6rem;
    color: #111;
  }
}

.detail-card > .detail-section:first-of-type {
  margin-top: -18px;

  > div:first-child h3 {
    margin-bottom: 8px;
  }
}

.detail-section {
  h3 {
    display: flex;
    align-items: flex-start;
    gap: 0.35em;
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 12px;
    color: #333;
  }

  .detail-section-ico {
    flex-shrink: 0;
    font-size: 1.05em;
    line-height: 1.35;
  }

  p {
    color: #666;
    line-height: 1.6;
    margin: 0;
  }
}

.detail-muted-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.detail-muted-panel-split {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e5e7eb;
}

.spots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.spot-card {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;

  &:hover {
    background: #ff758c;
    color: white;
    transform: translateY(-4px);
  }

  .spot-number {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 8px;
    color: #ff758c;
  }

  .spot-name {
    font-size: 0.85rem;
    font-weight: 600;
  }

  &:hover .spot-number {
    color: white;
  }
}

.detail-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;

  button {
    flex: 1;
  }
}

// 景点详情模态框样式
.spot-detail {
  padding: 0;
}

.spot-detail-header {
  margin-bottom: 30px;
  padding: 24px;
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
  border-radius: 12px;
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
    animation: pulse 3s ease-in-out infinite;
  }

  h2 {
    margin: 0 0 12px 0;
    font-size: 1.8rem;
    font-weight: 700;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: relative;
    z-index: 1;
  }

  .spot-rank {
    display: inline-block;
    padding: 6px 16px;
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(10px);
    color: white;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.3);
    position: relative;
    z-index: 1;
  }
}

.spot-detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-item {
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  border-left: 4px solid #ff758c;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(255, 117, 140, 0.15);
  }

  h3 {
    font-size: 1.15rem;
    font-weight: 700;
    color: #333;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  p {
    color: #555;
    line-height: 1.8;
    margin: 0;
    font-size: 0.95rem;
  }

  ul {
    margin: 0;
    padding-left: 0;
    list-style: none;
    color: #555;
    line-height: 1.8;

    li {
      margin-bottom: 10px;
      padding-left: 24px;
      position: relative;
      font-size: 0.95rem;

      &::before {
        content: '✨';
        position: absolute;
        left: 0;
        top: 0;
      }
    }
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  .info-item {
    padding: 16px;
    background: white;
    border-radius: 8px;
    border: 1px solid #e8e8e8;
    transition: all 0.3s;

    &:hover {
      border-color: #ff758c;
      box-shadow: 0 2px 8px rgba(255, 117, 140, 0.1);
      transform: translateY(-2px);
    }

    .info-label {
      font-weight: 600;
      color: #999;
      font-size: 0.85rem;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-value {
      color: #333;
      font-size: 1rem;
      font-weight: 500;
    }
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 0.8;
  }
}
</style>
