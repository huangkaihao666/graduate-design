<template>
  <div class="embed-explore">
    <a-spin :spinning="loading">
      <template v-if="!loading || hasAnyContent">
        <!-- 热门目的地（首页同款数据） -->
        <section v-if="hotDestinations.length" class="block">
          <header class="block-head">
            <span class="block-icon" aria-hidden="true">✦</span>
            <h4 class="block-title">热门目的地</h4>
            <span class="block-sub">大家都在去的旅拍城市</span>
          </header>
          <div class="dest-scroll">
            <button
              v-for="(d, i) in hotDestinations"
              :key="`dest-${d.name}-${i}`"
              type="button"
              class="dest-card"
              @click="router.push({ path: '/booking/packages', query: { location: d.name } })"
            >
              <div class="dest-img-wrap">
                <img :src="d.image" :alt="d.name" class="dest-img" loading="lazy" />
                <div class="dest-shade" />
              </div>
              <div class="dest-caption">
                <span class="dest-name">{{ d.name }}</span>
                <span class="dest-chip">{{ d.tag }}</span>
              </div>
            </button>
          </div>
        </section>

        <!-- 热门景点 -->
        <section v-if="hotSpots.length" class="block">
          <header class="block-head">
            <span class="block-icon" aria-hidden="true">◇</span>
            <h4 class="block-title">热门景点</h4>
            <span class="block-sub">平台精选拍摄点</span>
          </header>
          <ul class="spot-list">
            <li v-for="s in hotSpots" :key="`spot-${s.id}`" class="spot-item">
              <div class="spot-head">
                <span class="spot-name">{{ s.name }}</span>
                <span v-if="s.city?.name" class="spot-city">{{ s.city.name }}</span>
                <span class="spot-cat">{{ categoryLabel(s.category) }}</span>
              </div>
              <p class="spot-intro">{{ spotIntroParagraph(s) }}</p>
            </li>
          </ul>
        </section>

        <!-- 人气套餐 -->
        <section v-if="hotPackages.length" class="block">
          <header class="block-head">
            <span class="block-icon" aria-hidden="true">◎</span>
            <h4 class="block-title">人气套餐</h4>
            <span class="block-sub">热门与推荐款一览</span>
          </header>
          <div class="pkg-stack">
            <button
              v-for="pkg in hotPackages"
              :key="`pkg-${pkg.id}`"
              type="button"
              class="pkg-row"
              @click="openPkgDetail(pkg)"
            >
              <div class="pkg-row-visual">
                <img :src="pkg.coverImage" :alt="pkg.name" loading="lazy" />
              </div>
              <div class="pkg-row-main">
                <div class="pkg-row-title">
                  <span class="pkg-loc">{{ pkg.location }}</span>
                  <span v-if="pkg.isHot" class="badge badge--hot">热</span>
                  <span v-if="pkg.isPopular" class="badge badge--pop">荐</span>
                </div>
                <p class="pkg-row-line">{{ shortPackageTitle(pkg) }}</p>
                <div class="pkg-row-meta">
                  <span>{{ pkg.duration }} 天</span>
                  <span class="dot">·</span>
                  <span>{{ spotSummary(pkg) }}</span>
                </div>
                <p class="pkg-row-desc">{{ packageListIntro(pkg) }}</p>
              </div>
              <div class="pkg-row-price">
                <span class="currency">¥</span>{{ pkg.price.toLocaleString() }}
              </div>
            </button>
          </div>
        </section>

        <div v-if="!hasAnyContent && !loading" class="embed-fallback">
          <p class="embed-fallback-title">推荐位暂无套餐与景点数据</p>
          <p class="embed-fallback-desc">
            多为后台尚未配置或接口暂不可用，<strong>与当前 AI 生成是否成功无关</strong
            >。生成完成后本窗口会自动关闭，您也可先浏览套餐。
          </p>
          <a-button type="primary" ghost @click="router.push('/booking/packages')"
            >前往套餐页</a-button
          >
        </div>
      </template>
    </a-spin>

    <!-- 套餐详情 -->
    <a-modal
      v-model:open="pkgDetailOpen"
      title="套餐详情"
      :width="600"
      :footer="null"
      wrap-class-name="embed-detail-wrap"
      :z-index="1100"
      destroy-on-close
      @cancel="closePkgDetail"
    >
      <div v-if="selectedPkg" class="detail-pkg">
        <div class="detail-pkg-hero">
          <a-image
            v-for="(img, i) in pkgHeroImages"
            :key="`ph-${i}`"
            :src="img"
            :preview="true"
            class="detail-pkg-img"
          />
        </div>
        <h3 class="detail-pkg-h">{{ displayName(selectedPkg) }}</h3>
        <p class="detail-pkg-price">¥{{ selectedPkg.price.toLocaleString() }}</p>
        <p class="detail-pkg-desc">{{ selectedPkg.description }}</p>
        <div v-if="pkgSpotBlocks.length" class="detail-pkg-spots">
          <p class="detail-pkg-label">关联景点</p>
          <div v-for="(b, i) in pkgSpotBlocks" :key="`pbs-${i}`" class="detail-spot-line">
            <strong>{{ b.name }}</strong>
            <span v-if="b.text">{{ b.text }}</span>
          </div>
        </div>
        <a-button
          v-if="authStore.isAuthenticated"
          type="primary"
          block
          class="detail-pkg-btn"
          @click="handleBook(selectedPkg)"
        >
          立即预约
        </a-button>
        <p v-else class="detail-pkg-tip">登录后可预约该套餐</p>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { packagesApi, type HotDestinationItem, type Package } from '@/api/packages';

