<template>
  <div class="itinerary-planning-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>🗺️ 智能行程规划</h1>
      <p>一键生成最优拍摄路线与时间安排，让旅拍行程轻松无忧</p>
    </div>

    <div class="content-grid">
      <!-- 左侧：规划配置 -->
      <div class="left-panel">
        <a-form layout="vertical" class="planning-form">
          <!-- 目的地 -->
          <a-form-item label="目的地" required>
            <a-auto-complete
              v-model:value="formData.destination"
              :options="filteredDestinationOptions"
              placeholder="选择或输入目的地"
              allow-clear
              :filter-option="false"
              @search="handleDestinationSearch"
              @select="handleDestinationSelect"
              style="width: 100%"
            >
              <template #option="{ value, label }">
                <div class="destination-option">
                  <span>{{ label }}</span>
                </div>
              </template>
            </a-auto-complete>
            <div
              v-if="formData.destination && !isPresetDestination(formData.destination)"
              class="custom-destination-tip"
            >
              ✏️ 您输入的是自定义目的地：{{ formData.destination }}
            </div>
          </a-form-item>

          <!-- 天数 -->
          <a-form-item label="旅程天数" required>
            <a-slider
              v-model:value="formData.duration"
              :min="2"
              :max="14"
              :tip-formatter="(value: number) => `${value} 天`"
            />
            <div class="duration-display">计划 {{ formData.duration }} 天的旅程</div>
          </a-form-item>

          <!-- 拍摄风格 -->
          <a-form-item label="拍摄风格" required>
            <a-select v-model:value="formData.style" placeholder="选择拍摄风格" allow-clear>
              <a-select-option value="romantic">✨ 浪漫梦幻</a-select-option>
              <a-select-option value="artistic">🎨 艺术文艺</a-select-option>
              <a-select-option value="bohemian">🌻 波西米亚</a-select-option>
              <a-select-option value="minimalist">⬜ 极简现代</a-select-option>
              <a-select-option value="classical">👑 古典优雅</a-select-option>
              <a-select-option value="adventure">⛰️ 冒险活力</a-select-option>
            </a-select>
          </a-form-item>

          <!-- 兴趣爱好 -->
          <a-form-item label="兴趣爱好（可多选）">
            <a-checkbox-group v-model:value="formData.interests">
              <a-checkbox value="nature">自然风景</a-checkbox>
              <a-checkbox value="culture">文化古迹</a-checkbox>
              <a-checkbox value="city">城市建筑</a-checkbox>
              <a-checkbox value="local">当地美食</a-checkbox>
              <a-checkbox value="adventure">冒险活动</a-checkbox>
            </a-checkbox-group>
          </a-form-item>

          <!-- 行动按钮 -->
          <a-form-item>
            <a-button
              type="primary"
              size="large"
              block
              :loading="loading"
              @click="handlePlanItinerary"
              class="submit-btn"
            >
              {{ loading ? '正在生成行程...' : '🎬 生成详细行程' }}
            </a-button>
          </a-form-item>
        </a-form>
      </div>

      <!-- 右侧：行程展示 -->
      <div class="right-panel">
        <div v-if="!result" class="empty-state">
          <span class="empty-icon">🗺️</span>
          <p>完成左侧配置后，点击按钮生成最优行程</p>
        </div>

        <div v-else class="itinerary-detail">
          <!-- 行程概览 -->
          <div class="overview-card">
            <h2>{{ result.destination }} - {{ result.duration }} 天行程</h2>
            <p>{{ result.overview }}</p>
          </div>

          <!-- 日程详情 -->
          <div class="daily-schedules">
            <div
              v-for="day in result.dailySchedule"
              :key="day.day"
              class="day-card"
              :class="{ active: selectedDay === day.day }"
              @click="selectedDay = day.day"
            >
              <div class="day-number">第 {{ day.day }} 天</div>
              <div class="day-theme">{{ day.theme }}</div>
              <div class="day-spots">
                <span v-for="(spot, index) in day.spots" :key="index" class="spot-tag">
                  {{ spot }}
                </span>
              </div>
            </div>
          </div>

          <!-- 选中日期的详情 -->
          <div v-if="selectedDay" class="day-detail">
            <div class="detail-header">
              <h3>第 {{ selectedDay }} 天 - {{ getSelectedDayData()?.theme }}</h3>
            </div>

            <div class="detail-content">
              <div class="detail-item">
                <h4>📅 日程安排</h4>
                <p>{{ getSelectedDayData()?.schedule }}</p>
              </div>

              <div class="detail-item">
                <h4>⏰ 最佳拍摄时间</h4>
                <p>{{ getSelectedDayData()?.bestTime }}</p>
              </div>

              <div class="detail-item">
                <h4>📸 拍摄技巧</h4>
                <p>{{ getSelectedDayData()?.tips }}</p>
              </div>

              <div class="detail-item">
                <h4>📍 主要景点</h4>
                <div class="spots-list">
                  <div
                    v-for="(spot, index) in getSelectedDayData()?.spots"
                    :key="index"
                    class="spot-item"
                  >
                    <span class="spot-icon">{{ index + 1 }}</span>
                    <span class="spot-name">{{ spot }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 准备清单 -->
          <div class="packing-list">
            <h3>📦 准备清单</h3>
            <ul>
              <li v-for="(item, index) in result.packingList" :key="index">
                <a-checkbox />
                {{ item }}
              </li>
            </ul>
          </div>

          <!-- 本地建议 -->
          <div class="local-tips">
            <h3>💡 当地实用建议</h3>
            <p>{{ result.localTips }}</p>
          </div>

          <!-- 操作按钮 -->
          <div class="itinerary-actions">
            <a-button type="primary" @click="handleSaveItinerary"> 💾 保存行程 </a-button>
            <a-button @click="handleDownloadItinerary"> ⬇️ 下载详情 </a-button>
            <a-button @click="handlePrintItinerary"> 🖨️ 打印行程 </a-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { message } from 'ant-design-vue';
import { aiApi, ItineraryPlanningRequest } from '@/api/ai';
import { useAuthStore } from '@/store/auth';

const formData = reactive({
  destination: '',
  duration: 5,
  style: '',
  interests: [],
});

const loading = ref<boolean>(false);
const result = ref<any>(null);
const selectedDay = ref<number | null>(null);
const authStore = useAuthStore();
const searchKeyword = ref<string>('');

// 预设的目的地列表（更多选项）
const presetDestinations = [
  // 直辖市
  { value: '北京', label: '🏰 北京' },
  { value: '上海', label: '🌃 上海' },
  { value: '天津', label: '🌉 天津' },
  { value: '重庆', label: '🌉 重庆' },

  // 广东省
  { value: '广州', label: '🏙️ 广州' },
  { value: '深圳', label: '🌆 深圳' },
  { value: '珠海', label: '🌊 珠海' },
  { value: '佛山', label: '🏛️ 佛山' },
  { value: '东莞', label: '🏭 东莞' },
  { value: '中山', label: '🌳 中山' },
  { value: '惠州', label: '🏖️ 惠州' },
  { value: '肇庆', label: '🏔️ 肇庆' },
  { value: '江门', label: '🌴 江门' },
  { value: '汕头', label: '🌊 汕头' },
  { value: '湛江', label: '🌊 湛江' },
  { value: '韶关', label: '🏔️ 韶关' },

  // 浙江省
  { value: '杭州', label: '🌸 杭州' },
  { value: '宁波', label: '🌊 宁波' },
  { value: '温州', label: '🌊 温州' },
  { value: '嘉兴', label: '🌾 嘉兴' },
  { value: '湖州', label: '💧 湖州' },
  { value: '绍兴', label: '🏛️ 绍兴' },
  { value: '金华', label: '🏔️ 金华' },
  { value: '衢州', label: '🏔️ 衢州' },
  { value: '舟山', label: '🏝️ 舟山' },
  { value: '台州', label: '🌊 台州' },
  { value: '丽水', label: '🏔️ 丽水' },
  { value: '千岛湖', label: '💧 千岛湖' },
  { value: '西溪湿地', label: '🦆 西溪湿地' },

  // 江苏省
  { value: '南京', label: '🏯 南京' },
  { value: '苏州', label: '🏛️ 苏州' },
  { value: '无锡', label: '🌊 无锡' },
  { value: '常州', label: '🏛️ 常州' },
  { value: '镇江', label: '🏔️ 镇江' },
  { value: '扬州', label: '🏛️ 扬州' },
  { value: '泰州', label: '🌾 泰州' },
  { value: '南通', label: '🌊 南通' },
  { value: '盐城', label: '🦢 盐城' },
  { value: '淮安', label: '🏛️ 淮安' },
  { value: '宿迁', label: '🌾 宿迁' },
  { value: '连云港', label: '🌊 连云港' },
  { value: '徐州', label: '🏛️ 徐州' },

  // 四川省
  { value: '成都', label: '🐼 成都' },
  { value: '绵阳', label: '🏛️ 绵阳' },
  { value: '德阳', label: '🏛️ 德阳' },
  { value: '南充', label: '🌾 南充' },
  { value: '宜宾', label: '🍶 宜宾' },
  { value: '自贡', label: '🦕 自贡' },
  { value: '乐山', label: '🏔️ 乐山' },
  { value: '泸州', label: '🍶 泸州' },
  { value: '达州', label: '🏔️ 达州' },
  { value: '内江', label: '🌾 内江' },
  { value: '遂宁', label: '🌾 遂宁' },
  { value: '攀枝花', label: '🌺 攀枝花' },
  { value: '眉山', label: '🏛️ 眉山' },
  { value: '广安', label: '🏛️ 广安' },
  { value: '资阳', label: '🌾 资阳' },
  { value: '凉山', label: '🏔️ 凉山' },
  { value: '甘孜', label: '🏔️ 甘孜' },
  { value: '阿坝', label: '🏔️ 阿坝' },

  // 云南省
  { value: '昆明', label: '🌸 昆明' },
  { value: '大理', label: '🌄 大理' },
  { value: '丽江', label: '🏔️ 丽江' },
  { value: '西双版纳', label: '🐘 西双版纳' },
  { value: '香格里拉', label: '🏔️ 香格里拉' },
  { value: '腾冲', label: '🌋 腾冲' },
  { value: '玉溪', label: '🌊 玉溪' },
  { value: '曲靖', label: '🏛️ 曲靖' },
  { value: '保山', label: '🏔️ 保山' },
  { value: '昭通', label: '🏔️ 昭通' },
  { value: '普洱', label: '🍵 普洱' },
  { value: '临沧', label: '🌾 临沧' },
  { value: '楚雄', label: '🏛️ 楚雄' },
  { value: '红河', label: '🌾 红河' },
  { value: '文山', label: '🏔️ 文山' },
  { value: '德宏', label: '🌺 德宏' },
  { value: '怒江', label: '🏔️ 怒江' },
  { value: '迪庆', label: '🏔️ 迪庆' },

  // 山东省
  { value: '济南', label: '💧 济南' },
  { value: '青岛', label: '🏖️ 青岛' },
  { value: '烟台', label: '🌊 烟台' },
  { value: '威海', label: '🌊 威海' },
  { value: '潍坊', label: '🪁 潍坊' },
  { value: '淄博', label: '🏛️ 淄博' },
  { value: '临沂', label: '🏛️ 临沂' },
  { value: '济宁', label: '🏛️ 济宁' },
  { value: '泰安', label: '🏔️ 泰安' },
  { value: '德州', label: '🌾 德州' },
  { value: '聊城', label: '🌾 聊城' },
  { value: '滨州', label: '🌊 滨州' },
  { value: '菏泽', label: '🌺 菏泽' },
  { value: '东营', label: '🛢️ 东营' },
  { value: '枣庄', label: '🌾 枣庄' },
  { value: '日照', label: '🌅 日照' },

  // 福建省
  { value: '福州', label: '🌊 福州' },
  { value: '厦门', label: '🌊 厦门' },
  { value: '泉州', label: '🏛️ 泉州' },
  { value: '漳州', label: '🌺 漳州' },
  { value: '莆田', label: '🌊 莆田' },
  { value: '三明', label: '🏔️ 三明' },
  { value: '南平', label: '🏔️ 南平' },
  { value: '龙岩', label: '🏔️ 龙岩' },
  { value: '宁德', label: '🌊 宁德' },

  // 湖南省
  { value: '长沙', label: '🌶️ 长沙' },
  { value: '株洲', label: '🏭 株洲' },
  { value: '湘潭', label: '🏛️ 湘潭' },
  { value: '衡阳', label: '🏔️ 衡阳' },
  { value: '邵阳', label: '🏛️ 邵阳' },
  { value: '岳阳', label: '🌊 岳阳' },
  { value: '常德', label: '🌾 常德' },
  { value: '张家界', label: '🏔️ 张家界' },
  { value: '益阳', label: '🌊 益阳' },
  { value: '郴州', label: '🏔️ 郴州' },
  { value: '永州', label: '🏛️ 永州' },
  { value: '怀化', label: '🏔️ 怀化' },
  { value: '娄底', label: '🏛️ 娄底' },
  { value: '湘西', label: '🏔️ 湘西' },

  // 湖北省
  { value: '武汉', label: '🌸 武汉' },
  { value: '黄石', label: '🏛️ 黄石' },
  { value: '十堰', label: '🏔️ 十堰' },
  { value: '宜昌', label: '🌊 宜昌' },
  { value: '襄阳', label: '🏛️ 襄阳' },
  { value: '鄂州', label: '🌊 鄂州' },
  { value: '荆门', label: '🏛️ 荆门' },
  { value: '孝感', label: '🌾 孝感' },
  { value: '荆州', label: '🏛️ 荆州' },
  { value: '黄冈', label: '🏛️ 黄冈' },
  { value: '咸宁', label: '🌾 咸宁' },
  { value: '随州', label: '🏛️ 随州' },
  { value: '恩施', label: '🏔️ 恩施' },

  // 河南省
  { value: '郑州', label: '🏛️ 郑州' },
  { value: '开封', label: '🏛️ 开封' },
  { value: '洛阳', label: '🏛️ 洛阳' },
  { value: '平顶山', label: '🏔️ 平顶山' },
  { value: '安阳', label: '🏛️ 安阳' },
  { value: '鹤壁', label: '🏛️ 鹤壁' },
  { value: '新乡', label: '🌾 新乡' },
  { value: '焦作', label: '🏔️ 焦作' },
  { value: '濮阳', label: '🌾 濮阳' },
  { value: '许昌', label: '🏛️ 许昌' },
  { value: '漯河', label: '🌊 漯河' },
  { value: '三门峡', label: '🏔️ 三门峡' },
  { value: '南阳', label: '🏛️ 南阳' },
  { value: '商丘', label: '🏛️ 商丘' },
  { value: '信阳', label: '🌾 信阳' },
  { value: '周口', label: '🌊 周口' },
  { value: '驻马店', label: '🌾 驻马店' },

  // 安徽省
  { value: '合肥', label: '🌊 合肥' },
  { value: '芜湖', label: '🌊 芜湖' },
  { value: '蚌埠', label: '🌊 蚌埠' },
  { value: '淮南', label: '🏔️ 淮南' },
  { value: '马鞍山', label: '🏔️ 马鞍山' },
  { value: '淮北', label: '🏛️ 淮北' },
  { value: '铜陵', label: '🏛️ 铜陵' },
  { value: '安庆', label: '🌊 安庆' },
  { value: '黄山', label: '🏔️ 黄山' },
  { value: '滁州', label: '🏛️ 滁州' },
  { value: '阜阳', label: '🌾 阜阳' },
  { value: '宿州', label: '🌾 宿州' },
  { value: '六安', label: '🏔️ 六安' },
  { value: '亳州', label: '🌾 亳州' },
  { value: '池州', label: '🏔️ 池州' },
  { value: '宣城', label: '🏛️ 宣城' },

  // 江西省
  { value: '南昌', label: '🌊 南昌' },
  { value: '景德镇', label: '🏺 景德镇' },
  { value: '萍乡', label: '🏛️ 萍乡' },
  { value: '九江', label: '🌊 九江' },
  { value: '新余', label: '🏛️ 新余' },
  { value: '鹰潭', label: '🏔️ 鹰潭' },
  { value: '赣州', label: '🏛️ 赣州' },
  { value: '吉安', label: '🏛️ 吉安' },
  { value: '宜春', label: '🌾 宜春' },
  { value: '抚州', label: '🏛️ 抚州' },
  { value: '上饶', label: '🏔️ 上饶' },
  { value: '婺源', label: '🌾 婺源' },

  // 河北省
  { value: '石家庄', label: '🏛️ 石家庄' },
  { value: '唐山', label: '🏭 唐山' },
  { value: '秦皇岛', label: '🌊 秦皇岛' },
  { value: '邯郸', label: '🏛️ 邯郸' },
  { value: '邢台', label: '🏛️ 邢台' },
  { value: '保定', label: '🏛️ 保定' },
  { value: '张家口', label: '🏔️ 张家口' },
  { value: '承德', label: '🏔️ 承德' },
  { value: '沧州', label: '🌊 沧州' },
  { value: '廊坊', label: '🏛️ 廊坊' },
  { value: '衡水', label: '🌾 衡水' },

  // 山西省
  { value: '太原', label: '🏛️ 太原' },
  { value: '大同', label: '🏛️ 大同' },
  { value: '阳泉', label: '🏔️ 阳泉' },
  { value: '长治', label: '🏛️ 长治' },
  { value: '晋城', label: '🏔️ 晋城' },
  { value: '朔州', label: '🏛️ 朔州' },
  { value: '晋中', label: '🏛️ 晋中' },
  { value: '运城', label: '🏛️ 运城' },
  { value: '忻州', label: '🏔️ 忻州' },
  { value: '临汾', label: '🏛️ 临汾' },
  { value: '吕梁', label: '🏔️ 吕梁' },

  // 辽宁省
  { value: '沈阳', label: '🏛️ 沈阳' },
  { value: '大连', label: '🌊 大连' },
  { value: '鞍山', label: '🏔️ 鞍山' },
  { value: '抚顺', label: '🏛️ 抚顺' },
  { value: '本溪', label: '🏔️ 本溪' },
  { value: '丹东', label: '🌊 丹东' },
  { value: '锦州', label: '🌊 锦州' },
  { value: '营口', label: '🌊 营口' },
  { value: '阜新', label: '🏛️ 阜新' },
  { value: '辽阳', label: '🏛️ 辽阳' },
  { value: '盘锦', label: '🌊 盘锦' },
  { value: '铁岭', label: '🏛️ 铁岭' },
  { value: '朝阳', label: '🏛️ 朝阳' },
  { value: '葫芦岛', label: '🌊 葫芦岛' },

  // 吉林省
  { value: '长春', label: '🏛️ 长春' },
  { value: '吉林', label: '🏔️ 吉林' },
  { value: '四平', label: '🌾 四平' },
  { value: '辽源', label: '🏛️ 辽源' },
  { value: '通化', label: '🏔️ 通化' },
  { value: '白山', label: '🏔️ 白山' },
  { value: '松原', label: '🌾 松原' },
  { value: '白城', label: '🌾 白城' },
  { value: '延边', label: '🏔️ 延边' },

  // 黑龙江省
  { value: '哈尔滨', label: '❄️ 哈尔滨' },
  { value: '齐齐哈尔', label: '🏛️ 齐齐哈尔' },
  { value: '鸡西', label: '🏛️ 鸡西' },
  { value: '鹤岗', label: '🏔️ 鹤岗' },
  { value: '双鸭山', label: '🏔️ 双鸭山' },
  { value: '大庆', label: '🛢️ 大庆' },
  { value: '伊春', label: '🌲 伊春' },
  { value: '佳木斯', label: '🌊 佳木斯' },
  { value: '七台河', label: '🏛️ 七台河' },
  { value: '牡丹江', label: '🌺 牡丹江' },
  { value: '黑河', label: '🏔️ 黑河' },
  { value: '绥化', label: '🌾 绥化' },
  { value: '大兴安岭', label: '🌲 大兴安岭' },

  // 陕西省
  { value: '西安', label: '🏛️ 西安' },
  { value: '铜川', label: '🏛️ 铜川' },
  { value: '宝鸡', label: '🏛️ 宝鸡' },
  { value: '咸阳', label: '🏛️ 咸阳' },
  { value: '渭南', label: '🌾 渭南' },
  { value: '延安', label: '🏛️ 延安' },
  { value: '汉中', label: '🏔️ 汉中' },
  { value: '榆林', label: '🏔️ 榆林' },
  { value: '安康', label: '🌊 安康' },
  { value: '商洛', label: '🏔️ 商洛' },

  // 甘肃省
  { value: '兰州', label: '🌊 兰州' },
  { value: '嘉峪关', label: '🏛️ 嘉峪关' },
  { value: '金昌', label: '🏛️ 金昌' },
  { value: '白银', label: '🏛️ 白银' },
  { value: '天水', label: '🏛️ 天水' },
  { value: '武威', label: '🏛️ 武威' },
  { value: '张掖', label: '🏔️ 张掖' },
  { value: '平凉', label: '🏔️ 平凉' },
  { value: '酒泉', label: '🏛️ 酒泉' },
  { value: '庆阳', label: '🌾 庆阳' },
  { value: '定西', label: '🏔️ 定西' },
  { value: '陇南', label: '🏔️ 陇南' },
  { value: '临夏', label: '🏛️ 临夏' },
  { value: '甘南', label: '🏔️ 甘南' },

  // 青海省
  { value: '西宁', label: '🏔️ 西宁' },
  { value: '海东', label: '🏔️ 海东' },
  { value: '海北', label: '🏔️ 海北' },
  { value: '黄南', label: '🏔️ 黄南' },
  { value: '海南', label: '🏔️ 海南' },
  { value: '果洛', label: '🏔️ 果洛' },
  { value: '玉树', label: '🏔️ 玉树' },
  { value: '海西', label: '🏔️ 海西' },

  // 新疆
  { value: '乌鲁木齐', label: '🏔️ 乌鲁木齐' },
  { value: '克拉玛依', label: '🛢️ 克拉玛依' },
  { value: '吐鲁番', label: '🍇 吐鲁番' },
  { value: '哈密', label: '🍈 哈密' },
  { value: '昌吉', label: '🏛️ 昌吉' },
  { value: '博尔塔拉', label: '🏔️ 博尔塔拉' },
  { value: '巴音郭楞', label: '🏔️ 巴音郭楞' },
  { value: '阿克苏', label: '🏛️ 阿克苏' },
  { value: '克孜勒苏', label: '🏔️ 克孜勒苏' },
  { value: '喀什', label: '🏛️ 喀什' },
  { value: '和田', label: '🏛️ 和田' },
  { value: '伊犁', label: '🌾 伊犁' },
  { value: '塔城', label: '🏛️ 塔城' },
  { value: '阿勒泰', label: '🏔️ 阿勒泰' },
  { value: '石河子', label: '🏛️ 石河子' },
  { value: '阿拉尔', label: '🏛️ 阿拉尔' },
  { value: '图木舒克', label: '🏛️ 图木舒克' },
  { value: '五家渠', label: '🏛️ 五家渠' },
  { value: '北屯', label: '🏛️ 北屯' },
  { value: '铁门关', label: '🏛️ 铁门关' },
  { value: '双河', label: '🏛️ 双河' },
  { value: '可克达拉', label: '🏛️ 可克达拉' },
  { value: '昆玉', label: '🏛️ 昆玉' },
  { value: '胡杨河', label: '🌲 胡杨河' },
  { value: '新星', label: '⭐ 新星' },
  { value: '白杨', label: '🌲 白杨' },
  { value: '新疆', label: '🐫 新疆' },

  // 西藏
  { value: '拉萨', label: '🏔️ 拉萨' },
  { value: '日喀则', label: '🏔️ 日喀则' },
  { value: '昌都', label: '🏔️ 昌都' },
  { value: '林芝', label: '🏔️ 林芝' },
  { value: '山南', label: '🏔️ 山南' },
  { value: '那曲', label: '🏔️ 那曲' },
  { value: '阿里', label: '🏔️ 阿里' },
  { value: '西藏', label: '🏔️ 西藏' },

  // 内蒙古
  { value: '呼和浩特', label: '🌾 呼和浩特' },
  { value: '包头', label: '🏛️ 包头' },
  { value: '乌海', label: '🏛️ 乌海' },
  { value: '赤峰', label: '🏔️ 赤峰' },
  { value: '通辽', label: '🌾 通辽' },
  { value: '鄂尔多斯', label: '🏛️ 鄂尔多斯' },
  { value: '呼伦贝尔', label: '🌲 呼伦贝尔' },
  { value: '巴彦淖尔', label: '🌾 巴彦淖尔' },
  { value: '乌兰察布', label: '🏔️ 乌兰察布' },
  { value: '兴安盟', label: '🌲 兴安盟' },
  { value: '锡林郭勒', label: '🌾 锡林郭勒' },
  { value: '阿拉善', label: '🏜️ 阿拉善' },

  // 广西
  { value: '南宁', label: '🌺 南宁' },
  { value: '柳州', label: '🏛️ 柳州' },
  { value: '桂林', label: '🏔️ 桂林' },
  { value: '梧州', label: '🌊 梧州' },
  { value: '北海', label: '🌊 北海' },
  { value: '防城港', label: '🌊 防城港' },
  { value: '钦州', label: '🌊 钦州' },
  { value: '贵港', label: '🌊 贵港' },
  { value: '玉林', label: '🌺 玉林' },
  { value: '百色', label: '🏔️ 百色' },
  { value: '贺州', label: '🏛️ 贺州' },
  { value: '河池', label: '🏔️ 河池' },
  { value: '来宾', label: '🌾 来宾' },
  { value: '崇左', label: '🏛️ 崇左' },

  // 海南省
  { value: '海口', label: '🌴 海口' },
  { value: '三亚', label: '⛱️ 三亚' },
  { value: '三沙', label: '🏝️ 三沙' },
  { value: '儋州', label: '🌴 儋州' },
  { value: '五指山', label: '🏔️ 五指山' },
  { value: '琼海', label: '🌊 琼海' },
  { value: '文昌', label: '🚀 文昌' },
  { value: '万宁', label: '🌊 万宁' },
  { value: '东方', label: '🌊 东方' },
  { value: '定安', label: '🌾 定安' },
  { value: '屯昌', label: '🌾 屯昌' },
  { value: '澄迈', label: '🌾 澄迈' },
  { value: '临高', label: '🌊 临高' },
  { value: '白沙', label: '🏔️ 白沙' },
  { value: '昌江', label: '🏛️ 昌江' },
  { value: '乐东', label: '🌺 乐东' },
  { value: '陵水', label: '🌊 陵水' },
  { value: '保亭', label: '🌺 保亭' },
  { value: '琼中', label: '🏔️ 琼中' },

  // 贵州省
  { value: '贵阳', label: '🏔️ 贵阳' },
  { value: '六盘水', label: '🏔️ 六盘水' },
  { value: '遵义', label: '🏛️ 遵义' },
  { value: '安顺', label: '🏛️ 安顺' },
  { value: '毕节', label: '🏔️ 毕节' },
  { value: '铜仁', label: '🏔️ 铜仁' },
  { value: '黔西南', label: '🏔️ 黔西南' },
  { value: '黔东南', label: '🏔️ 黔东南' },
  { value: '黔南', label: '🏔️ 黔南' },

  // 宁夏
  { value: '银川', label: '🌾 银川' },
  { value: '石嘴山', label: '🏔️ 石嘴山' },
  { value: '吴忠', label: '🏛️ 吴忠' },
  { value: '固原', label: '🏔️ 固原' },
  { value: '中卫', label: '🏛️ 中卫' },

  // 特别行政区
  { value: '香港', label: '🌉 香港' },
  { value: '澳门', label: '🎰 澳门' },
  { value: '台湾', label: '🏝️ 台湾' },
  { value: '台北', label: '🏙️ 台北' },
  { value: '高雄', label: '🌊 高雄' },
  { value: '台中', label: '🏛️ 台中' },
  { value: '台南', label: '🏛️ 台南' },
  { value: '新北', label: '🌆 新北' },
  { value: '桃园', label: '🌸 桃园' },

  // 国外热门目的地
  { value: '巴厘岛', label: '🏖️ 巴厘岛' },
  { value: '马尔代夫', label: '🏝️ 马尔代夫' },
  { value: '普吉岛', label: '🌴 普吉岛' },
  { value: '日本', label: '🌸 日本' },
  { value: '韩国', label: '🏯 韩国' },
  { value: '泰国', label: '🐘 泰国' },
  { value: '新加坡', label: '🌴 新加坡' },
  { value: '马来西亚', label: '🌺 马来西亚' },
  { value: '越南', label: '🌾 越南' },
  { value: '柬埔寨', label: '🏛️ 柬埔寨' },
  { value: '菲律宾', label: '🏝️ 菲律宾' },
  { value: '印度尼西亚', label: '🌋 印度尼西亚' },
  { value: '澳大利亚', label: '🦘 澳大利亚' },
  { value: '新西兰', label: '🐑 新西兰' },
  { value: '法国', label: '🗼 法国' },
  { value: '意大利', label: '🏛️ 意大利' },
  { value: '希腊', label: '🏛️ 希腊' },
  { value: '西班牙', label: '🏰 西班牙' },
  { value: '葡萄牙', label: '🌊 葡萄牙' },
  { value: '土耳其', label: '🕌 土耳其' },
  { value: '摩洛哥', label: '🏜️ 摩洛哥' },
  { value: '冰岛', label: '❄️ 冰岛' },
  { value: '挪威', label: '🏔️ 挪威' },
  { value: '瑞士', label: '🏔️ 瑞士' },
  { value: '奥地利', label: '🏔️ 奥地利' },
  { value: '德国', label: '🏰 德国' },
  { value: '英国', label: '🏰 英国' },
  { value: '美国', label: '🗽 美国' },
  { value: '加拿大', label: '🍁 加拿大' },
  { value: '墨西哥', label: '🌮 墨西哥' },
  { value: '巴西', label: '🌴 巴西' },
  { value: '阿根廷', label: '🌎 阿根廷' },
  { value: '智利', label: '🏔️ 智利' },
  { value: '秘鲁', label: '🏛️ 秘鲁' },
  { value: '南非', label: '🦁 南非' },
  { value: '埃及', label: '🏺 埃及' },
  { value: '迪拜', label: '🏙️ 迪拜' },
  { value: '阿联酋', label: '🏜️ 阿联酋' },
];

// 动态目的地选项（包含预设和用户输入）
const filteredDestinationOptions = ref(presetDestinations);

// 检查是否是预设目的地
const isPresetDestination = (value: string) => {
  return presetDestinations.some((item) => item.value === value);
};

// 处理目的地搜索
const handleDestinationSearch = (value: string) => {
  searchKeyword.value = value;
  if (!value) {
    filteredDestinationOptions.value = presetDestinations;
    return;
  }

  // 过滤预设目的地
  const filtered = presetDestinations.filter(
    (item) =>
      item.value.toLowerCase().includes(value.toLowerCase()) ||
      item.label.toLowerCase().includes(value.toLowerCase())
  );

  // 如果用户输入的内容不在预设列表中，添加自定义选项
  const exactMatch = presetDestinations.find(
    (item) => item.value.toLowerCase() === value.toLowerCase()
  );

  if (!exactMatch && value.trim()) {
    filteredDestinationOptions.value = [
      ...filtered,
      { value: value.trim(), label: `✏️ ${value.trim()}（自定义）` },
    ];
  } else {
    filteredDestinationOptions.value = filtered;
  }
};

// 处理目的地选择
const handleDestinationSelect = (value: string) => {
  formData.destination = value;
  searchKeyword.value = '';
};

// 生成行程
const handlePlanItinerary = async () => {
  const destination = formData.destination.trim();
  if (!destination || !formData.style) {
    message.warning('请输入目的地并选择拍摄风格');
    return;
  }

  loading.value = true;
  try {
    const request: ItineraryPlanningRequest = {
      destination,
      duration: formData.duration,
      style: formData.style,
      interests: formData.interests.length > 0 ? formData.interests : undefined,
    };

    const response = await aiApi.planItinerary(request);
    // 处理嵌套的响应结构，取最内层的 data
    result.value = response.data?.data || response.data;
    selectedDay.value = 1;
    message.success('行程规划生成成功！');

    // 如果用户已登录，自动保存到历史记录
    if (authStore.isAuthenticated && result.value) {
      try {
        await aiApi.saveHistory({
          type: 'itinerary-planning',
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
  } finally {
    loading.value = false;
  }
};

// 获取选中日期的数据
const getSelectedDayData = () => {
  if (!result.value || !selectedDay.value) return null;
  return result.value.dailySchedule.find((day: any) => day.day === selectedDay.value);
};

// 保存行程
const handleSaveItinerary = async () => {
  try {
    await aiApi.saveHistory({
      type: 'itinerary-planning',
      input: formData,
      output: result.value,
    });
    message.success('已保存到历史记录');
  } catch (error: any) {
    message.error(error.message || '保存失败');
  }
};

// 下载行程
const handleDownloadItinerary = () => {
  const content = JSON.stringify(result.value, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `行程规划-${new Date().getTime()}.json`;
  link.click();
  window.URL.revokeObjectURL(url);
  message.success('已下载行程文件');
};

// 打印行程
const handlePrintItinerary = () => {
  window.print();
  message.success('已打开打印窗口');
};
</script>

<style scoped lang="less">
.itinerary-planning-container {
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
  gap: 20px;
}

.planning-form {
  :deep(.ant-form-item-label > label) {
    font-weight: 600;
    color: #333;

    &::after {
      content: ' ';
    }
  }

  :deep(.ant-select) {
    .ant-select-selector {
      min-height: 40px;
    }
  }
}

.destination-option {
  padding: 4px 0;
}

.custom-destination-tip {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 4px;
  color: #d46b08;
  font-size: 0.85rem;
}

.duration-display {
  text-align: center;
  font-size: 0.9rem;
  color: #999;
  margin-top: 8px;
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

.right-panel {
  padding: 30px;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  overflow-y: auto;
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

.itinerary-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.overview-card {
  padding: 20px;
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
  border-radius: 12px;
  color: white;

  h2 {
    margin: 0 0 10px 0;
    font-size: 1.3rem;
  }

  p {
    margin: 0;
    line-height: 1.6;
  }
}

.daily-schedules {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.day-card {
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: white;

  &:hover {
    border-color: #ff758c;
    background: #fff5f7;
  }

  &.active {
    border-color: #ff758c;
    background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
    color: white;

    .day-theme {
      color: white;
    }

    .day-spots .spot-tag {
      background: rgba(255, 255, 255, 0.3);
      color: white;
    }
  }

  .day-number {
    font-weight: 700;
    font-size: 1rem;
    margin-bottom: 4px;
  }

  .day-theme {
    font-size: 0.85rem;
    color: #ff758c;
    margin-bottom: 6px;
  }

  .day-spots {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;

    .spot-tag {
      font-size: 0.7rem;
      background: #f0f0f0;
      padding: 2px 4px;
      border-radius: 2px;
      white-space: nowrap;
    }
  }
}

.day-detail {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.detail-header {
  margin-bottom: 12px;

  h3 {
    margin: 0;
    color: #333;
  }
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  h4 {
    margin: 0 0 6px 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #333;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    color: #666;
    line-height: 1.5;
  }
}

.spots-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spot-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;

  .spot-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: #ff758c;
    color: white;
    border-radius: 50%;
    font-size: 0.8rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .spot-name {
    color: #666;
  }
}

.packing-list,
.local-tips {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;

  h3 {
    margin: 0 0 12px 0;
    color: #333;
    font-size: 1rem;
  }

  ul {
    margin: 0;
    padding-left: 0;
    list-style: none;

    li {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 0.9rem;
      color: #666;

      :deep(.ant-checkbox) {
        margin-right: 4px;
      }
    }
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    color: #666;
    line-height: 1.6;
  }
}

.itinerary-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;

  button {
    flex: 1;
    min-width: 120px;
  }
}

@media print {
  .left-panel {
    display: none;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .itinerary-actions {
    display: none;
  }
}
</style>