function embedFallbackDestImage(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fce7f3"/><stop offset="100%" stop-color="#e9d5ff"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="system-ui,sans-serif" font-size="26">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 接口无数据时的兜底目的地，避免等待弹窗内出现「暂无推荐」误导为生成失败 */
const EMBED_FALLBACK_DESTINATIONS: HotDestinationItem[] = [
  { name: '大理', tag: '苍山洱海', image: embedFallbackDestImage('大理') },
  { name: '丽江', tag: '古城雪山', image: embedFallbackDestImage('丽江') },
  { name: '三亚', tag: '海岛阳光', image: embedFallbackDestImage('三亚') },
  { name: '厦门', tag: '滨海文艺', image: embedFallbackDestImage('厦门') },
];
import { spotsApi, type Spot } from '@/api/spots';
import { TRAVEL_STYLE_LABELS } from '@/constants/travel-style-labels';
import { useAuthStore } from '@/store/auth';
import { message } from 'ant-design-vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const loading = ref(true);
const hotDestinations = ref<HotDestinationItem[]>([]);
const hotSpots = ref<Spot[]>([]);
const hotPackages = ref<Package[]>([]);

const pkgDetailOpen = ref(false);
const selectedPkg = ref<Package | null>(null);

const hasAnyContent = computed(
  () =>
    hotDestinations.value.length > 0 || hotSpots.value.length > 0 || hotPackages.value.length > 0
);

const pkgHeroImages = computed(() => {
  const p = selectedPkg.value;
  if (!p) return [] as string[];
  return [p.coverImage, ...(p.images || [])].filter(Boolean).slice(0, 2) as string[];
});

const pkgSpotBlocks = computed(() => {
  const p = selectedPkg.value;
  if (!p) return [] as { name: string; text: string }[];
  const names = Array.isArray(p.spotNames)
    ? p.spotNames.map((x) => String(x || '').trim()).filter(Boolean)
    : p.spotName
      ? [String(p.spotName).trim()]
      : [];
  return names.map((name) => ({ name, text: '' }));
});

function categoryLabel(c: string) {
  const x = String(c || '').trim();
  return x || '旅拍';
}

/** 字数目标：约 80～120 字（与示例「丽江古城」段落信息量相当） */
const SPOT_INTRO_MIN = 80;
const SPOT_INTRO_MAX = 125;

/**
 * 按景点名优先、再按城市匹配的预设介绍（具体地名与平台数据一致时展示更详实文案）
 * key 越长越应靠前，避免「丽江」误匹配「丽江古城」之前被短词抢走（故按 key 长度降序遍历）
 */
const SPOT_INTRO_PRESETS: Array<{ key: string; text: string }> = [
  {
    key: '丽江古城',
    text: '丽江古城是国内热门婚纱旅拍地，完整保留纳西族传统风貌。青石板路、流水古巷、木府、四方街等都是标志性取景地，可拍复古人文、清新氛围感等多种风格。周边可搭配玉龙雪山、蓝月谷等自然景观，一站式解锁多元旅拍体验。全年气候舒适，配套完善，是新人旅拍的优质选择。',
  },
  {
    key: '玉龙雪山',
    text: '玉龙雪山海拔落差大、雪峰清晰，是云南极具辨识度的自然背景。云杉坪、牦牛坪与冰川公园一带开阔感强，适合大场景婚纱与仪式感造型；晴天质感通透，阴天则偏清冷电影感。需注意海拔与风力，服装以轻便保暖为宜，与古城、蓝月谷组合可形成「人文+自然」双线旅拍。',
  },
  {
    key: '蓝月谷',
    text: '蓝月谷湖水呈蒂芙尼蓝绿调，背倚玉龙雪山，画面色彩饱和而干净，极适合轻纱、韩式简约与清新系礼服。栈道与湖面倒影易出片，建议错峰拍摄以避开人流高峰。可与雪山、古城串联成一日动线，光线以上午侧光与傍晚柔光为佳，注意防晒与高反差曝光控制。',
  },
  {
    key: '洱海',
    text: '洱海环湖视野开阔，苍山为屏，是国内经典「山海同框」旅拍带。双廊、磻溪弯道、龙龛码头等点位层次各异，可拍文艺、胶片感与轻法式风格。环湖公路与湿地栈道适合走动与回眸抓拍，季节与云层变化大，建议预留机动时段；配套民宿与妆造资源成熟，适合多日深度旅拍。',
  },
  {
    key: '大理古城',
    text: '大理古城白墙黛瓦与石板街巷兼具烟火气与文艺感，适合复古、新中式与松弛感婚纱。人民路、洋人街与城楼一带可拍人文纪实，近郊田园与洱海衔接方便。昼夜光线差异明显，傍晚暖调尤其适合情绪片；古城步行区需注意游客动线，与洱海、喜洲联动可丰富场景类型。',
  },
  {
    key: '三亚',
    text: '三亚滨海阳光充足，椰林、沙滩与礁石层次丰富，是海岛婚纱与度假风主场地。亚龙湾、海棠湾、蜈支洲岛等水质与沙质各异，可拍清新、时尚与轻冒险风格。注意潮汐与正午顶光，清晨与黄金时段更易获得柔和肤色；雨季备雨具与室内备选方案，配套酒店与旅拍服务成熟。',
  },
  {
    key: '厦门',
    text: '厦门兼具鼓浪屿建筑肌理、环岛路海岸线与城市文艺街区，可拍复古、清新与都市轻旅拍。老别墅、花砖巷与海边栈道点位多元，适合半日古城半日海景的组合动线。海风与盐雾对妆发有影响，建议定型与补妆随行；节假日客流大，需提前规划机位与通行时间。',
  },
  {
    key: '青岛',
    text: '青岛红瓦绿树与海岸线并存，八大关、海滨木栈道与啤酒城周边可拍欧式街景与海景双主题。四季海风明显，裙摆与头纱动态感强，适合抓拍行走与回眸。阴天海面色阶柔和，晴天对比鲜明；老城坡道与石板路需注意鞋履舒适，可与崂山自然风光做延伸拍摄。',
  },
  {
    key: '巴厘岛',
    text: '巴厘岛梯田、悬崖海景与寺庙建筑并存，度假氛围浓厚，适合森系、波西米亚与仪式感婚纱。乌布、乌鲁瓦图与水明漾风格差异大，建议按区域排日程而非赶场。热带阵雨频繁，宜备透明伞与室内备选；宗教场所需尊重着装与拍摄规定，与酒店私享沙滩可拍更私密画面。',
  },
  {
    key: '马尔代夫',
    text: '马尔代夫一岛一酒店，水清沙白、层次单一而纯净，极适合极简韩式与海岛高定风。水上屋栈道、拖尾沙滩与潟湖倒影是标志机位，光线以日出日落最柔。需注意强烈紫外线与反光，妆面宜哑光持久；内飞与水飞衔接耗时，拍摄日建议留足缓冲，蜜月与婚拍服务成熟。',
  },
  {
    key: '普吉岛',
    text: '普吉岛海滩、悬崖与老街场景切换灵活，可拍海岛松弛、泰式人文与轻复古。卡塔、卡伦与神仙半岛适合日落大片，老镇彩墙适合活泼色彩礼服。雨季海况变化快，安全优先；摩托车与包车动线常见，建议与摄影师确认许可拍摄点，搭配斯米兰等离岛可拓展一日外景。',
  },
  {
    key: '丽江',
    text: '丽江集古城、雪山与高原湖泊于一体，旅拍风格跨度大。除古城纳西风貌外，束河、白沙与拉市海等点位气质不同，可兼顾人文与轻自然。海拔与昼夜温差需纳入造型与休息安排；紫外线强，妆造宜清透持久，与香格里拉一线联动适合时间充裕的深度行程。',
  },
  {
    key: '大理',
    text: '大理以苍山洱海为轴，古城、喜洲与环湖公路形成经典三角动线，适合文艺、胶片与轻法式婚纱。白族民居与麦田、油菜花季时令感强，拍摄需结合季节与天气。环湖风大，头纱与裙摆需固定辅助；日照充足，注意曝光与阴影过渡，配套民宿与用车便于多日创作。',
  },
];

function presetSpotIntro(name: string, city: string): string | null {
  const n = name.trim();
  const c = city.trim();
  const ordered = [...SPOT_INTRO_PRESETS].sort((a, b) => b.key.length - a.key.length);
  for (const p of ordered) {
    if (n.includes(p.key)) {
      return p.text;
    }
  }
  for (const p of ordered) {
    if (c.includes(p.key)) {
      return p.text;
    }
  }
  return null;
}

/** 稳定哈希，用于在同一批景点间轮换不同句式（非随机，刷新不变） */
function spotPhraseSeed(s: Spot): number {
  const name = String(s.name || '');
  const city = String(s.city?.name || '');
  let h = Number(s.id) || 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 33 + name.charCodeAt(i)) >>> 0;
  }
  for (let i = 0; i < city.length; i++) {
    h = (h * 37 + city.charCodeAt(i)) >>> 0;
  }
  h ^= String(s.category || '').length * 17;
  return h;
}

function clampIntro(text: string, minLen: number, maxLen: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) {
    if (t.length >= minLen) return t;
    return t;
  }
  return `${t.slice(0, maxLen - 1)}…`;
}

/**
 * 热门景点：约 100 字、结合接口描述与城市/分类等真实字段；句式随 seed 轮换，避免篇篇雷同。
 */
function spotIntroParagraph(s: Spot): string {
  try {
    return spotIntroParagraphInner(s);
  } catch (e) {
    console.warn('[PackagesBrowseEmbed] spotIntroParagraph', e);
    const n = String(s?.name || '景点').trim();
    const c = s?.city?.name ? `位于${s.city.name}，` : '';
    return `「${n}」${c}为平台精选旅拍取景参考点，具体以现场环境为准。`;
  }
}

function spotIntroParagraphInner(s: Spot): string {
  const name = String(s.name || '该景点').trim();
  const city = String(s.city?.name || '').trim();
  const cat = categoryLabel(s.category);
  const raw = String(s.description || '').trim();
  const seed = spotPhraseSeed(s);

  const preset = presetSpotIntro(name, city);
  if (preset) {
    return preset.length > SPOT_INTRO_MAX + 40
      ? `${preset.slice(0, SPOT_INTRO_MAX + 38)}…`
      : preset;
  }

  // 后端已有较长说明：直接采用或略截断
  if (raw.length >= SPOT_INTRO_MIN) {
    return clampIntro(raw, SPOT_INTRO_MIN, SPOT_INTRO_MAX + 25);
  }

  // 中等长度简介：保留原句 + 两段补充，凑足约 80～120 字
  if (raw.length >= 10) {
    const seg2 = [
      `${city || '当地'}旅拍动线中，可与${cat}造型统一气质；宜控制景深与人物占比，兼顾环境交代与情绪特写。`,
      `外拍建议多走位、轻互动，用${cat}场景串联服装与背景；晨昏侧光更易表现肤质与纱料层次。`,
      `${city ? `${city}一带` : '该区域'}层次多变，可先选中远景主场景，再用半身与细节镜头收束叙事。`,
      `阴天柔光下${cat}调性更柔和，适合情绪片；晴天注意阴影过渡与补光，避免面部过硬。`,
    ];
    const seg3 = [
      '可与摄影师确认动线顺序与备用机位，错峰拍摄更从容。',
      '双人拍摄可尝试错位与轻拥，增强纵深；单人可多利用回眸与裙摆动态。',
      '注意鞋履与裙摆安全，热门时段预留等待与转场时间。',
    ];
    let merged = `${raw}${seg2[seed % seg2.length]}${seg3[(seed >> 4) % seg3.length]}`;
    if (merged.length < SPOT_INTRO_MIN) {
      merged += '整体配套与可达性较好，适合作为婚拍行程中的主力或衔接场景。';
    }
    return clampIntro(merged, SPOT_INTRO_MIN, SPOT_INTRO_MAX + 35);
  }

  // 无简介或极短：多句式长模板轮换（每条约 90～115 字），仅基于真实名称/城市/分类组织语言
  const loc = city ? `「${name}」位于${city}` : `「${name}」`;
  const blocks: string[] = [
    `${loc}，是国内新人常选的婚纱旅拍取景地之一，整体偏${cat}气质，场景层次与留白适合环境人像。标志性视角与步行区域可拍复古人文、清新氛围等多种风格，建议结合晨昏光线安排主拍时段。周边往往可搭配同城的自然景观或街区做动线延伸，一站式丰富成片类型。气候与配套相对成熟，提前沟通机位与通行，更易获得稳定出片。`,
    `${loc}，保留较完整的地域风貌与街巷肌理，石板路与建筑轮廓易形成纵深感，适合${cat}调性婚纱与轻礼服。拍摄时可兼顾大环境与局部特写，行走、回眸与轻互动能减少僵硬摆姿。若与邻近湖泊、山地或海滨联动，可在同一行程中解锁多元场景。注意旺季客流与机位排队，预留缓冲时间更从容。`,
    `${city ? `${city}的` : ''}「${name}」以${cat}氛围见长，点与点之间动线清晰，利于摄影师规划主线与备选机位。婚纱造型可与环境色彩呼应，顺光干净、侧光立体，阴天则偏柔和叙事。建议准备定型与补妆，海风或步行较多时保持妆发利落。整体体验与旅拍服务链较完善，适合作为婚拍目的地的重要一站。`,
    `${loc}，背景元素与人物距离适中，适合半身与环境人像交替拍摄，${cat}场景下色调统一更易后期。可优先选择结构清晰、游客干扰较少的角落，再用广角交代环境关系。双人拍摄注意地平线与人眼高度，单人可多利用手部与裙摆增加线条。与同城其他地标组合时，建议分上下午场次，避免光线过硬。`,
    `${city ? `来到${city}，` : ''}「${name}」呈现鲜明的${cat}观感，昼夜光线差异会带来完全不同的氛围，傍晚暖调尤其适合情绪片。拍摄时注意曝光与高光溢出，婚纱高亮区域宜略欠曝保护细节。若行程含山海或古城联动，可形成人文与自然双线体验。配套交通与休息点相对齐全，新人筹备成本可控。`,
    `${loc}，适合作为${cat}风格婚纱的主场景或过渡场景，前景、中景与远景可分层构图，增强画册感。建议与摄影师确认焦段与站位，避免人物比例与环境脱节。天气变化时准备雨具或室内备选，保持节奏弹性。整体而言，该点位在旅拍圈认可度较高，是兼顾出片率与体验感的优质选择。`,
  ];
  return clampIntro(blocks[seed % blocks.length], SPOT_INTRO_MIN, SPOT_INTRO_MAX + 30);
}

function spotSummary(pkg: Package) {
  const names = Array.isArray(pkg.spotNames)
    ? pkg.spotNames.map((x) => String(x || '').trim()).filter(Boolean)
    : pkg.spotName
      ? [String(pkg.spotName).trim()]
      : [];
  if (!names.length) return '含经典取景';
  const t = names.join('、');
  return t.length > 14 ? `${t.slice(0, 14)}…` : t;
}

function shortPackageTitle(pkg: Package) {
  const style = TRAVEL_STYLE_LABELS[pkg.style] || pkg.style;
  return `${style}风格 · ${pkg.duration}日行程`;
}

/** 人气套餐列表：展示后端套餐介绍，缺省时简短兜底 */
function packageListIntro(pkg: Package): string {
  const d = String(pkg.description || '').trim();
  if (d) {
    return d;
  }
  const style = TRAVEL_STYLE_LABELS[pkg.style] || pkg.style;
  return `${pkg.location}${pkg.duration}日${style}旅拍套餐，含经典取景与行程服务，详情以预约页为准。`;
}

function displayName(pkg: Package) {
  return `${pkg.location}${pkg.duration}日${TRAVEL_STYLE_LABELS[pkg.style] || pkg.style}旅拍套餐`;
}

function pickHotPackages(items: Package[]): Package[] {
  const list = [...items];
  const score = (p: Package) => (p.isHot ? 3 : 0) + (p.isPopular ? 3 : 0);
  list.sort((a, b) => score(b) - score(a));
  const out = list.slice(0, 6);
  return out.length ? out : list.slice(0, 4);
}

function pickHotSpots(spots: Spot[]) {
  const rec = spots.filter((s) => s.recommended);
  const base = rec.length ? rec : spots;
  return base.slice(0, 8);
}

async function load() {
  loading.value = true;
  try {
    const [destRes, pkgRes, spotRes] = await Promise.all([
      packagesApi.getHotDestinations().catch(() => ({ items: [] as HotDestinationItem[] })),
      packagesApi.getPackages().catch(() => ({ items: [] as Package[] })),
      spotsApi.getPublic().catch(() => [] as Spot[]),
    ]);
    let destItems = Array.isArray(destRes.items) ? destRes.items.slice(0, 12) : [];
    if (!destItems.length) {
      destItems = [...EMBED_FALLBACK_DESTINATIONS];
    }
    hotDestinations.value = destItems;
    const pkgs = pkgRes.items ?? [];
    hotPackages.value = pickHotPackages(pkgs);
    hotSpots.value = pickHotSpots(Array.isArray(spotRes) ? spotRes : []);
  } catch (e) {
    console.error(e);
    message.error('加载推荐内容失败');
  } finally {
    loading.value = false;
  }
}

function openPkgDetail(pkg: Package) {
  selectedPkg.value = pkg;
  pkgDetailOpen.value = true;
}

function closePkgDetail() {
  pkgDetailOpen.value = false;
  selectedPkg.value = null;
}

function handleBook(pkg: Package) {
  if (!authStore.isAuthenticated) {
    message.warning('请先登录后再预约');
    router.push('/login');
    return;
  }
  router.push({ path: '/booking/order', query: { packageId: String(pkg.id) } });
}

onMounted(() => {
  void load();
});
</script>

<style scoped lang="less">
.embed-explore {
  --embed-rose: #fb7185;
  --embed-rose-d: #e11d48;
  --embed-slate: #0f172a;
  --embed-muted: #64748b;
  --embed-bg: linear-gradient(165deg, #faf8ff 0%, #fff5f8 40%, #ffffff 100%);
  font-size: 0.9rem;
  color: var(--embed-slate);
}

.embed-fallback {
  text-align: center;
  padding: 24px;
  color: var(--embed-muted);
}

.embed-fallback-title {
  margin: 0 0 8px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--embed-slate);
}

.embed-fallback-desc {
  margin: 0 0 16px;
  font-size: 0.88rem;
  line-height: 1.6;
  max-width: 420px;
  margin-left: auto;
  margin-right: auto;
}

.embed-fallback-desc strong {
  color: #c2410c;
  font-weight: 600;
}

.block {
  margin-bottom: 22px;

  &:last-child {
    margin-bottom: 0;
  }
}

.block-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  margin-bottom: 12px;
}

.block-icon {
  font-size: 0.75rem;
  color: var(--embed-rose);
  opacity: 0.9;
}

.block-title {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--embed-slate);
}

.block-sub {
  font-size: 0.78rem;
  color: var(--embed-muted);
  width: 100%;
  margin-left: 1.4rem;
}

/* 横向目的地 */
.dest-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 6px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(251, 113, 133, 0.35);
    border-radius: 4px;
  }
}

.dest-card {
  flex: 0 0 132px;
  width: 132px;
  scroll-snap-align: start;
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 36px rgba(225, 29, 72, 0.15);
  }
}

.dest-img-wrap {
  position: relative;
  aspect-ratio: 3 / 4;
  background: linear-gradient(145deg, #fce7f3, #e0e7ff);
}

.dest-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.dest-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 35%, rgba(15, 23, 42, 0.55) 100%);
}

.dest-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dest-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
}

.dest-chip {
  align-self: flex-start;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--embed-rose-d);
}

/* 景点列表：时间线感 */
.spot-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: var(--embed-bg);
}

.spot-item {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(241, 245, 249, 0.95);

  &:last-child {
    border-bottom: none;
  }
}

.spot-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-bottom: 8px;
}

.spot-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--embed-slate);
}

.spot-city {
  font-size: 0.75rem;
  color: var(--embed-muted);
}

.spot-cat {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(251, 113, 133, 0.12);
  color: var(--embed-rose-d);
}

.spot-intro {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.65;
  color: #475569;
  text-align: justify;
}

/* 人气套餐：竖向条带 */
.pkg-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pkg-row {
  display: flex;
  align-items: stretch;
  gap: 12px;
  width: 100%;
  padding: 0;
  border: none;
  cursor: pointer;
  text-align: left;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(110deg, #ffffff 0%, #fff1f5 48%, #f8fafc 100%);
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(253, 242, 248, 0.9);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 8px 26px rgba(225, 29, 72, 0.1);
  }
}

.pkg-row-visual {
  width: 88px;
  flex-shrink: 0;
  background: #f1f5f9;

  img {
    width: 100%;
    height: 100%;
    min-height: 96px;
    object-fit: cover;
    display: block;
  }
}

.pkg-row-main {
  flex: 1;
  min-width: 0;
  padding: 10px 8px 10px 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.pkg-row-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.pkg-loc {
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.02em;
}

.badge {
  font-size: 0.6rem;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  line-height: 1.2;

  &--hot {
    background: #fef3c7;
    color: #b45309;
  }

  &--pop {
    background: #fce7f3;
    color: #be185d;
  }
}

.pkg-row-line {
  margin: 0 0 4px;
  font-size: 0.8rem;
  color: var(--embed-muted);
}

.pkg-row-meta {
  font-size: 0.72rem;
  color: #94a3b8;

  .dot {
    margin: 0 4px;
    opacity: 0.6;
  }
}

.pkg-row-desc {
  margin: 8px 0 0;
  font-size: 0.78rem;
  line-height: 1.55;
  color: #64748b;
  text-align: justify;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  overflow: hidden;
}

.pkg-row-price {
  flex-shrink: 0;
  padding: 10px 14px 10px 0;
  align-self: center;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--embed-rose-d);
  white-space: nowrap;

  .currency {
    font-size: 0.75rem;
    font-weight: 700;
    margin-right: 1px;
  }
}

/* 详情 */
.detail-pkg-hero {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.detail-pkg-img {
  flex: 1;
  max-height: 200px;
  border-radius: 12px;
  overflow: hidden;
}

.detail-pkg-h {
  margin: 0 0 6px;
  font-size: 1.05rem;
}

.detail-pkg-price {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--embed-rose-d);
  margin-bottom: 10px;
}

.detail-pkg-desc {
  font-size: 0.88rem;
  line-height: 1.55;
  color: #475569;
  margin-bottom: 12px;
}

.detail-pkg-label {
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: 6px;
}

.detail-spot-line {
  font-size: 0.85rem;
  margin-bottom: 4px;
  color: #475569;
}

.detail-pkg-btn {
  margin-top: 8px;
}

.detail-pkg-tip {
  text-align: center;
  font-size: 0.82rem;
  color: #94a3b8;
  margin-top: 8px;
}
</style>

<style lang="less">
.embed-detail-wrap .ant-modal-header {
  border-bottom: 1px solid #f1f5f9;
}
</style>
