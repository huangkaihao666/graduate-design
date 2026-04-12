import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Prisma, type VirtualTryOnHistory } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

/** 与前端 MakeupAI.vue 选项保持一致 */
const MAKEUP_ADVISOR_FACE_SHAPES = [
  '鹅蛋脸',
  '圆脸',
  '方脸',
  '方圆脸',
  '长脸',
  '心形脸',
  '菱形脸',
] as const;

const MAKEUP_ADVISOR_SKIN_TONES = [
  '冷白皮',
  '中性肤色',
  '暖黄皮',
  '小麦色',
  '偏红肌',
  '偏暗沉',
] as const;

const MAKEUP_ADVISOR_FEATURES = [
  '单眼皮',
  '内双',
  '双眼皮',
  '眼距偏宽',
  '眼距偏近',
  '黑眼圈明显',
  '鼻梁偏低',
  '高鼻梁',
  '面中偏短',
  '面中偏长',
  '唇形偏薄',
  '唇形偏厚',
  '嘴角偏下',
  '痘痘肌/闭口',
  '毛孔明显/出油',
  '干皮/卡粉',
  '平眉',
  '挑眉',
  '弯眉',
  '眉峰明显',
  '眉毛偏粗',
  '眉毛偏细',
] as const;

/** 照片中可见皮肤状态（非诊断，仅妆面参考） */
const MAKEUP_ADVISOR_SKIN_VISIBLE = [
  '未见明显瑕疵',
  '略有暗沉',
  '可见泛红',
  '可见痘印',
  'T区油光/毛孔可见',
  '干燥起皮可见',
] as const;

/** 三庭五眼大致比例倾向（粗粒度） */
const MAKEUP_ADVISOR_FACE_RATIO = [
  '上庭略长',
  '上庭略短',
  '中庭略长',
  '中庭略短',
  '下庭略长',
  '下庭略短',
  '眼距略宽',
  '眼距略窄',
  '三庭比例较均衡',
  '五眼比例较均衡',
] as const;

/** 适合的妆容风格标签（可多选） */
const MAKEUP_ADVISOR_MAKEUP_STYLES = [
  '可爱',
  '御姐',
  '清冷',
  '温柔知性',
  '元气少女',
  '气场全开',
  '伪素颜',
  '复古文艺',
  '轻熟优雅',
] as const;

export type MakeupAdvisorFaceAnalysisResult = {
  faceShape?: string;
  skinTone?: string;
  features: string[];
  /** 可见皮肤状态（证件照可见范围内） */
  skinVisible: string[];
  /** 三庭五眼大致倾向 */
  faceRatio: string[];
  /** 推荐妆容风格 */
  makeupStyles: string[];
  rawNote?: string;
};

/** 虚拍出镜：女生（新娘）/ 男生（新郎）/ 双人合影 */
export type VirtualTryOnSubjectRole = 'female' | 'male' | 'couple';
export type VirtualTryOnHistoryScene =
  | 'all'
  | 'virtual-try-on'
  | 'makeup-try-on';

export interface VirtualTryOnRequest {
  imageUrl: string;
  style: string;
  /** 仅面部试妆：不换装、不换背景 */
  makeupOnly?: boolean;
  /** 默认 female，与前端「出镜方式」一致 */
  subjectRole?: VirtualTryOnSubjectRole;
  preferences?: {
    makeup?: string;
    hairstyle?: string;
    dress?: string;
    accessory?: string;
  };
  /**
   * 与 preferences 各字段对应的展示文案（中文），用于火山图生图 prompt，
   * 避免仅传 code 导致模型无法落实发型/服装。
   */
  preferenceLabels?: {
    makeup?: string;
    hairstyle?: string;
    dress?: string;
    accessory?: string;
  };
  /**
   * 双人合影时：由前端递增（同会话同风格），用于轮换「双人姿态」提示，避免每次生成同一动作。
   * 未传时后端在池内随机取一条。
   */
  poseVariantIndex?: number;
}

/** 用户端：自定义提示词图生图测试 */
export interface PromptImageTestRequest {
  imageUrl: string;
  prompt: string;
}

// 火山引擎图像生成 API 请求接口
export interface VolcesImageRequest {
  model: string;
  prompt: string;
  image: string;
  sequential_image_generation: string;
  response_format: string;
  size: string;
  stream: boolean;
  watermark: boolean;
}

export interface StyleRecommendationRequest {
  preferences: string;
  budget?: number;
  occasions?: string[];
}

export interface ItineraryPlanningRequest {
  destination: string;
  duration: number;
  style: string;
  interests?: string[];
}

export interface CustomerSupportMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CustomerSupportRequest {
  question: string;
  history?: CustomerSupportMessage[];
}

/** 智能客服对话角色（由登录用户邮箱 + workerKind 等解析） */
export type CustomerSupportPersona =
  | 'guest'
  | 'end_user'
  | 'end_user_demo'
  | 'photographer'
  | 'makeup_artist'
  | 'worker_generic'
  | 'admin';

function normalizeSupportEmail(email?: string | null): string {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

/** 演示/内置账号与角色映射（与库内 workerKind 互补） */
const DEMO_PHOTOGRAPHER_EMAILS = new Set([
  'lin@qq.com',
  'zhang@qq.com',
  'chen@qq.com',
]);
const DEMO_MAKEUP_EMAILS = new Set(['hzs@qq.com', 'zhou@qq.com', 'yan@qq.com']);
const DEMO_CUSTOMER_EMAIL = '3320704979@qq.com';

export function resolveCustomerSupportPersona(
  user:
    | {
        email?: string | null;
        role?: string | null;
        workerKind?: string | null;
      }
    | null
    | undefined,
): CustomerSupportPersona {
  if (!user) return 'guest';
  const email = normalizeSupportEmail(user.email);
  const role = String(user.role || '').toLowerCase();
  const workerKind = String(user.workerKind || '')
    .trim()
    .toLowerCase();

  if (role === 'admin') return 'admin';

  if (role === 'worker') {
    if (DEMO_PHOTOGRAPHER_EMAILS.has(email)) return 'photographer';
    if (DEMO_MAKEUP_EMAILS.has(email)) return 'makeup_artist';
    if (workerKind === 'photographer') return 'photographer';
    if (workerKind === 'makeup') return 'makeup_artist';
    return 'worker_generic';
  }

  if (role === 'user') {
    if (email === DEMO_CUSTOMER_EMAIL) return 'end_user_demo';
    return 'end_user';
  }

  return 'guest';
}

function buildCustomerSupportSystemPrompt(
  persona: CustomerSupportPersona,
): string {
  const commonRules = `
回答要求：
1. 若问题信息不足，请先提出 1-2 个澄清问题，不要编造不存在的规则。
2. 回答要简洁、可执行，可用分点形式。
3. 若涉及退款、账号异常等需人工介入的问题，请明确建议联系人工客服并说明需准备的信息（订单号、手机号、截图等）。
`.trim();

  const guestOrUserBase = `
你是「旅拍·智享」平台的智能客服助手，请使用中文回答。

服务对象：未登录访客或平台终端用户（消费者）。
优先解答：套餐浏览、下单预约、支付、订单、收藏、AI 功能（风格推荐、行程规划、试妆等）、账号与登录。
`.trim();

  switch (persona) {
    case 'guest':
      return `${guestOrUserBase}\n${commonRules}`.trim();
    case 'end_user':
      return `${guestOrUserBase}\n当前对话对象为已登录的终端用户，可按「我的订单/我的收藏」等消费者场景举例说明。\n${commonRules}`.trim();
    case 'end_user_demo':
      return `${guestOrUserBase}\n【重要】当前登录邮箱为演示用消费者账号（3320704979@qq.com），回答时默认对方是终端用户，举例与指引以消费者侧操作为主。\n${commonRules}`.trim();
    case 'photographer':
      return `
你是「旅拍·智享」平台的工作人员侧智能助手，请使用中文回答。

【当前用户角色】摄影师（工作台账号；演示邮箱含 lin@qq.com、zhang@qq.com、chen@qq.com 等均按摄影师上下文理解）。

请优先围绕摄影师工作流解答：接单与订单状态、档期与休息日、作品/相册管理、定制需求广场、消息中心、与个人中心相关的档案/审核/固定合作妆造师绑定与解除等。
不要按「我要下单买套餐」的消费者口吻回答，除非用户明确在替客户咨询。
${commonRules}
`.trim();
    case 'makeup_artist':
      return `
你是「旅拍·智享」平台的工作人员侧智能助手，请使用中文回答。

【当前用户角色】妆造师（工作台账号；演示邮箱含 hzs@qq.com、zhou@qq.com、yan@qq.com 等均按妆造师上下文理解）。

请优先围绕妆造师工作流解答：订单与妆造任务、合作邀请与固定合作摄影师、个人中心资料与审核、「妆容建议」类 AI 功能使用说明、消息通知等。
不要默认对方是下单消费者，除非用户明确在替客户咨询。
${commonRules}
`.trim();
    case 'worker_generic':
      return `
你是「旅拍·智享」平台的工作人员侧智能助手，请使用中文回答。

【当前用户角色】平台工作人员（摄影师/妆造师子类型未明确或需通用说明时）。请兼顾摄影师与妆造师两侧常见操作：订单、档期、作品、消息、个人中心与合作绑定等，必要时可先问清对方是摄影还是妆造岗位。
${commonRules}
`.trim();
    case 'admin':
      return `
你是「旅拍·智享」平台的智能助手，请使用中文回答。

【当前用户角色】管理员或运营侧。可涉及后台管理、内容维护、用户与订单排查思路等；涉及敏感操作时请说明权限与审计要求，避免编造具体后台菜单路径。
${commonRules}
`.trim();
    default:
      return `${guestOrUserBase}\n${commonRules}`.trim();
  }
}

/** 管理端：景点介绍 AI 草稿（DeepSeek）；配图由后台调用图库 API 检索并下载为 data URL */
export interface SpotDraftRequest {
  cityName: string;
  spotName: string;
  /** 风格分类展示名或 key */
  category?: string;
}

export interface SpotDraftResult {
  description: string;
  /**
   * 可直接用于 <img src> 与写入景点 images 的 data URL（后台已从 Pexels/Unsplash 拉取）
   */
  imageUrls: string[];
  /** 配图说明或配置提示 */
  imagesNote?: string;
  /** 中文搜图关键词（展示用，可选） */
  imageSearchQuery: string;
}

/** 管理端：套餐介绍文案（仅文本，不配图） */
export interface PackageDescriptionDraftRequest {
  location: string;
  /** 关联景点名称（可选） */
  spotName?: string;
  /** 关联多个景点名称（可选，优先于 spotName） */
  spotNames?: string[];
  /** 拍摄风格展示名，如「韩式简约」 */
  styleLabel: string;
  priceYuan: number;
  durationDays: number;
  /** 可选：亮点摘要，供模型提炼 */
  featuresHint?: string;
}

export interface PackageDescriptionDraftResult {
  description: string;
  features: string[];
  includes: string[];
  excludes: string[];
}

export interface CustomerSupportHistoryList {
  items: Array<{
    id: number;
    question: string;
    answer: string;
    title: string | null;
    isPinned: boolean;
    pinnedAt: Date | null;
    createdAt: Date;
  }>;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
  /** 中国时区日历日，供前端「今天/昨天」分组，避免客户端系统日期或时区不一致 */
  grouping: {
    today: string;
    yesterday: string;
  };
}

@Injectable()
export class AiService {
  /** 中国时区 YYYY-MM-DD，与前端历史分组一致 */
  private static shanghaiYmd(d: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (y && m && day) return `${y}-${m}-${day}`;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }

  private static shanghaiYesterdayYmd(todayYmd: string): string {
    const [y, m, d] = todayYmd.split('-').map(Number);
    const noon = new Date(
      `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00+08:00`,
    );
    const prev = new Date(noon.getTime() - 86400000);
    return AiService.shanghaiYmd(prev);
  }

  // 火山引擎（字节跳动）方舟：官方文档常用 ARK_API_KEY，与本项目 VOLCES_API_KEY 二选一即可
  private readonly volcesApiKey =
    process.env.VOLCES_API_KEY?.trim() || process.env.ARK_API_KEY?.trim() || '';
  private readonly volcesApiUrl =
    process.env.VOLCES_API_URL ||
    'https://ark.cn-beijing.volces.com/api/v3/images/generations';
  private readonly volcesModel =
    process.env.VOLCES_MODEL || 'doubao-seedream-4-5-251128';
  /** 方舟「图片理解」对话：与图像生成不同，需单独创建支持视觉的推理接入点，model 填 ep-xxx */
  private readonly volcesChatCompletionsUrl =
    process.env.VOLCES_CHAT_URL?.trim() ||
    'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  private readonly volcesVisionChatModel =
    process.env.VOLCES_VISION_CHAT_MODEL?.trim() || '';

  // DeepSeek API 配置
  private readonly deepseekApiKey =
    process.env.DEEPSEEK_API_KEY || 'sk-9ac47d9827ba4f20be971e7dace87264';
  private readonly deepseekBaseURL =
    'https://api.deepseek.com/chat/completions';
  constructor(private readonly prisma: PrismaService) {
    console.log('[AI Service] 初始化配置:');
    console.log(
      '[AI Service] Volces API Key:',
      this.volcesApiKey
        ? `${this.volcesApiKey.substring(0, 8)}...`
        : 'NOT_SET（请配置 VOLCES_API_KEY 或 ARK_API_KEY）',
    );
    console.log('[AI Service] Volces Model:', this.volcesModel);
    console.log('[AI Service] Volces URL:', this.volcesApiUrl);
    console.log(
      '[AI Service] 妆容识别人脸（方舟视觉）:',
      this.volcesVisionChatModel
        ? `model=${this.volcesVisionChatModel.substring(0, 12)}... chat=${this.volcesChatCompletionsUrl}`
        : 'VOLCES_VISION_CHAT_MODEL 未配置',
    );
    console.log(
      '[AI Service] DeepSeek API Key:',
      this.deepseekApiKey.substring(0, 20) + '...',
    );
  }

  /**
   * 韩式简约：女生单人 / 男生单人 / 男女双人 三套文案（与前端展示、图生图提示一致）
   * @param dressLabel 服装偏好文案（如含「蕾丝」则按蕾丝蓬蓬裙叙事，避免强调光滑缎面）
   */
  private getMinimalistStyleAdvice(
    subjectRole: VirtualTryOnSubjectRole,
    dressLabel?: string,
  ) {
    const dr = (dressLabel || '').trim();
    const laceBallgown = dr.includes('蕾丝');

    if (subjectRole === 'male') {
      return {
        style: 'minimalist',
        virtualAdvice:
          '男生单人：3:4竖版，浅灰米白极简纯色背景，均匀柔和漫射光，画面低饱和通透干净，附细腻胶片颗粒，沉稳又高级。多款西装造型任选：经典黑色戗驳领西装，版型挺括，搭丝质领结，绅士稳重；深灰平驳领修身西装，色调柔和，配简约领带，内敛有质感；黑色休闲单排扣西装，面料柔软，领口微开不系领带，随性松弛。发型干净清爽，无刻意雕琢感，站姿放松自然，或单手插袋、或自然垂臂，面部光影柔和，表情温和淡然，极简背景凸显利落身形，满是韩系简约绅士格调。',
        makeupAdvice:
          '男士妆面自然修容、匀净肤色，眉形整洁，唇色裸色或豆沙；避免厚重底妆，保持清爽质感。',
        hairstyleAdvice:
          '短发或侧分油头，线条利落；发丝干净不油塌，无夸张造型。',
        dressAdvice:
          '可选黑色戗驳领西装+丝质领结、深灰平驳领修身西装+简约领带、黑色休闲单排扣西装微开领；版型挺括或柔软松弛二选一，与偏好一致。',
        shootingTips: [
          '3:4 竖构图，纯色浅灰/米白背景，均匀漫射光',
          '站姿放松：单手插袋、自然垂臂、微侧身',
          '低饱和、细腻胶片颗粒，面部光影柔和',
          '突出身形线条与西装质感，韩系简约绅士画报风',
        ],
        previewDescription:
          '呈现韩系简约新郎：浅灰米白极简背景、漫射柔光、低饱和胶片感，西装挺括或休闲松弛，神态温和淡然。',
      };
    }
    if (subjectRole === 'couple') {
      if (laceBallgown) {
        return {
          style: 'minimalist',
          virtualAdvice:
            '男女双人：3:4竖版，浅灰米白极简纯色背景，柔和漫射光铺满画面，低饱和温柔色调，细腻胶片质感，氛围治愈高级。新娘蕾丝蓬蓬裙婚纱配轻薄头纱：蕾丝刺绣、镂空与薄纱层次，蓬松裙摆显甜美体量，避免强调光滑绸缎反光；新郎简约西装利落沉稳。两人自然互动，或轻拥依偎、或并肩对视、或牵手浅笑，肢体松弛无摆拍感。蕾丝裙身层次与新郎西装线条相互映衬，光影均匀细腻，极简构图+韩系画报质感，定格甜蜜瞬间。',
          makeupAdvice:
            '双人均清透低饱和妆面：新娘伪素颜感、豆沙或奶茶唇；新郎自然修容、眉形整洁，气色干净。',
          hairstyleAdvice:
            '新娘低盘或披肩配轻薄头纱；新郎短发侧分或服帖造型，与西装风格统一。',
          dressAdvice:
            '新娘蕾丝蓬蓬裙婚纱与轻薄头纱（蕾丝肌理为主，非通体光滑缎面）；新郎黑色或深灰简约西装、领结或领带任选，线条利落成对。',
          shootingTips: [
            '3:4 竖版，浅灰米白背景，漫射光均匀、无杂乱阴影',
            '互动自然：轻拥依偎、并肩对视、牵手浅笑，避免僵硬摆拍',
            '无多余道具，蕾丝裙型与西装线条呼应，极简构图',
            '低饱和、细腻胶片、韩系画报质感，甜蜜治愈氛围',
          ],
          previewDescription:
            '双人韩式简约：极简背景、漫射柔光、新娘蕾丝蓬蓬裙与新郎西装线条映衬，依偎对视自然甜蜜。',
        };
      }
      return {
        style: 'minimalist',
        virtualAdvice:
          '男女双人：3:4竖版，浅灰米白极简纯色背景，柔和漫射光铺满画面，低饱和温柔色调，细腻胶片质感，氛围治愈高级。新娘多款简约缎面婚纱随心搭，配轻薄头纱，素雅干净；新郎多款简约西装适配，利落沉稳。两人自然互动，或轻拥依偎、或并肩对视、或牵手浅笑，肢体松弛无摆拍感，表情温柔缱绻，眼神满是甜蜜。无多余道具装饰，新娘婚纱的温润缎面与新郎西装的利落线条相互映衬，光影均匀细腻，聚焦两人间的温柔情愫，极简构图+韩系画报质感，定格高级又治愈的甜蜜瞬间。',
        makeupAdvice:
          '双人均清透低饱和妆面：新娘伪素颜感、豆沙或奶茶唇；新郎自然修容、眉形整洁，气色干净。',
        hairstyleAdvice:
          '新娘低盘或披肩配轻薄头纱；新郎短发侧分或服帖造型，与西装风格统一。',
        dressAdvice:
          '新娘缎面简约婚纱与轻薄头纱；新郎黑色或深灰简约西装、领结或领带任选，线条利落成对。',
        shootingTips: [
          '3:4 竖版，浅灰米白背景，漫射光均匀、无杂乱阴影',
          '互动自然：轻拥依偎、并肩对视、牵手浅笑，避免僵硬摆拍',
          '无多余道具，缎面与西装线条呼应，极简构图',
          '低饱和、细腻胶片、韩系画报质感，甜蜜治愈氛围',
        ],
        previewDescription:
          '双人韩式简约：极简背景、漫射柔光、低饱和胶片感，缎面婚纱与西装线条映衬，依偎对视自然甜蜜。',
      };
    }
    // female
    if (laceBallgown) {
      return {
        style: 'minimalist',
        virtualAdvice:
          '女生单人：3:4竖版，纯色浅灰米白极简背景，柔和漫射光打造通透低饱和画面，自带细腻胶片质感，韩式画报风拉满。婚纱为蕾丝蓬蓬裙：上身与裙摆以蕾丝刺绣、镂空花纹与薄纱叠层为主，蓬松裙摆显甜美层次，突出蕾丝肌理与轻柔哑光质感，避免通体光滑绸缎与镜面反光。搭配轻薄短头纱，妆容清透伪素颜，低盘发散落碎发，或侧身静立、或轻提裙摆，眼神温婉松弛，嘴角含淡笑，光影柔化轮廓，温柔治愈的高级感。',
        makeupAdvice:
          '清透伪素颜：底妆轻薄透亮，眼妆裸粉或大地色，唇色豆沙/奶茶，强调肌肤质感与温柔气色。',
        hairstyleAdvice:
          '低盘髻或低马尾，额前自然碎发；搭配轻薄短头纱，线条干净不厚重。',
        dressAdvice:
          '蕾丝蓬蓬裙婚纱：蕾丝刺绣/镂空与薄纱层次，蓬松裙型；避免大面积光滑缎面主身，与偏好选项一致。',
        shootingTips: [
          '3:4 竖构图，纯色浅灰/米白极简背景，柔和漫射光',
          '姿态：侧身静立、轻提裙摆、眼神温婉，嘴角淡笑',
          '光影柔化轮廓，突出蕾丝层次与蓬松裙型',
          '画面通透低饱和，细腻胶片质感，韩式画报风',
        ],
        previewDescription:
          '女生韩式简约：浅灰米白背景、漫射柔光、蕾丝蓬蓬裙与轻纱，低盘碎发，温婉松弛，温柔治愈高级感。',
      };
    }
    return {
      style: 'minimalist',
      virtualAdvice:
        '女生单人：3:4竖版，纯色浅灰米白极简背景，柔和漫射光打造通透低饱和画面，自带细腻胶片质感，韩式画报风拉满。多款简约缎面婚纱可选：法式方领款利落显颈线，A字裙摆垂坠高级；深V心形领款温柔妩媚，修身裙摆勾勒曲线；圆领简约款干净纯粹，无多余装饰更显松弛；立领长袖款文艺复古，宽松伞裙氛围感十足。搭配轻薄短头纱，妆容清透伪素颜，低盘发散落碎发，或侧身静立、或轻提裙摆，眼神温婉松弛，嘴角含淡笑，光影柔化轮廓，缎面泛细腻光泽，尽显温柔治愈的高级感。',
      makeupAdvice:
        '清透伪素颜：底妆轻薄透亮，眼妆裸粉或大地色，唇色豆沙/奶茶，强调肌肤质感与温柔气色。',
      hairstyleAdvice:
        '低盘髻或低马尾，额前自然碎发；搭配轻薄短头纱，线条干净不厚重。',
      dressAdvice:
        '缎面简约婚纱：可选法式方领+A字垂坠、深V心形修身、圆领松弛款、立领长袖伞裙等，与偏好选项一致。',
      shootingTips: [
        '3:4 竖构图，纯色浅灰/米白极简背景，柔和漫射光',
        '姿态：侧身静立、轻提裙摆、眼神温婉，嘴角淡笑',
        '光影柔化轮廓，突出缎面细腻光泽与颈线',
        '画面通透低饱和，细腻胶片质感，韩式画报风',
      ],
      previewDescription:
        '女生韩式简约：浅灰米白背景、漫射柔光、缎面婚纱与轻纱，低盘碎发，温婉松弛，温柔治愈高级感。',
    };
  }

  /**
   * AI 虚拍 - 生成虚拍建议和修改后的图片效果（基于风格模板）
   */
  async generateVirtualTryOn(request: VirtualTryOnRequest): Promise<any> {
    const isMakeupOnly =
      request.makeupOnly === true ||
      String(request.style || '').startsWith('makeup-');
    const normalizedStyle = isMakeupOnly
      ? String(request.style || '').replace(/^makeup-/, '')
      : request.style;

    if (isMakeupOnly) {
      let modifiedImageUrl = request.imageUrl;
      try {
        modifiedImageUrl = await this.generateModifiedImage(
          request.imageUrl,
          normalizedStyle,
          'female',
          request.preferences,
          request.preferenceLabels,
          true,
        );
      } catch (imageError) {
        console.error('[AI Service] 生成面部试妆图片时出错:', imageError);
      }
      return {
        style: normalizedStyle || 'makeup',
        subjectRole: 'female',
        virtualAdvice:
          '仅进行面部妆容模拟：会保留原服装与原背景，不进行换装和换场景。',
        makeupAdvice:
          '重点优化底妆、眼妆、腮红、唇妆的协调度，保持肤质自然并提升上镜感。',
        hairstyleAdvice: '发型仅做轻微整理，不改变发长与主要造型。',
        dressAdvice: '服装保持原图，不做替换。',
        shootingTips: [
          '建议上传清晰正面照，五官无遮挡',
          '光线均匀、避免过曝或逆光',
          '妆容风格可多次切换对比后确定',
        ],
        previewDescription: '输出为原场景原服装下的面部妆容变化效果。',
        modifiedImageUrl,
      };
    }

    // 直接定义虚拍建议模板（基于风格）
    const styleAdvice: Record<string, any> = {
      romantic: {
        style: 'romantic',
        virtualAdvice:
          '虚拍画幅统一为 3:4 竖版。以上传人物为原型重绘造型与场景：情绪胶片感森系草坪婚照，东亚年轻面孔；户外草坪，背景茂密深绿色松柏乔木，多云阴天漫射自然光；复古富士胶片质感、细腻颗粒、低饱和莫兰迪色调、电影感构图；背景宜保留层次与可辨细节，避免整片奶油虚化。男女造型基准：新郎黑色西装、白衬衫、黑领结；新娘白色抹胸婚纱或大蕾丝鱼尾、大蕾丝花边长款头纱，可配白色马蹄莲手捧花。双人互动以自然纪实为主（挽手、对视、行走、坐姿等），姿态由每次生成的指令轮换，不固定为某一种；真实皮肤与发丝、蕾丝与头纱细节清晰，8K 超写实方向。',
        makeupAdvice:
          '妆容偏胶片婚礼感：清透底妆与真实肤质，眼妆以大地色、杏色、柔和粉为主，唇色豆沙/玫瑰低饱和；腮红自然晕染，整体莫兰迪低饱和，避免厚重舞台妆。',
        hairstyleAdvice:
          '新娘：大蕾丝长款头纱与发型一体考虑——披发、半扎、低盘或空气卷均可，头纱需有飘逸动态；新郎：清爽侧分、背梳或自然纹理，配胸花更贴户外婚礼。',
        dressAdvice:
          '新娘：白色抹胸婚纱、蕾丝鱼尾长袖配荷叶边超长头纱、草坪轻拖尾等择一；新郎：黑色西装三件套或塔士多，白衬衫与黑领结，与草坪场景统一。',
        shootingTips: [
          '阴天漫射光下优先均匀柔光，避免人脸死黑或背景过曝',
          '中景或全景结合：挽手漫步、对视大笑、并肩坐、整理头纱等自然互动，忌僵硬站桩；不必每次抱起新娘',
          '草地与草坪从近到远尽量清晰成像：草叶与绿色层次可辨，避免身后草坪被虚成一片色块',
          '背景松柏与草坪保留枝叶层次，像纪实旅拍而非唯美人像式强虚化',
          '色彩后期走富士胶片感：略颗粒、低饱和、肤色自然',
          '头纱与裙摆可有风感，强化浪漫动态',
        ],
        previewDescription:
          '输出接近森系草坪胶片婚照：阴天柔光、深绿松柏、草坪透气层次，莫兰迪色调与细腻颗粒，东亚新人造型与甜蜜互动，蕾丝头纱与服装细节清晰。',
      },
      artistic: {
        style: 'artistic',
        virtualAdvice:
          '虚拍画幅统一为 3:4 竖版。纪实故事风格强调旅拍人文与情绪表达，适合古镇街巷与有故事感的场景。',
        makeupAdvice:
          '可以尝试大胆的色彩搭配，如酒红色或深紫色眼影，打造艺术感十足的妆容。',
        hairstyleAdvice: '推荐蓬松的长卷发或创意编发，彰显艺术气质。',
        dressAdvice: '选择设计感强的婚纱，可考虑非传统的裁剪或材质组合。',
        shootingTips: [
          '尝试非对称构图，营造视觉张力',
          '利用前景和背景的虚实关系创造深度',
          '捕捉动态的瞬间，表现生命力',
          '使用黑白或高对比度的影像风格',
          '融入环境元素，讲述故事',
        ],
        previewDescription:
          '修改后的图片将呈现纪实故事感，构图讲究叙事，色调克制而有层次，像一页旅拍画册。',
      },
      bohemian: {
        style: 'bohemian',
        virtualAdvice:
          '虚拍画幅统一为 3:4 竖版。海岛松弛风格强调阳光、沙滩与度假感，轻盈纱裙与松弛姿态；生成时远景海浪、沙滩与天际线宜保留纹理与清晰度，减少奶油虚化，更真实自然。',
        makeupAdvice:
          '建议使用自然的棕色系妆容，配以浓密的眉毛和少量的眼线，展现自然美感。',
        hairstyleAdvice: '推荐飘逸的长卷发或编织发型，配以花卉或羽毛装饰。',
        dressAdvice: '选择流动感强的轻薄婚纱，可考虑蕾丝或刺绣元素。',
        shootingTips: [
          '选择自然风景作为背景，如草地或林间',
          '充分利用自然光线，营造柔和的光影效果',
          '鼓励模特放松姿态，表现自然随性的气质',
          '融入自然元素，如花卉或绿叶',
          '使用温暖的色调后期处理',
        ],
        previewDescription:
          '修改后的图片将呈现海岛松弛的度假氛围，光线明亮、色彩清透，人物状态自然舒展。',
      },
      classical: {
        style: 'classical',
        virtualAdvice:
          '虚拍画幅统一为 3:4 竖版。新中式国风典雅（棚拍向）：背景以室内为主，推荐纯色正红背景，简洁无杂乱道具；整体色彩以正红与暖棕为基底，服饰金绣点缀。突出人物与礼服层次。人物表情要求自然、松弛，男女均可面向镜头微笑，避免僵硬、木讷或证件照感。',
        makeupAdvice:
          '妆面以正红与暖棕为基调：唇妆正红或豆沙红，眼妆大地/棕红晕染，腮红暖棕或微醺红；肤质通透，眉形干净，喜庆而不俗气。',
        hairstyleAdvice:
          '盘发、发髻或中式编发，可配金钗、流苏；发色与暖棕、正红服饰协调。',
        dressAdvice:
          '新娘秀禾、龙凤褂、改良旗袍或新中式红裙；新郎中山装、长衫或暖棕/黑色新中式男装配红领带或盘扣细节，与纯色红背景形成层次。',
        shootingTips: [
          '场景优先室内影棚式纯色正红背景，避免室外园林抢戏（若虚拍需统一为室内红幕效果）',
          '画幅 3:4 竖构图，人物占比适中，头顶与脚下留白',
          '柔光均匀打亮面部，减少生硬阴影，突出微笑与眼神',
          '引导面向镜头微笑、自然对视或轻靠，禁止僵硬立正、面无表情',
          '后期在正红与暖棕基调上微调对比，保持肤色自然',
        ],
        previewDescription:
          '室内纯色正红背景下的新中式婚照：3:4 竖版，正红与暖棕基调，人物表情自然亲切、可含微笑，东方喜庆氛围。',
      },
      adventure: {
        style: 'adventure',
        virtualAdvice:
          '虚拍画幅统一为 3:4 竖版。旷野自由（本套参考）：中国云南大理苍山，日出「日照金山」氛围——峰峦笼罩温暖金色晨光，山间云雾缭绕，天空澄澈湛蓝；前景枯黄草坡自然户外地形。人物为 25–30 岁中国年轻情侣，真实幸福神态、眼神轻柔交汇；新娘妆容精致、波浪卷发，无肩带白色蕾丝蓬蓬婚纱配长款刺绣头纱；新郎黑色定制西装、白衬衫、黑色领结，发型可贴近原图；手捧花为约 15 朵浅粉玫瑰配绿叶。摄影向：佳能全画幅感、85mm 人像虚化、日出黄金柔逆光、5500K 暖调、三分法竖构图，人物可置于画面右侧约 1/3；8K 细腻、35mm 胶片颗粒，主体清晰、背景适度虚化散景。用户所选妆容/发型/服装/配饰在以下文案大方向内微调具体场景。',
        makeupAdvice:
          '新娘：精致上镜妆，暖金日出光下肤质通透、眼妆干净有神，腮红唇色自然不偏浓；新郎：清爽修容与眉形，肤质真实。若选冷调雪山备选妆，注意腮红宜淡。',
        hairstyleAdvice:
          '新娘首选波浪卷或大卷披肩，可半扎或风吹动感；新郎以自然纹理短发/侧分为主，可强调「贴近原图发型」的质感。',
        dressAdvice:
          '新娘：无肩带白色蕾丝蓬蓬婚纱，搭配长款刺绣头纱（或用户所选同风格拖尾/轻纱）；新郎：黑色西装三件套或定制款，白衬衫与黑领结。',
        shootingTips: [
          '日出黄金时段：柔和逆光勾勒轮廓，避免人脸死黑',
          '互动：可新娘单手撩头纱、新郎持手捧花凝望新娘，或并肩望向苍山，头纱与裙摆可有风感',
          '三分法竖构图，人物可偏画面右侧 1/3，保留天空与远山层次',
          '前景草坡可见肌理，远景苍山可虚化但需有金山与云雾的层次，勿整片糊成单色',
          '整体偏暖调胶片感，与 5500K/柔阴影一致',
        ],
        previewDescription:
          '苍山日出、金山与云雾、枯黄草坡前景，年轻情侣婚纱与西装，逆光浪漫，大片人像虚化，电影感旅拍。',
      },
    };

    // 获取对应风格的建议（韩式简约按出镜方式分三套文案；自定义风格读库）
    const subjectRole: VirtualTryOnSubjectRole =
      request.subjectRole || 'female';
    let advice =
      normalizedStyle === 'minimalist'
        ? this.getMinimalistStyleAdvice(
            subjectRole,
            request.preferenceLabels?.dress,
          )
        : styleAdvice[normalizedStyle];
    if (!advice) {
      const custom =
        await this.getVirtualTryOnAdviceForCustomStyle(normalizedStyle);
      advice = custom || styleAdvice.romantic;
    }

    const subjectVirtualPrefix: Record<VirtualTryOnSubjectRole, string> = {
      female: '【新娘/女生单人】',
      male: '【新郎/男生单人】',
      couple: '【新郎新娘双人合影】',
    };

    const mergedAdvice = {
      ...advice,
      virtualAdvice: `${subjectVirtualPrefix[subjectRole]} ${advice.virtualAdvice}`,
      subjectRole,
    };

    // 调用火山引擎 API 生成处理后的图片
    let modifiedImageUrl = request.imageUrl;
    try {
      modifiedImageUrl = await this.generateModifiedImage(
        request.imageUrl,
        normalizedStyle,
        subjectRole,
        request.preferences,
        request.preferenceLabels,
        false,
        request.poseVariantIndex,
      );
    } catch (imageError) {
      console.error('[AI Service] 生成修改图片时出错:', imageError);
      // 如果生成失败，继续使用原始图片
    }

    return {
      ...mergedAdvice,
      modifiedImageUrl,
    };
  }

  /**
   * 双人合影：轮换姿态提示（不写死公主抱；与 poseVariantIndex 组合避免连续重复）
   */
  private getCouplePosePromptPool(style: string): string[] {
    if (style === 'adventure') {
      return [
        '苍山日出背景下：新娘单手轻撩刺绣长头纱、笑容灿烂，新郎手持浅粉玫瑰花束温柔凝望新娘，头纱随风飘动。',
        '枯黄草坡上二人自然依偎，面向日照金山，新娘波浪卷发与蓬蓬蕾丝裙摆有风感。',
        '新娘侧身提裙回眸，新郎在旁轻扶腰际，远景云雾与金山层次虚化。',
        '并肩站立望向镜头，手捧花垂于身前，三分法构图人物偏右。',
        '新郎为新娘整理头纱边缘，二人额头轻近，逆光轮廓光。',
        '牵手缓行于草坡脊线，回眸对视，电影感抓拍。',
        '新娘双手捧花贴于胸前，新郎从侧后方注视，背景苍山与蓝天。',
        '二人坐于草坡高处，望向远方金山，背影与侧脸结合。',
        '新娘旋转裙摆微扬，新郎注视微笑，动态瞬间。',
        '低角度仰拍：草坡前景、人物与金山天空层次。',
        '并肩行走一前一后，头纱与西装线条利落，纪实旅拍。',
        '新娘轻靠新郎肩侧，共持手捧花，温柔对视。',
      ];
    }
    return [
      '两人并肩挽手缓步于草坪，自然对视微笑，头纱与裙摆可随风微动。',
      '新郎轻扶新娘腰际，新娘侧身回眸望向镜头，背景松柏层次清晰。',
      '两人相向而立额头轻触，双手交握于身前，氛围安静甜蜜。',
      '新娘双手轻提裙摆前行回眸，新郎在侧后方注视，纵深构图。',
      '两人并排坐于草坪边缘，肩并肩望向画外远方，松弛自然。',
      '牵手轻旋，裙摆微扬，捕捉动态瞬间，忌僵硬站桩。',
      '新郎为新娘整理头纱或捧花，近距离温柔互动，中景构图。',
      '一前一后行走于林间小径，利用纵深表现电影感。',
      '背靠背坐于草地，同时回头相视而笑，轻松俏皮。',
      '新郎从身后轻环新娘肩侧（双脚站立、地面支撑），二人望向同一远方。',
      '并肩面向镜头，新娘头靠新郎肩侧，手捧花自然垂于身前。',
      '两人低身逗弄或注视同一束手捧花，低角度纪实抓拍。',
    ];
  }

  private buildVirtualTryOnCouplePosePrompt(
    subjectRole: VirtualTryOnSubjectRole,
    style: string,
    poseVariantIndex?: number,
  ): string {
    if (subjectRole !== 'couple') return '';
    const pool = this.getCouplePosePromptPool(style);
    const n = pool.length;
    const idx =
      typeof poseVariantIndex === 'number' &&
      Number.isFinite(poseVariantIndex) &&
      poseVariantIndex >= 0
        ? poseVariantIndex % n
        : Math.floor(Math.random() * n);
    const line = pool[idx];
    return (
      ` 【双人姿态-本次必须】${line}` +
      ` 勿默认公主抱、抱起新娘、骑肩或单手托举离地；除非本句明确写出离地托举，否则人物须双脚有着地支撑。` +
      ` English: execute this couple pose; do NOT default to bridal carry / princess carry / lift-off-ground unless explicitly required here.`
    );
  }

  /**
   * 全风格统一画幅：3:4 竖版（与产品侧「竖版婚照」一致）
   */
  private buildVirtualTryOnAspectRatioPrompt(): string {
    return (
      ` 【画幅统一】无论何种拍摄风格，输出须为 3:4 竖版竖构图（高:宽=4:3 的竖向画面），禁止横向宽幅、正方形或 16:9 电影画幅。` +
      ` English: always 3:4 portrait vertical aspect ratio for all styles.`
    );
  }

  /**
   * 构图与姿态：用户反馈希望背景更多、人物不要僵硬站姿（在 3:4 竖版内取景）
   */
  private buildVirtualTryOnCompositionPrompt(): string {
    return (
      ` 【构图与背景】在 3:4 竖版画幅内采用环境人像/中远景，人物以全身或大半身（约膝盖以上）为主，在画面中占比适中（约三分之一至一半画面高度），` +
      `多保留天空、地面、地平线、建筑、树木或自然景物，背景层次清晰、透气，像旅拍大片；避免大头贴、胸口以上特写或人物撑满画面。` +
      ` 【姿态】自然放松的婚礼/旅拍纪实感：可轻微侧身、行走、回眸、手部自然摆放或与服装/环境轻互动，肩颈与手臂舒展；` +
      `避免僵硬直立正对镜头、双手紧贴裤缝、木讷证件照式站姿。` +
      ` Framing: within 3:4 vertical frame, environmental portrait, medium-wide shot, full body or 3/4 body visible, generous background and sky/ground; ` +
      `subject not oversized in frame. Pose: relaxed candid, natural movement, soft posture, not stiff standing portrait.`
    );
  }

  /**
   * 全身/大半身入镜：优化身材比例观感（显腿长、显挺拔），避免俯拍压矮
   */
  private buildVirtualTryOnBodyProportionPrompt(
    subjectRole: VirtualTryOnSubjectRole,
  ): string {
    const core =
      ` 【全身比例与显高】凡全身或膝盖以上大半身入镜，人物须修长协调：视觉腿长略拉长、腰线清晰，忌五五分、忌头大身短、忌敦实矮胖比例；` +
      `肩颈打开、站姿挺拔，可微侧身或微错步形成纵向线条；机位宜略偏低仰角（轻微即可，勿夸张拉腿变形），忌高机位俯拍把人物拍矮。` +
      ` English: full-body or 3/4: tall flattering proportions, longer legs visually, defined waist, avoid stubby or squat silhouettes; subtle low angle for height, no extreme distortion, avoid top-down shots that shorten legs.`;
    if (subjectRole === 'couple') {
      return (
        core +
        ` 双人合影时新郎新娘身形均挺拔协调，腿长比例一致、不显一方矮胖，整体像专业婚照拉长身形。`
      );
    }
    return core;
  }

  /**
   * 户外/环境类风格：抑制「唯美人像」式强虚化，背景保持可辨细节，贴近真实旅拍快照
   */
  private buildVirtualTryOnSharpBackgroundPrompt(style: string): string {
    if (style === 'adventure') {
      return (
        ` 【旷野自由·场景与景深】中国云南大理苍山，日出「日照金山」：峰峦被金色晨光笼罩，山间云雾缭绕，天空澄澈湛蓝；前景为枯黄草坡自然地形。` +
        ` 【人像与虚化】情侣主体对焦清晰锐利；背景远山与天空可呈现柔和散景虚化（类似 85mm f/1.8 人像），柔和逆光轮廓光勾勒身形，5500K 暖调、阴影柔和；远山与云雾仍须有层次与色彩渐变，禁止整片背景糊成无层次单色块。` +
        ` 【画幅】竖版 3:4，三分法构图，人物可置于画面右侧约 1/3；8K 细腻、带 35mm 胶片颗粒质感。` +
        ` English: Dali Cangshan sunrise golden peaks mist blue sky yellow grass foreground; subjects sharp; pleasant background bokeh; warm rim light; rule of thirds composition.`
      );
    }

    const outdoor = ['romantic', 'bohemian', 'artistic'];
    if (!outdoor.includes(style)) {
      return '';
    }
    const base =
      ` 【背景清晰度与景深】户外或大环境场景禁止整片背景糊成奶油色块或过度散景；` +
      `采用较深景深、小光圈旅拍感，远景草坪层次、树木枝叶、海浪沙滩、建筑轮廓与天际线等须保留可辨认纹理与层次，整体锐利自然、像婚礼跟拍纪实而非棚拍虚化样片。` +
      `人物略突出即可，勿 f/1.2 级强虚化。` +
      ` English: deep depth of field, sharp detailed background (grass, trees, sea, architecture, sky), avoid heavy bokeh blur, realistic travel-wedding documentary look.`;

    if (style === 'romantic') {
      return (
        base +
        ` 【草坪草地-必须清晰】前景、中景、远景的草地与草坪均须清晰可辨：可见草叶肌理、丛生走向与绿色深浅层次，地面草皮与裸露土壤交界亦可辨；严禁将草坪处理成单色模糊色块、灰绿/亮绿糊斑或 Gaussian 式柔焦一整片；背景松柏与草坪同时保持细节，不得「只有人物清晰、身后草地全糊」。` +
        `景深观感宜接近 f/8–f/11 环境人像，禁止浅景深把整片草坪虚掉。` +
        ` English: lawn and grass in foreground, midground and background must remain sharp with visible blade texture and color variation; no mushy blurred turf; no portrait-mode bokeh that wipes out all grass detail behind subjects.`
      );
    }

    return base;
  }

  /**
   * 新中式（classical）：室内纯红背景 + 3:4 竖版 + 正红暖棕 + 表情自然可微笑（不与「室外大环境」构图块冲突）
   */
  private buildClassicalNeoChineseCompositionPrompt(): string {
    return (
      ` 【新中式构图专用】背景为室内影棚效果：纯色正红背景，简洁无窗景外景，无杂乱道具（画幅仍遵循全风格统一的 3:4 竖版）。` +
      `整体色彩以正红与暖棕为基底，服装金绣或配饰可做点缀，避免画面发灰发冷。` +
      ` 【表情与姿态】人物表情必须自然、松弛、有亲和力：男女均可面向镜头微笑，眼神柔和，嘴角自然上扬；禁止僵硬面瘫、目光呆滞、过度拘谨的站姿。` +
      `可并肩轻靠、自然挽手或微侧身，肩背放松，像真实喜拍而非证件照。` +
      ` English: 3:4 vertical, indoor solid crimson red backdrop, warm red and brown palette, soft even lighting, natural genuine smiles facing camera, relaxed posture, not stiff portrait.`
    );
  }

  /** 用户选择含「腮红」时：约束模型勿画成高浓度舞台腮红 */
  private buildBlushLightnessHint(makeupLabel?: string): string {
    if (!makeupLabel?.includes('腮红')) return '';
    return (
      ` 【腮红浓度】若妆容含腮红，须淡雅轻透、低饱和晕染（像天然好气色），忌色块过重、忌高显色舞台感腮红。` +
      ` English: blush must be soft sheer natural flush, low saturation; avoid heavy pigmented blush.`
    );
  }

  /**
   * 根据用户选择的妆容/发型/服装文案，拼接「必须重绘」说明（强化男生单人，避免沿用原图发型与服装）
   */
  private buildVirtualTryOnImageEditPrompt(
    subjectRole: VirtualTryOnSubjectRole,
    style: string,
    preferences?: VirtualTryOnRequest['preferences'],
    labels?: VirtualTryOnRequest['preferenceLabels'],
  ): string {
    const mk = labels?.makeup?.trim();
    const hs = labels?.hairstyle?.trim();
    const dr = labels?.dress?.trim();
    const accLabel = labels?.accessory?.trim();
    const accRaw = preferences?.accessory?.trim();
    const styleAccessoryDefaults: Record<string, string> = {
      minimalist: '轻薄头纱',
      classical: '中式发簪或步摇',
      bohemian: '花环或贝壳耳饰',
      romantic: '白色马蹄莲手捧花或珍珠耳饰',
      adventure: '浅粉玫瑰手捧花或胸花',
      oldtown: '古镇纪实发簪或复古耳饰',
      artistic: '复古发饰或胸花',
    };
    const acc =
      accLabel ||
      accRaw ||
      styleAccessoryDefaults[style] ||
      '与风格一致的婚礼配饰';
    if (!mk && !hs && !dr && !acc) return '';

    const parts: string[] = [];
    if (mk) parts.push(`妆容「${mk}」`);
    if (hs) parts.push(`发型「${hs}」`);
    if (dr) parts.push(`服装「${dr}」`);
    if (acc) parts.push(`配饰「${acc}」`);
    const zhList = parts.join('，');

    const enMk = mk || 'unchanged makeup';
    const enHs = hs || 'unchanged hairstyle';
    const enDr = dr || 'unchanged outfit';
    const enAcc = acc || 'style-matched accessory';

    const blushHint = this.buildBlushLightnessHint(mk);

    if (subjectRole === 'male') {
      return (
        ` 【图生图硬性要求-新郎/男生单人】` +
        `参考图仅用于保持同一人面部身份与五官相似度；` +
        `必须彻底重绘头发造型（含帽子、发际线、分缝、长度与蓬松度）与全身着装（含外套、大衣、西装、衬衫、配饰），` +
        `严格按用户选择落实：${zhList}。` +
        `配饰必须在画面中清晰可见且与风格匹配，不可省略。` +
        `严禁沿用参考图中的发型、帽子与衣物款式；若原图为长发而用户选择短发/背头/戴帽，输出须体现该造型。` +
        blushHint +
        ` Image edit for solo groom: preserve facial identity only; completely redraw hair (including hats) and full outfit to match: makeup "${enMk}", hairstyle "${enHs}", clothing "${enDr}", accessory "${enAcc}". ` +
        `Do NOT keep the reference photo's original hairstyle, hat, or garments.`
      );
    }

    if (subjectRole === 'couple') {
      return (
        ` 【图生图硬性要求-双人合影】参考图用于人物身份；须按用户选择调整妆容、发型与服装（男女造型均需落实），` +
        `用户选择：${zhList}。配饰必须可见并符合风格语义。勿完整沿用原图婚纱/西装与发型。` +
        blushHint +
        ` Couple edit: apply styling per user (${enMk} / ${enHs} / ${enDr} / ${enAcc}); replace outfits and hairstyles; keep accessories visible and style-consistent.`
      );
    }

    return (
      ` 【图生图硬性要求-新娘/女生】参考图仅保留面部身份；须按用户选择更换妆容、发型与婚纱/礼服：${zhList}。` +
      `配饰（如头纱/发簪等）需与风格一致并清晰可见。` +
      `勿沿用原图发型与裙装款式。` +
      blushHint +
      ` Bridal edit: keep face identity; replace makeup, hair, dress per user (${enMk} / ${enHs} / ${enDr} / ${enAcc}); include visible style-matched accessory.`
    );
  }

  /**
   * 调用火山引擎 API 生成虚拍处理后的图片
   */
  private async generateModifiedImage(
    imageUrl: string,
    style: string,
    subjectRole: VirtualTryOnSubjectRole = 'female',
    preferences?: VirtualTryOnRequest['preferences'],
    preferenceLabels?: VirtualTryOnRequest['preferenceLabels'],
    makeupOnly: boolean = false,
    poseVariantIndex?: number,
  ): Promise<string> {
    try {
      // 如果是 Base64 格式，直接使用（火山引擎支持 Base64）
      // 如果是 URL 格式，也直接使用
      const finalImageUrl = imageUrl;

      console.log('[AI Service] 处理图片 URL:', {
        isBase64: imageUrl.startsWith('data:'),
        style,
        subjectRole,
      });

      const tagRow = await this.prisma.styleTag.findUnique({
        where: { key: style },
      });
      const adminStyleHint = tagRow?.description?.trim() || '';

      const dressLabelForImg = preferenceLabels?.dress?.trim() || '';
      const minimalistIsLace = dressLabelForImg.includes('蕾丝');
      const minimalistFemaleVolces = minimalistIsLace
        ? '韩式简约新娘单人婚纱照，3:4竖版，纯色浅灰米白极简背景，柔和漫射光通透低饱和，细腻胶片质感韩式画报风。蕾丝蓬蓬裙婚纱：蕾丝刺绣、镂空花纹与薄纱叠层，蓬松裙摆显层次，突出蕾丝肌理与哑光质感，避免通体光滑绸缎与镜面反光；轻薄短头纱，清透伪素颜妆，低盘碎发，侧身静立或轻提裙摆，温婉淡笑，温柔治愈高级感。高保真'
        : '韩式简约新娘单人婚纱照，3:4竖版，纯色浅灰米白极简背景，柔和漫射光通透低饱和，细腻胶片质感韩式画报风。缎面婚纱可选法式方领A字垂坠、深V心形修身、圆领松弛、立领长袖伞裙；轻薄短头纱，清透伪素颜妆，低盘碎发，侧身静立或轻提裙摆，温婉淡笑，缎面光泽，温柔治愈高级感。高保真';
      const minimalistCoupleVolces = minimalistIsLace
        ? '韩式简约男女双人婚纱照，3:4竖版，浅灰米白极简纯色背景，柔和漫射光铺满，低饱和温柔色调，细腻胶片质感治愈高级。新娘蕾丝蓬蓬裙婚纱+轻薄头纱（蕾丝层次、蓬松裙型，非通体光滑缎面），新郎简约西装利落沉稳。轻拥依偎、并肩对视、牵手浅笑，肢体松弛无摆拍，表情温柔缱绻。蕾丝裙身与西装线条映衬，极简构图韩系画报，甜蜜瞬间。高保真'
        : '韩式简约男女双人婚纱照，3:4竖版，浅灰米白极简纯色背景，柔和漫射光铺满，低饱和温柔色调，细腻胶片质感治愈高级。新娘缎面婚纱+轻薄头纱素雅干净，新郎简约西装利落沉稳。轻拥依偎、并肩对视、牵手浅笑，肢体松弛无摆拍，表情温柔缱绻。无多余道具，缎面与西装线条映衬，极简构图韩系画报，甜蜜瞬间。高保真';

      // 根据风格生成相应的提示词（女生/双人偏婚纱叙事）
      const stylePrompts: Record<string, string> = {
        romantic:
          '3:4竖版，东亚新娘森系草坪胶片婚纱照，户外草坪，背景茂密深绿色松柏乔木，多云阴天漫射自然光，复古富士胶片质感、细腻颗粒、低饱和莫兰迪色调、电影感构图，中景或环境人像；白色抹胸婚纱或蕾丝鱼尾婚纱、大蕾丝花边长款头纱飘逸，可持白色马蹄莲手捧花；真实皮肤质感、发丝清晰、婚纱蕾丝与头纱细节精致；脚下及身后草地草坪从近到远均清晰可见、草叶纹理可辨，勿虚化背景草坪，纪实浪漫氛围，清新柔美，高保真',
        artistic:
          '3:4竖版，生成纪实故事风格的高级婚纱摄影照片，古镇街巷与人文旅拍，背景建筑与环境细节保持清晰少虚化，情绪与构图，高保真，电影叙事感',
        bohemian:
          '3:4竖版，海岛松弛风格高级婚纱摄影，阳光沙滩海浪与天际线纹理清晰可辨、少奶油虚化，轻盈纱裙、度假松弛感，深景深真实快照，高保真',
        minimalist: minimalistFemaleVolces,
        classical:
          '新中式国风新娘单人婚纱照，3:4竖版，室内纯色正红背景无室外，色彩正红与暖棕为基底，秀禾龙凤褂或改良旗袍金饰刺绣，柔光均匀。表情自然亲切可面向镜头微笑，眼神温柔，避免僵硬。高保真',
        adventure:
          '3:4竖版，中国云南大理苍山日出婚纱照，25-30岁东亚年轻新娘，精致妆容与波浪卷发；无肩带白色蕾丝蓬蓬婚纱、长款刺绣头纱，可持浅粉玫瑰绿叶手捧花；前景枯黄草坡，背景苍山日照金山、云雾缭绕、蓝天澄澈；日出黄金柔逆光、轮廓光、5500K暖调；三分法竖构图人物可偏右侧约1/3；85mm人像镜头感、主体清晰、远山天空柔虚化散景，8K超清、35mm胶片颗粒，高保真',
      };

      /** 男生单人：避免「婚纱/纱裙」等新娘向词汇，强调西装/男装与环境，利于与偏好一致 */
      const stylePromptsMale: Record<string, string> = {
        romantic:
          '3:4竖版，东亚新郎森系草坪胶片婚礼人像，户外草坪与深绿松柏乔木背景，多云阴天漫射光，富士胶片颗粒、低饱和莫兰迪色调；黑色西装、白衬衫、黑色领结塔士多造型，清爽发型与真实肤质；草地草坪全景深清晰、草叶与地面细节可见，勿虚化身后草坪，清新利落，高保真',
        artistic:
          '3:4竖版，生成纪实故事风格的新郎婚礼人像照片，古镇街巷与人文旅拍，环境细节清晰少虚化，男士西装或大衣，情绪与构图，高保真，电影叙事感',
        bohemian:
          '3:4竖版，海岛松弛风格新郎婚礼人像，阳光沙滩远景清晰、少散景糊化，男士浅色西装或亚麻休闲正装，度假松弛感，高保真',
        minimalist:
          '韩式简约新郎单人婚礼人像，3:4竖版，浅灰米白极简纯色背景，均匀柔和漫射光，低饱和通透干净，细腻胶片颗粒。西装可选黑色戗驳领+丝质领结、深灰平驳领修身+简约领带、黑色休闲单排扣微开领无领带。发型清爽，站姿放松，单手插袋或自然垂臂，面部光影柔和，表情温和淡然，韩系简约绅士格调。高保真',
        classical:
          '新中式国风新郎单人，3:4竖版，室内纯色正红背景，正红暖棕色调，中山装长衫或新中式男装。表情自然微笑可面向镜头，神态放松，避免僵硬。高保真',
        adventure:
          '3:4竖版，中国云南大理苍山日出新郎人像，25-30岁东亚男性，黑色定制西装、白衬衫、黑色领结，发型可自然纹理贴近参考图；前景草坡、背景苍山金山与云雾；日出逆光、暖调肤质；主体清晰背景虚化，高保真',
      };

      const subjectTail: Record<VirtualTryOnSubjectRole, string> = {
        female:
          '。画面主体为新娘/女性单人，婚礼婚纱或礼服造型，人物与场景共同入镜',
        male: '。画面主体为新郎/男性单人，婚礼西装、礼服或中式男装，人物与场景共同入镜',
        couple:
          '。画面为新郎与新娘双人合影，男女同框出镜，婚纱与西装或礼服搭配；互动与姿态以本次「双人姿态」指令为准，自然放松、避免呆板并排立正，勿固定为抱起新娘',
      };

      /** 双人合影：韩式简约使用用户提供的完整画报向描述（含新郎新娘造型） */
      const stylePromptsCouple: Partial<Record<string, string>> = {
        minimalist: minimalistCoupleVolces,
        classical:
          '新中式国风男女双人婚纱照，3:4竖版，室内纯色正红背景，正红与暖棕为色彩基底，新娘秀禾龙凤褂或红裙旗袍，新郎中山装或新中式男装金饰细节。两人表情自然，可面向镜头微笑，并肩或轻靠，亲密放松，避免僵硬摆拍。高保真',
        romantic:
          '3:4竖版，东亚年轻情侣森系草坪胶片婚纱照，户外草坪，背景茂密深绿色松柏乔木，多云阴天漫射自然光或傍晚侧逆光偏暖清新；复古富士胶片质感、细腻颗粒、低饱和莫兰迪色调、电影感构图；新郎黑色西装白衬衫黑领结，新娘白色抹胸婚纱或大蕾丝鱼尾长袖配超大荷叶边头纱，可持白色马蹄莲手捧花、珍珠耳饰；双人自然纪实互动（具体姿态见下文「双人姿态」块，勿默认抱起新娘）；真实皮肤质感、发丝与蕾丝细节清晰；人物周围及远景草地草坪均需清晰呈现、草叶层次可辨，禁止背景草坪整体虚化或糊成色块，纪实浪漫氛围，8K超写实，高保真',
        adventure:
          '3:4竖版，中国云南大理苍山日出情侣婚纱照，25-30岁东亚年轻情侣；新娘精致妆容、波浪卷发、无肩带白色蕾丝蓬蓬婚纱与长款刺绣头纱，新郎黑色定制西装白衬衫黑领结，手捧花15朵浅粉玫瑰配绿叶；前景枯黄草坡、背景苍山日照金山与云雾蓝天；日出黄金柔逆光、5500K暖调、眼神轻柔交汇；三分法竖版人物可偏右侧1/3；具体互动见下文「双人姿态」；85mm人像虚化、主体清晰远山柔焦，8K、35mm胶片颗粒，高保真',
      };

      const prompt = makeupOnly
        ? (() => {
            const mk =
              preferenceLabels?.makeup?.trim() ||
              preferences?.makeup?.trim() ||
              style ||
              '自然清透';
            const blushHint = this.buildBlushLightnessHint(mk);
            return (
              ` Face-only makeup retouch, preserve identity. ` +
              `STRICT: keep original clothes, hairstyle structure, pose, framing and background unchanged; do not replace outfit; do not change scene. ` +
              `Only enhance facial makeup details (foundation, eyebrow, eyeshadow, eyeliner, blush, lip color) with style "${mk}". ` +
              `Natural skin texture, realistic look, avoid plastic skin. ` +
              blushHint +
              `中文要求：仅修改面部妆容，不换装，不换背景，不改构图与姿态。`
            );
          })()
        : (() => {
            const femaleFallback = adminStyleHint
              ? `3:4竖版，${adminStyleHint}，高保真，专业婚纱摄影`
              : '3:4竖版，生成高级婚纱摄影照片，高保真，专业级别';
            const maleFallback = adminStyleHint
              ? `3:4竖版，${adminStyleHint}，男士婚礼西装或礼服造型，高保真`
              : '3:4竖版，生成高级新郎婚礼人像照片，男士西装或礼服造型，高保真，专业级别';
            const basePrompt =
              subjectRole === 'couple'
                ? stylePromptsCouple[style] ||
                  stylePrompts[style] ||
                  femaleFallback
                : subjectRole === 'male'
                  ? stylePromptsMale[style] || maleFallback
                  : stylePrompts[style] || femaleFallback;
            const aspectRatioBlock = this.buildVirtualTryOnAspectRatioPrompt();
            const couplePoseBlock = this.buildVirtualTryOnCouplePosePrompt(
              subjectRole,
              style,
              poseVariantIndex,
            );
            const compositionBlock =
              style === 'classical'
                ? this.buildClassicalNeoChineseCompositionPrompt()
                : this.buildVirtualTryOnCompositionPrompt();
            const bodyProportionBlock =
              this.buildVirtualTryOnBodyProportionPrompt(subjectRole);
            const sharpBgBlock =
              this.buildVirtualTryOnSharpBackgroundPrompt(style);
            const editBlock = this.buildVirtualTryOnImageEditPrompt(
              subjectRole,
              style,
              preferences,
              preferenceLabels,
            );
            return `${aspectRatioBlock}${basePrompt}${subjectTail[subjectRole]}${couplePoseBlock}${compositionBlock}${bodyProportionBlock}${sharpBgBlock}${editBlock}`;
          })();

      const volcesRequest: VolcesImageRequest = {
        model: this.volcesModel,
        prompt,
        image: finalImageUrl,
        sequential_image_generation: 'disabled',
        response_format: 'url',
        size: '2K',
        stream: false,
        watermark: true,
      };

      console.log('[AI Service] 调用火山引擎 API 生成虚拍图片:', {
        model: this.volcesModel,
        style,
        subjectRole,
        hasPreferenceLabels: !!(
          preferenceLabels?.makeup ||
          preferenceLabels?.hairstyle ||
          preferenceLabels?.dress ||
          preferenceLabels?.accessory
        ),
        promptLength: prompt.length,
        promptPreview:
          prompt.substring(0, 400) + (prompt.length > 400 ? '...' : ''),
        imageUrlPrefix: imageUrl.substring(0, 50) + '...',
        apiUrl: this.volcesApiUrl,
      });

      console.log(
        '[AI Service] 完整请求数据:',
        JSON.stringify(
          {
            url: this.volcesApiUrl,
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.volcesApiKey.substring(0, 20)}...`,
              'Content-Type': 'application/json',
            },
            data: volcesRequest,
          },
          null,
          2,
        ),
      );

      const response = await axios.post(this.volcesApiUrl, volcesRequest, {
        headers: {
          Authorization: `Bearer ${this.volcesApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[AI Service] 火山引擎 API 响应状态:', response.status);
      console.log(
        '[AI Service] 火山引擎 API 响应数据:',
        JSON.stringify(response.data).substring(0, 200),
      );

      // 处理响应 - 火山引擎返回格式: { data: [{ url: "..." }] }
      if (Array.isArray(response.data?.data) && response.data.data.length > 0) {
        const first = response.data.data[0];
        const generatedUrl = first?.url;
        const b64 = first?.b64_json;

        if (typeof b64 === 'string' && b64.length > 0) {
          console.log(
            '[AI Service] 火山引擎返回 b64_json，直接作为 data URL 使用',
          );
          return `data:image/png;base64,${b64}`;
        }

        if (typeof generatedUrl === 'string' && generatedUrl.length > 0) {
          console.log(
            '[AI Service] 火山引擎 API 返回成功，图片 URL:',
            generatedUrl.substring(0, 80) + '...',
          );
          // 服务端拉取并转 base64，避免浏览器访问 ark-content CDN 出现 ERR_CONNECTION_RESET
          const inlined = await this.convertImageUrlToBase64(generatedUrl);
          if (inlined) {
            console.log(
              '[AI Service] 已将生成图转为 data URL，长度:',
              inlined.length,
            );
            return inlined;
          }
          console.warn(
            '[AI Service] 服务端下载生成图失败，仍返回原始 URL（前端可能无法加载）',
          );
          return generatedUrl;
        }
      }

      // 备用检查 image_url 字段（兼容其他格式）
      if (response.data?.data?.image_url) {
        const u = response.data.data.image_url;
        console.log(
          '[AI Service] 火山引擎 API 返回成功，图片 URL:',
          String(u).substring(0, 80),
        );
        const inlined = await this.convertImageUrlToBase64(u);
        return inlined || u;
      }

      console.error(
        '[AI Service] 火山引擎 API 返回数据格式异常:',
        response.data,
      );
      // 返回原始图片 URL 作为备选
      return imageUrl;
    } catch (error: any) {
      const statusCode = error.response?.status;
      const errorData = error.response?.data;

      console.error('[AI Service] 火山引擎 API 调用失败');
      console.error('[AI Service] 状态码:', statusCode);
      console.error('[AI Service] 错误响应:', errorData);
      console.error('[AI Service] 错误消息:', error.message);

      // 根据不同的错误状态码提供不同的处理
      if (statusCode === 402) {
        console.warn(
          '[AI Service] 402 Payment Required - 可能是账户余额不足或权限问题',
        );
        console.warn(
          '[AI Service] API Key:',
          this.volcesApiKey.substring(0, 10) + '...',
        );
        console.warn('[API Model:', this.volcesModel);
      }

      console.log('[AI Service] 降级方案：返回带风格描述的占位符图片');

      // 如果 API 调用失败，返回一个带风格信息的占位符 SVG
      return this.generateStyledPlaceholder(style);
    }
  }

  /**
   * 用户端测试：按用户输入的提示词 + 参考图调用火山图生图（失败时抛错，不返回占位图）
   */
  async generateImageFromUserPrompt(
    request: PromptImageTestRequest,
  ): Promise<{ imageUrl: string }> {
    const prompt = request.prompt?.trim() ?? '';
    if (prompt.length < 2) {
      throw new BadRequestException('请输入至少 2 个字符的提示词');
    }
    if (prompt.length > 4000) {
      throw new BadRequestException('提示词长度不应超过 4000 字符');
    }
    const imageUrl = request.imageUrl?.trim() ?? '';
    if (!imageUrl) {
      throw new BadRequestException('请上传参考图片');
    }
    if (!this.volcesApiKey) {
      throw new BadRequestException(
        '服务端未配置火山引擎图生图密钥（VOLCES_API_KEY / ARK_API_KEY）',
      );
    }

    const volcesRequest: VolcesImageRequest = {
      model: this.volcesModel,
      prompt,
      image: imageUrl,
      sequential_image_generation: 'disabled',
      response_format: 'url',
      size: '2K',
      stream: false,
      watermark: true,
    };

    try {
      const response = await axios.post(this.volcesApiUrl, volcesRequest, {
        headers: {
          Authorization: `Bearer ${this.volcesApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (Array.isArray(response.data?.data) && response.data.data.length > 0) {
        const first = response.data.data[0];
        const generatedUrl = first?.url;
        const b64 = first?.b64_json;

        if (typeof b64 === 'string' && b64.length > 0) {
          return {
            imageUrl: `data:image/png;base64,${b64}`,
          };
        }

        if (typeof generatedUrl === 'string' && generatedUrl.length > 0) {
          const inlined = await this.convertImageUrlToBase64(generatedUrl);
          if (inlined) {
            return { imageUrl: inlined };
          }
          return { imageUrl: generatedUrl };
        }
      }

      if (response.data?.data?.image_url) {
        const u = response.data.data.image_url;
        const inlined = await this.convertImageUrlToBase64(u);
        return { imageUrl: inlined || u };
      }

      throw new BadRequestException('火山引擎返回数据格式异常，请稍后重试');
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const err = error as {
        response?: { status?: number; data?: Record<string, unknown> };
        message?: string;
      };
      const errorData = err.response?.data;
      const nested =
        errorData &&
        typeof errorData === 'object' &&
        'error' in errorData &&
        errorData.error &&
        typeof (errorData.error as { message?: string }).message === 'string'
          ? (errorData.error as { message: string }).message
          : null;
      const flat =
        errorData &&
        typeof errorData === 'object' &&
        typeof (errorData as { message?: string }).message === 'string'
          ? (errorData as { message: string }).message
          : null;
      const msg = nested || flat || err.message || '图生图请求失败';
      console.error(
        '[AI Service] prompt-image-test 火山失败',
        err.response?.status,
        errorData,
      );
      throw new BadRequestException(msg);
    }
  }

  /**
   * 生成带风格信息的 SVG 占位符（当 API 失败时使用）
   */
  private generateStyledPlaceholder(style: string): string {
    const styleInfo: Record<string, { name: string; color: string }> = {
      romantic: { name: '森系草坪', color: '#ff758c' },
      artistic: { name: '纪实故事', color: '#9b59b6' },
      bohemian: { name: '海岛松弛', color: '#e67e22' },
      minimalist: { name: '韩式简约', color: '#34495e' },
      classical: { name: '国风典雅', color: '#c0504d' },
      adventure: { name: '旷野自由', color: '#27ae60' },
    };

    const info = styleInfo[style] || { name: '虚拍效果', color: '#ff758c' };

    const svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${info.color};stop-opacity:0.1" />
          <stop offset="100%" style="stop-color:${info.color};stop-opacity:0.2" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#grad)" stroke="${info.color}" stroke-width="2"/>
      <text x="400" y="270" font-size="48" fill="${info.color}" text-anchor="middle" font-weight="bold">
        ${info.name}虚拍效果
      </text>
      <text x="400" y="330" font-size="18" fill="${info.color}" text-anchor="middle" opacity="0.7">
        AI生成中... 请稍候
      </text>
      <text x="400" y="550" font-size="14" fill="#999" text-anchor="middle">
        此为演示效果 · 实际效果由AI生成模型处理
      </text>
    </svg>`;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  /**
   * 调用 DeepSeek API
   */
  private async callDeepSeek(messages: any[]): Promise<string> {
    try {
      const requestBody = {
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: false,
      };

      console.log('[AI Service] 调用 DeepSeek API:', {
        url: this.deepseekBaseURL,
        apiKeyPrefix: this.deepseekApiKey.substring(0, 20) + '...',
        model: 'deepseek-chat',
        messagesCount: messages.length,
      });

      console.log(
        '[AI Service] DeepSeek 完整请求数据:',
        JSON.stringify(
          {
            url: this.deepseekBaseURL,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.deepseekApiKey.substring(0, 20)}...`,
            },
            data: requestBody,
          },
          null,
          2,
        ),
      );

      const response = await axios.post(this.deepseekBaseURL, requestBody, {
        headers: {
          Authorization: `Bearer ${this.deepseekApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60秒超时，给 DeepSeek 充足的时间
      });

      console.log('[AI Service] DeepSeek API 响应状态:', response.status);
      console.log(
        '[AI Service] DeepSeek API 响应数据:',
        JSON.stringify(response.data).substring(0, 500),
      );

      if (response.data?.choices?.[0]?.message?.content) {
        const content = response.data.choices[0].message.content;
        console.log(
          '[AI Service] DeepSeek API 返回成功，内容长度:',
          content.length,
        );
        return content;
      }

      throw new Error(
        `Invalid API response format: ${JSON.stringify(response.data)}`,
      );
    } catch (error: any) {
      const statusCode = error.response?.status;
      const errorData = error.response?.data;

      console.error('[AI Service] DeepSeek API 调用失败');
      console.error('[AI Service] 状态码:', statusCode);
      console.error('[AI Service] 错误响应:', errorData);
      console.error('[AI Service] 错误消息:', error.message);

      throw new HttpException(
        `AI Service Error: ${error.message}`,
        statusCode || HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * 多模态识别人脸：DeepSeek 官方 chat 接口仅接受纯文本 content，不支持 image_url。
   * 此处走火山方舟 Chat Completions（VOLCES_API_KEY 或 ARK_API_KEY），需配置支持图片理解的接入点 ID。
   */
  private parseOpenAiCompatibleApiError(error: unknown): {
    status?: number;
    message: string;
  } {
    const err = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
    };
    const status = err.response?.status;
    const data = err.response?.data;
    let message = '';
    if (typeof data === 'string' && data.trim()) {
      message = data.trim().slice(0, 500);
    } else if (data && typeof data === 'object') {
      const o = data as Record<string, unknown>;
      if (o.error && typeof o.error === 'object') {
        const er = o.error as Record<string, unknown>;
        if (typeof er.message === 'string') message = er.message;
        else if (Array.isArray(er.message))
          message = er.message.map(String).join('; ');
        const codeStr =
          typeof er.code === 'string' || typeof er.code === 'number'
            ? String(er.code)
            : '';
        if (!message && codeStr) message = codeStr;
        if (typeof er.message === 'string' && codeStr)
          message = `${codeStr}: ${er.message}`;
      }
      if (!message && typeof o.msg === 'string') message = o.msg;
      const meta = o.ResponseMetadata as Record<string, unknown> | undefined;
      if (!message && meta?.Error && typeof meta.Error === 'object') {
        const e = meta.Error as Record<string, unknown>;
        if (typeof e.Message === 'string') message = e.Message;
        if (typeof e.Code === 'string') message = `${e.Code}: ${message || ''}`;
      }
      if (!message && typeof o.message === 'string') message = o.message;
      if (!message && Array.isArray(o.message))
        message = o.message.map(String).join('; ');
    }
    if (!message) message = err.message || '视觉对话 API 调用失败';
    return { status, message };
  }

  /** 方舟 / OpenAI 兼容：content 可能为 string 或多段结构 */
  private extractChatCompletionText(data: unknown): string {
    const content = (
      data as { choices?: Array<{ message?: { content?: unknown } }> }
    )?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((p: unknown) => {
          if (typeof p === 'string') return p;
          if (p && typeof p === 'object' && 'text' in p) {
            const t = (p as { text?: unknown }).text;
            if (typeof t === 'string') return t;
          }
          return '';
        })
        .join('');
    }
    return '';
  }

  /**
   * 方舟返回 401/403 时 body 有时很简略，补充可操作的排查说明（仍保留上游原文便于搜文档）。
   */
  private formatVolcesVisionClientError(
    status: number | undefined,
    upstreamMessage: string,
  ): string {
    const detail = (upstreamMessage || '').trim();
    const prefix = detail ? `${detail} ` : '';
    if (status === 403) {
      return (
        `${prefix}` +
        '（403 来自火山方舟，非本系统权限）请逐项核对：① VOLCES_API_KEY / ARK_API_KEY 必须与「推理接入点」在同一火山引擎项目（控制台左上角项目切换后再复制 Key）；② 该 Key 已开通对本接入点所用模型的调用权限；③ VOLCES_CHAT_URL 的地域与接入点一致（如北京区默认 https://ark.cn-beijing.volces.com/api/v3/chat/completions）。'
      );
    }
    if (status === 401) {
      return (
        `${prefix}` +
        '（401）请确认 API Key 与控制台一致、未过期、无多余空格；若刚新建 Key 需等待生效或重新启动后端以加载 .env。'
      );
    }
    return detail || '视觉对话请求被拒绝';
  }

  private async callVolcesVisionChat(messages: unknown[]): Promise<string> {
    if (!this.volcesVisionChatModel) {
      throw new BadRequestException(
        'DeepSeek 开放平台当前 chat 接口不支持在消息中附带图片（仅支持纯文本）。请使用火山引擎方舟：在控制台创建「支持图片理解」的推理接入点，将接入点 ID（一般为 ep- 开头）填入环境变量 VOLCES_VISION_CHAT_MODEL，并确保 VOLCES_API_KEY 或 ARK_API_KEY 与虚拍生图相同且与接入点属同一项目。文档：火山方舟 - 图片理解。',
      );
    }
    if (!this.volcesApiKey) {
      throw new BadRequestException(
        '未配置方舟 API Key：请在 backend/.env 中设置 VOLCES_API_KEY 或 ARK_API_KEY（与控制台「API Key」一致，且与推理接入点属同一项目）。',
      );
    }
    try {
      const response = await axios.post(
        this.volcesChatCompletionsUrl,
        {
          model: this.volcesVisionChatModel,
          messages,
          temperature: 0.15,
          max_tokens: 900,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${this.volcesApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000,
        },
      );

      const text = this.extractChatCompletionText(response.data);
      if (text.trim()) return text;

      throw new Error(
        `Invalid vision chat response: ${JSON.stringify(response.data).slice(0, 400)}`,
      );
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      if (error instanceof BadRequestException) throw error;
      const { status, message } = this.parseOpenAiCompatibleApiError(error);
      console.error(
        '[AI Service] 方舟视觉对话失败',
        this.volcesChatCompletionsUrl,
        this.volcesVisionChatModel,
        status,
        message,
      );
      const httpStatus =
        status && status >= 400 && status < 600
          ? status
          : HttpStatus.BAD_GATEWAY;
      const clientMessage =
        status === 403 || status === 401
          ? this.formatVolcesVisionClientError(status, message)
          : message;
      throw new HttpException(clientMessage, httpStatus);
    }
  }

  async analyzeFaceForMakeupAdvisor(body: {
    /** 单张正面/证件类人脸照（推荐） */
    photo?: string;
    /** 兼容旧版：两张分传 */
    idPhoto?: string;
    frontPhoto?: string;
  }): Promise<MakeupAdvisorFaceAnalysisResult> {
    const single = this.sanitizeMakeupAdvisorImage(body.photo);
    const legacyId = this.sanitizeMakeupAdvisorImage(body.idPhoto);
    const legacyFront = this.sanitizeMakeupAdvisorImage(body.frontPhoto);
    const imageUrls: string[] = [];
    if (single) {
      imageUrls.push(single);
    } else {
      if (legacyId) imageUrls.push(legacyId);
      if (legacyFront) imageUrls.push(legacyFront);
    }
    if (imageUrls.length === 0) {
      throw new BadRequestException(
        '请上传一张清晰的正面人脸照片（支持 JPEG/PNG/WebP 的 data URL）',
      );
    }

    const listShapes = MAKEUP_ADVISOR_FACE_SHAPES.join('、');
    const listTones = MAKEUP_ADVISOR_SKIN_TONES.join('、');
    const listFeats = MAKEUP_ADVISOR_FEATURES.join('、');
    const listSkinVis = MAKEUP_ADVISOR_SKIN_VISIBLE.join('、');
    const listRatio = MAKEUP_ADVISOR_FACE_RATIO.join('、');
    const listStyles = MAKEUP_ADVISOR_MAKEUP_STYLES.join('、');

    const multiHint =
      imageUrls.length > 1
        ? '所附为多张照片，请综合判断。'
        : '所附为单张正面或证件类清晰人脸照片。';

    const userText = `你是专业妆造助理。${multiHint}请据此推断客户特征，用于妆容建议表单。

脸型必须且只能从下列原文选一项；看不清填 null：
${listShapes}

肤色必须且只能从下列原文选一项；看不清填 null：
${listTones}

五官特点为数组，每项必须完全等于下列原文之一（含眉型），不要自造词；看不清则 features 用 []，最多 8 项：
${listFeats}

照片中可见的皮肤状态（非医学诊断，仅妆面参考）为数组，每项必须完全等于下列原文之一；看不清则 skinVisible 用 []，最多 5 项：
${listSkinVis}

三庭五眼大致比例倾向为数组，每项必须完全等于下列原文之一；看不清则 faceRatio 用 []，最多 5 项：
${listRatio}

适合的妆容风格为数组，每项必须完全等于下列原文之一；看不清则 makeupStyles 用 []，最多 3 项：
${listStyles}

只输出一个 JSON 对象，不要 markdown，不要解释。格式示例：
{"faceShape":"鹅蛋脸","skinTone":"暖黄皮","features":["双眼皮","平眉"],"skinVisible":["略有暗沉"],"faceRatio":["中庭略长","眼距略窄"],"makeupStyles":["温柔知性","轻熟优雅"],"note":"一句可选说明"}`;

    const userContent: Array<Record<string, unknown>> = [
      { type: 'text', text: userText },
    ];
    for (const url of imageUrls) {
      userContent.push({
        type: 'image_url',
        image_url: { url },
      });
    }

    let raw: string;
    try {
      raw = await this.callVolcesVisionChat([
        {
          role: 'system',
          content:
            '你只输出合法 JSON。键：faceShape、skinTone、features、skinVisible、faceRatio、makeupStyles、note（除 faceShape/skinTone 外均可省略或空数组）。不要代码围栏。',
        },
        { role: 'user', content: userContent },
      ]);
    } catch (e: unknown) {
      if (e instanceof HttpException) throw e;
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(
        `照片识别失败：${String((e as Error)?.message || e)}`,
      );
    }

    const parsed = this.parseMakeupAdvisorFaceJson(raw);
    const faceShape = this.pickMakeupAdvisorLabel(
      parsed.faceShape,
      MAKEUP_ADVISOR_FACE_SHAPES,
    );
    const skinTone = this.pickMakeupAdvisorLabel(
      parsed.skinTone,
      MAKEUP_ADVISOR_SKIN_TONES,
    );
    const features = this.pickMakeupAdvisorMulti(
      parsed.features,
      MAKEUP_ADVISOR_FEATURES,
      8,
    );
    const skinVisible = this.pickMakeupAdvisorMulti(
      parsed.skinVisible,
      MAKEUP_ADVISOR_SKIN_VISIBLE,
      5,
    );
    const faceRatio = this.pickMakeupAdvisorMulti(
      parsed.faceRatio,
      MAKEUP_ADVISOR_FACE_RATIO,
      5,
    );
    const makeupStyles = this.pickMakeupAdvisorMulti(
      parsed.makeupStyles,
      MAKEUP_ADVISOR_MAKEUP_STYLES,
      3,
    );

    if (
      !faceShape &&
      !skinTone &&
      features.length === 0 &&
      skinVisible.length === 0 &&
      faceRatio.length === 0 &&
      makeupStyles.length === 0
    ) {
      throw new BadRequestException(
        '未能从照片中解析出有效选项，请换更清晰正脸照或手动填写',
      );
    }

    return {
      faceShape,
      skinTone,
      features,
      skinVisible,
      faceRatio,
      makeupStyles,
      rawNote:
        typeof parsed.note === 'string' && parsed.note.trim()
          ? parsed.note.trim()
          : undefined,
    };
  }

  private sanitizeMakeupAdvisorImage(s?: string): string | undefined {
    if (!s || typeof s !== 'string') return undefined;
    const t = s.trim();
    const okPrefix =
      t.startsWith('data:image/jpeg') ||
      t.startsWith('data:image/jpg') ||
      t.startsWith('data:image/png') ||
      t.startsWith('data:image/webp');
    if (!okPrefix) return undefined;
    if (t.length > 14_000_000) {
      throw new BadRequestException('单张图片过大，请压缩后重试');
    }
    return t;
  }

  private pickMakeupAdvisorLabel(
    v: unknown,
    list: readonly string[],
  ): string | undefined {
    if (v == null) return undefined;
    const s = typeof v === 'string' ? v.trim() : '';
    if (!s || s === 'null') return undefined;
    if (list.includes(s)) return s;
    for (const x of list) {
      if (s.includes(x) || x.includes(s)) return x;
    }
    return undefined;
  }

  private pickMakeupAdvisorMulti(
    raw: unknown,
    list: readonly string[],
    max: number,
  ): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of raw) {
      const s = typeof item === 'string' ? item.trim() : '';
      if (!s) continue;
      const hit = list.find((x) => x === s || s.includes(x) || x.includes(s));
      if (hit && !seen.has(hit)) {
        seen.add(hit);
        out.push(hit);
      }
      if (out.length >= max) break;
    }
    return out;
  }

  private parseMakeupAdvisorFaceJson(content: string): {
    faceShape?: unknown;
    skinTone?: unknown;
    features?: unknown;
    skinVisible?: unknown;
    faceRatio?: unknown;
    makeupStyles?: unknown;
    note?: unknown;
  } {
    const trimmed = content.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = fenced ? fenced[1].trim() : trimmed;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};
    try {
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  /**
   * 运营洞察：根据报表 JSON 生成营销建议（返回结构化列表）。
   */
  async generateOperationalMarketingSuggestions(
    report: Record<string, unknown>,
  ): Promise<{ items: string[] }> {
    const snapshot = {
      generatedAt: report.generatedAt,
      summary: report.summary,
      purchaseDemand: report.purchaseDemand,
      browseInterest: report.browseInterest,
      favorites: report.favorites,
      aiBehavior: report.aiBehavior,
      situationAnalysis: report.situationAnalysis,
      dataInterpretationAndIssues: report.dataInterpretationAndIssues,
      improvementSuggestions: report.improvementSuggestions,
    };
    const userContent = JSON.stringify(snapshot);
    const content = await this.callDeepSeek([
      {
        role: 'system',
        content:
          '你是婚纱摄影与旅拍 O2O 平台的增长与营销顾问。只根据用户提供的运营数据 JSON 与系统报告要点作答，不编造不存在的数据。输出必须是合法 JSON，且仅包含一个对象，键为 items（字符串数组）。',
      },
      {
        role: 'user',
        content: `以下为本平台当前运营快照与系统生成的商业报告要点（JSON）。请输出可直接落地的营销建议：需包含渠道/触点（如小红书、抖音、微信私域、SEM、门店、套餐页等）、文案或活动方向、与数据中热门风格/目的地/套餐的挂钩方式（若有）。\n\n要求：\n1) 严格只输出 JSON，格式为 {"items":["建议1","建议2",...]}，不要 markdown 代码围栏。\n2) 5～8 条，每条 1～3 句中文，具体可执行，避免空泛口号。\n3) 若某项数据为空或极少，可写「样本不足时的小成本验证动作」类建议，但不要虚构数字。\n\n数据：\n${userContent}`,
      },
    ]);
    const items = this.parseMarketingSuggestionsJson(content);
    return { items };
  }

  private parseMarketingSuggestionsJson(content: string): string[] {
    const trimmed = content.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = fenced ? fenced[1].trim() : trimmed;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    try {
      const obj = JSON.parse(jsonMatch[0]) as { items?: unknown };
      if (!Array.isArray(obj.items)) return [];
      return obj.items
        .map((x) => String(x).trim())
        .filter(Boolean)
        .slice(0, 12);
    } catch {
      return [];
    }
  }

  /** 解析 JSON 字段为展示用字符串，避免对 object 误用 String() 触发 lint */
  private jsonUnknownToTrimmedString(v: unknown): string {
    if (v == null) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number' || typeof v === 'boolean') {
      return String(v).trim();
    }
    return '';
  }

  private parseSpotDraftJson(content: string): {
    description: string;
    imageSearchQuery: string;
    imageSearchQueries: string[];
  } {
    const trimmed = content.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = fenced ? fenced[1].trim() : trimmed;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        description: trimmed,
        imageSearchQuery: '',
        imageSearchQueries: [],
      };
    }
    try {
      const obj = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      const description = this.jsonUnknownToTrimmedString(obj.description);
      const imageSearchQuery = this.jsonUnknownToTrimmedString(
        obj.imageSearchQuery,
      );
      const q = obj.imageSearchQueries;
      const imageSearchQueries = Array.isArray(q)
        ? q
            .map((x) => String(x).trim())
            .filter(Boolean)
            .slice(0, 6)
        : [];
      return { description, imageSearchQuery, imageSearchQueries };
    } catch {
      return {
        description: trimmed,
        imageSearchQuery: '',
        imageSearchQueries: [],
      };
    }
  }

  /** 从 HTTPS 图床拉取二进制并转为 data URL，供前端直接展示与写入景点 */
  private async downloadImageAsDataUrl(
    httpsUrl: string,
  ): Promise<string | null> {
    try {
      const r = await axios.get<ArrayBuffer>(httpsUrl, {
        responseType: 'arraybuffer',
        timeout: 28000,
        maxContentLength: 4 * 1024 * 1024,
        maxBodyLength: 4 * 1024 * 1024,
        maxRedirects: 8,
        validateStatus: (s) => s >= 200 && s < 400,
        headers: {
          'User-Agent': 'GraduateDesignSpotAdmin/1.0 (image-fetch)',
          Accept: 'image/*,*/*;q=0.8',
        },
      });
      const ctRaw = String(r.headers['content-type'] || 'image/jpeg')
        .split(';')[0]
        .trim();
      const ct = ctRaw.startsWith('image/') ? ctRaw : 'image/jpeg';
      const b64 = Buffer.from(r.data).toString('base64');
      return `data:${ct};base64,${b64}`;
    } catch (e: any) {
      console.warn(
        '[AI Service] downloadImageAsDataUrl failed:',
        httpsUrl.slice(0, 80),
        e?.message,
      );
      return null;
    }
  }

  /** Pexels：Authorization 头为裸 API Key（非 Bearer） */
  private async searchPexelsPhotoUrls(
    queries: string[],
    maxTotal: number,
  ): Promise<string[]> {
    const key = process.env.PEXELS_API_KEY?.trim();
    if (!key || maxTotal <= 0) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const q of queries) {
      if (out.length >= maxTotal) break;
      const qq = String(q).trim();
      if (qq.length < 2) continue;
      try {
        const res = await axios.get('https://api.pexels.com/v1/search', {
          params: {
            query: qq,
            per_page: Math.min(8, maxTotal - out.length + 2),
            orientation: 'portrait',
          },
          headers: { Authorization: key },
          timeout: 16000,
        });
        const photos = Array.isArray(res.data?.photos) ? res.data.photos : [];
        for (const p of photos) {
          if (out.length >= maxTotal) break;
          const u =
            typeof p?.src?.medium === 'string'
              ? p.src.medium
              : typeof p?.src?.large === 'string'
                ? p.src.large
                : typeof p?.src?.small === 'string'
                  ? p.src.small
                  : '';
          if (u && !seen.has(u)) {
            seen.add(u);
            out.push(u);
          }
        }
      } catch (e: any) {
        console.warn('[AI Service] Pexels search failed:', qq, e?.message);
      }
    }
    return out.slice(0, maxTotal);
  }

  /**
   * 维基共享资源：按中文/任意关键词搜「文件」命名空间，取原图直链（知名景区常为实地拍摄）
   * 无需 API Key；需服务器能访问 commons 与 upload.wikimedia.org
   */
  private async searchWikimediaCommonsPhotoUrls(
    searchTerms: string[],
    maxTotal: number,
  ): Promise<string[]> {
    if (maxTotal <= 0) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    const ua =
      process.env.WIKIMEDIA_USER_AGENT?.trim() ||
      'GraduateDesignTravelApp/1.0 (commons-spot-images; +https://wikimediafoundation.org)';
    const terms = [
      ...new Set(
        searchTerms.map((t) => String(t).trim()).filter((t) => t.length >= 2),
      ),
    ];
    for (const term of terms.slice(0, 6)) {
      if (out.length >= maxTotal) break;
      try {
        const res = await axios.get('https://commons.wikimedia.org/w/api.php', {
          params: {
            action: 'query',
            format: 'json',
            generator: 'search',
            gsrsearch: term,
            gsrnamespace: 6,
            gsrlimit: 14,
            prop: 'imageinfo',
            iiprop: 'url|mime',
          },
          headers: { 'User-Agent': ua },
          timeout: 16000,
        });
        const pages = res.data?.query?.pages;
        if (!pages || typeof pages !== 'object') continue;
        for (const p of Object.values(pages)) {
          if (out.length >= maxTotal) break;
          if (!p || typeof p !== 'object') continue;
          const page = p as Record<string, unknown>;
          const imageinfo = page.imageinfo;
          if (!Array.isArray(imageinfo) || !imageinfo[0]) continue;
          const ii = imageinfo[0] as Record<string, unknown>;
          const mime = this.jsonUnknownToTrimmedString(ii.mime);
          if (mime.includes('svg') || mime.includes('djvu')) continue;
          let u = typeof ii.url === 'string' ? ii.url.trim() : '';
          if (u.startsWith('//')) u = `https:${u}`;
          if (!/^https?:\/\//i.test(u)) continue;
          if (!seen.has(u)) {
            seen.add(u);
            out.push(u);
          }
        }
      } catch (e: any) {
        console.warn(
          '[AI Service] Wikimedia Commons search failed:',
          term,
          e?.message,
        );
      }
    }
    return out.slice(0, maxTotal);
  }

  private async searchUnsplashPhotoUrls(
    queries: string[],
    maxTotal: number,
  ): Promise<string[]> {
    const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
    if (!key || maxTotal <= 0) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const q of queries) {
      if (out.length >= maxTotal) break;
      const qq = String(q).trim();
      if (qq.length < 2) continue;
      try {
        const res = await axios.get('https://api.unsplash.com/search/photos', {
          params: {
            query: qq,
            per_page: Math.min(8, maxTotal - out.length + 2),
            orientation: 'portrait',
          },
          headers: { Authorization: `Client-ID ${key}` },
          timeout: 16000,
        });
        const results = Array.isArray(res.data?.results)
          ? res.data.results
          : [];
        for (const r of results) {
          if (out.length >= maxTotal) break;
          const u =
            typeof r?.urls?.regular === 'string'
              ? r.urls.regular
              : typeof r?.urls?.small === 'string'
                ? r.urls.small
                : '';
          if (u && !seen.has(u)) {
            seen.add(u);
            out.push(u);
          }
        }
      } catch (e: any) {
        console.warn('[AI Service] Unsplash search failed:', qq, e?.message);
      }
    }
    return out.slice(0, maxTotal);
  }

  /**
   * 无密钥/外网失败时的竖版占位图（SVG data URL），保证弹窗内始终有可选项
   */
  private buildSpotDraftPlaceholderDataUrls(
    count: number,
    title: string,
  ): string[] {
    const safe = String(title || '景点')
      .replace(/&/g, ' ')
      .replace(/</g, ' ')
      .replace(/"/g, ' ')
      .slice(0, 24);
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="480" viewBox="0 0 360 480">
<rect fill="#eef2f7" width="360" height="480"/>
<text x="180" y="200" text-anchor="middle" fill="#64748b" font-size="15" font-family="system-ui,sans-serif">配图 ${i + 1}</text>
<text x="180" y="232" text-anchor="middle" fill="#94a3b8" font-size="12" font-family="system-ui,sans-serif">${safe}</text>
<text x="180" y="268" text-anchor="middle" fill="#cbd5e1" font-size="11" font-family="system-ui,sans-serif">请配置 PEXELS_API_KEY</text>
<text x="180" y="288" text-anchor="middle" fill="#cbd5e1" font-size="11" font-family="system-ui,sans-serif">以匹配真实景点图</text>
</svg>`;
      out.push(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    }
    return out;
  }

  /** Lorem Picsum：无需 API Key，按种子固定图片（外网可访问时优于纯占位） */
  private async fillSpotDraftWithPicsum(
    seedBase: string,
    maxImages: number,
  ): Promise<string[]> {
    const dataUrls: string[] = [];
    let h = 2166136261;
    const base = String(seedBase || 'spot');
    for (let i = 0; i < base.length; i++) {
      h ^= base.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    for (let i = 0; i < maxImages; i++) {
      const seed = `gd-spot-${(h >>> 0).toString(16)}-${i}`;
      const url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/720/960`;
      const d = await this.downloadImageAsDataUrl(url);
      if (d) dataUrls.push(d);
    }
    return dataUrls;
  }

  /**
   * 优先维基共享资源（中文景区名 → 实地照片概率高），再用 Pexels/Unsplash 英文关键词补足；失败则 Picsum → SVG
   */
  private async buildSpotDraftImageDataUrls(
    englishQueries: string[],
    commonsSearchTerms: string[],
    maxImages: number,
    fallbackSeed: string,
  ): Promise<{ dataUrls: string[]; note?: string }> {
    const hasPexels = Boolean(process.env.PEXELS_API_KEY?.trim());
    const hasUnsplash = Boolean(process.env.UNSPLASH_ACCESS_KEY?.trim());
    const qList = englishQueries.length
      ? englishQueries
      : ['travel destination landscape photography'];

    const commonsUrls = await this.searchWikimediaCommonsPhotoUrls(
      commonsSearchTerms,
      maxImages,
    );
    const hadCommonsLinks = commonsUrls.length > 0;

    const seenHttps = new Set<string>();
    const httpsList: string[] = [];
    for (const u of commonsUrls) {
      if (!seenHttps.has(u)) {
        seenHttps.add(u);
        httpsList.push(u);
      }
    }

    if (httpsList.length < maxImages && hasPexels) {
      const need = maxImages - httpsList.length;
      for (const u of await this.searchPexelsPhotoUrls(qList, need + 2)) {
        if (httpsList.length >= maxImages) break;
        if (!seenHttps.has(u)) {
          seenHttps.add(u);
          httpsList.push(u);
        }
      }
    }
    if (httpsList.length < maxImages && hasUnsplash) {
      const need = maxImages - httpsList.length;
      for (const u of await this.searchUnsplashPhotoUrls(qList, need + 2)) {
        if (httpsList.length >= maxImages) break;
        if (!seenHttps.has(u)) {
          seenHttps.add(u);
          httpsList.push(u);
        }
      }
    }

    const dataUrls: string[] = [];
    for (const u of httpsList) {
      if (dataUrls.length >= maxImages) break;
      const d = await this.downloadImageAsDataUrl(u);
      if (d) dataUrls.push(d);
    }

    if (dataUrls.length >= maxImages) {
      return {
        dataUrls: dataUrls.slice(0, maxImages),
        note: hadCommonsLinks
          ? `已下载 ${dataUrls.length} 张：优先来自维基共享资源（按「城市+景点」等中文检索，知名景区多为实地照片），不足部分由 Pexels/Unsplash 补足；选用前请核对画面与景点是否一致。`
          : `已下载 ${dataUrls.length} 张：Commons 未检索到可用图（小众景点或网络限制较常见），当前来自 Pexels/Unsplash 英文关键词；选用前请核对。`,
      };
    }

    const noteParts: string[] = [];
    if (!httpsList.length) {
      noteParts.push(
        '维基共享资源与 Pexels/Unsplash 均未取到可用链接；请检查网络、密钥或更换景点名称后重试。',
      );
    } else if (!dataUrls.length) {
      noteParts.push(
        '已取得图片链接但服务器下载失败（常见于无法访问 upload.wikimedia.org 或图床）；请检查网络/代理。',
      );
    } else if (!hasPexels && !hasUnsplash && !hadCommonsLinks) {
      noteParts.push(
        '建议配置 PEXELS_API_KEY 以便在 Commons 无结果时用英文关键词搜素材图。',
      );
    }

    const needFill = maxImages - dataUrls.length;
    const picsum = await this.fillSpotDraftWithPicsum(fallbackSeed, needFill);
    for (const p of picsum) {
      if (dataUrls.length >= maxImages) break;
      dataUrls.push(p);
    }

    if (dataUrls.length < maxImages) {
      const placeholders = this.buildSpotDraftPlaceholderDataUrls(
        maxImages - dataUrls.length,
        fallbackSeed.split('|')[1] || fallbackSeed,
      );
      dataUrls.push(...placeholders);
    }

    const hasSvg = dataUrls.some((u) => u.includes('image/svg+xml'));
    const filledByPicsum = picsum.length > 0;
    if (hasSvg) {
      noteParts.push(
        '当前含 SVG 占位图：请在 backend/.env 配置 PEXELS_API_KEY 并保证服务器可访问外网后重试。',
      );
    } else if (filledByPicsum) {
      noteParts.push(
        '已用 Lorem Picsum 补足；配置 Pexels/Unsplash 后可按英文关键词匹配更接近景点的照片。',
      );
    }

    return {
      dataUrls: dataUrls.slice(0, maxImages),
      note: noteParts.filter(Boolean).join(' '),
    };
  }

  /**
   * 管理端：生成景点介绍 + 后台拉取配图（data URL）
   */
  async generateSpotDraft(request: SpotDraftRequest): Promise<SpotDraftResult> {
    const cityName = String(request.cityName || '').trim();
    const spotName = String(request.spotName || '').trim();
    if (!spotName) {
      throw new BadRequestException('请填写景点名称后再生成');
    }
    const category = String(request.category || '').trim() || '未指定';

    const prompt = `你是旅游线路与旅拍文案编辑。根据下列信息撰写管理后台使用的「景点介绍」：

城市：${cityName || '未填写'}
景点名称：${spotName}
旅拍风格分类：${category}

要求：
1. 用简体中文写一段 220～450 字的介绍，分段叙述；包含景观/文化特色、婚纱旅拍适拍亮点、季节或游览提示中的至少两类信息；勿杜撰具体门票价格、开放时间数字（可用「建议出行前核实」类表述）。
2. 「imageSearchQuery」：单行中文关键词（8～40 字），含城市+景点+如 风景/旅拍 等。
3. 「imageSearchQueries」：3～5 条英文关键词短语（每条 2～8 个单词），用于在国际免费图库（Pexels/Unsplash）中搜索与该景点相关的竖版风景/旅拍照片，需具体可检索（可用景点通用英文名、城市英文名+landmark 等）。

只输出一个 JSON 对象，不要用 markdown 代码块，不要其它文字：
{"description":"……","imageSearchQuery":"三亚 天涯海角 风景","imageSearchQueries":["Sanya Tianya Haijiao coast","Hainan tropical beach landmark","China seaside wedding photography"]}`;

    const content = await this.callDeepSeek([
      {
        role: 'system',
        content:
          '你只输出合法 JSON：description（中文）、imageSearchQuery（中文单行）、imageSearchQueries（英文字符串数组），不要输出其它内容。',
      },
      { role: 'user', content: prompt },
    ]);

    const parsed = this.parseSpotDraftJson(content);
    let description = parsed.description;
    if (!description) {
      description = content.trim();
    }

    let imageSearchQuery = parsed.imageSearchQuery;
    if (!imageSearchQuery) {
      imageSearchQuery = [cityName, spotName, '旅游景点', '风景']
        .filter(Boolean)
        .join(' ')
        .trim();
    }

    const englishQueries =
      parsed.imageSearchQueries.length > 0
        ? parsed.imageSearchQueries
        : [
            `${spotName} travel landscape`,
            `${cityName || 'China'} scenic spot`,
            'destination wedding photography beach',
          ].filter((x) => x.trim().length > 2);

    const commonsSearchTerms = [
      [cityName, spotName].filter(Boolean).join(' '),
      spotName,
      cityName,
      imageSearchQuery,
    ].filter((t) => String(t).trim().length >= 2);

    const maxImages = 6;
    const built = await this.buildSpotDraftImageDataUrls(
      englishQueries,
      commonsSearchTerms,
      maxImages,
      `${cityName}|${spotName}`,
    );

    return {
      description,
      imageUrls: built.dataUrls,
      imagesNote: built.note,
      imageSearchQuery,
    };
  }

  private parsePackageDescriptionJson(content: string): {
    description: string;
    features: string[];
    includes: string[];
    excludes: string[];
  } {
    const trimmed = content.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = fenced ? fenced[1].trim() : trimmed;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { description: trimmed, features: [], includes: [], excludes: [] };
    }
    try {
      const obj = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      const description = this.jsonUnknownToTrimmedString(obj.description);
      const toList = (v: unknown): string[] => {
        if (!Array.isArray(v)) return [];
        return v
          .map((x) => this.jsonUnknownToTrimmedString(x))
          .filter(Boolean)
          .slice(0, 20);
      };
      const features = toList(obj.features);
      const includes = toList(obj.includes);
      const excludes = toList(obj.excludes);
      return {
        description: description || trimmed,
        features,
        includes,
        excludes,
      };
    } catch {
      return { description: trimmed, features: [], includes: [], excludes: [] };
    }
  }

  /**
   * 管理端：根据目的地、风格、价格、天数等生成套餐介绍（DeepSeek，仅文案）
   */
  async generatePackageDescriptionDraft(
    request: PackageDescriptionDraftRequest,
  ): Promise<PackageDescriptionDraftResult> {
    const location = String(request.location || '').trim();
    const styleLabel = String(request.styleLabel || '').trim();
    if (!location || !styleLabel) {
      throw new BadRequestException('请填写目的地与拍摄风格后再生成');
    }
    const price = Number(request.priceYuan);
    const duration = Number(request.durationDays);
    if (!Number.isFinite(price) || price < 0) {
      throw new BadRequestException('请填写有效的套餐价格');
    }
    if (!Number.isFinite(duration) || duration < 1) {
      throw new BadRequestException('请填写有效的行程天数（至少 1 天）');
    }
    const spotNames = Array.isArray(request.spotNames)
      ? request.spotNames
          .map((x) => String(x || '').trim())
          .filter(Boolean)
          .slice(0, 12)
      : [];
    const spotName = String(request.spotName || '').trim();
    const mergedSpotNames = spotNames.length
      ? spotNames
      : spotName
        ? [spotName]
        : [];
    const spotText = mergedSpotNames.length ? mergedSpotNames.join('、') : '';
    const featuresHint = String(request.featuresHint || '').trim();
    // 约束可交付数量，确保「费用包含」明确写出张数
    const refinedPhotos = Math.min(
      220,
      Math.max(20, Math.round(duration * 18 + Math.floor(price / 1200))),
    );
    const electronicPhotos = Math.min(
      800,
      Math.max(refinedPhotos + 40, Math.round(refinedPhotos * 3.2)),
    );

    const prompt = `你是婚纱旅拍产品文案编辑。根据下列套餐要素生成管理后台使用的文案与条目：

目的地（城市）：${location}
${spotText ? `关联景点：${spotText}\n` : ''}拍摄风格：${styleLabel}
套餐价格：${price} 元（人民币）
行程天数：${duration} 天
${featuresHint ? `套餐亮点参考（可提炼，非必须逐条照抄）：${featuresHint}\n` : ''}
费用包含中必须出现的交付数量：
- 精修照片：${refinedPhotos} 张
- 电子版照片：${electronicPhotos} 张

要求：
1. description：用简体中文写 180～320 字介绍，可分 2～3 个短段落；突出目的地与风格特色，以及${spotText ? '所有关联景点（需覆盖提及）' : '景点氛围'}、行程天数与价位带来的价值感、适合人群（如蜜月旅拍、周年纪念）；勿编造具体门店地址、合同细则或无法核实的承诺。文中提及的价格（${price} 元）与天数（${duration} 天）须与给定数字一致。
2. features：5～8 条「套餐亮点」，每条 8～18 字，避免空泛（如“服务很好”）。
3. includes：5～10 条「费用包含」，以服务/产出/保障为主（如“摄影师跟拍”“精修张数”“妆造服务”“服装造型”等）。必须包含且只能使用上述指定数量的两条：①“精修照片${refinedPhotos}张”；②“电子版照片${electronicPhotos}张”。
4. excludes：3～8 条「费用不含」，如交通住宿、餐费门票、个人消费、加急等，表述清晰。

只输出一个 JSON 对象，不要用 markdown 代码块，不要其它文字：
{"description":"……","features":["..."],"includes":["..."],"excludes":["..."]}`;

    const content = await this.callDeepSeek([
      {
        role: 'system',
        content:
          '你只输出合法 JSON：包含 description/features/includes/excludes 四个字段，不要输出其它内容。',
      },
      { role: 'user', content: prompt },
    ]);

    const parsed = this.parsePackageDescriptionJson(content);
    let description = parsed.description;
    if (!description) {
      description = content.trim();
    }
    if (!description) {
      throw new BadRequestException('模型未返回有效文案，请稍后重试');
    }
    const mustRefined = `精修照片${refinedPhotos}张`;
    const mustElectronic = `电子版照片${electronicPhotos}张`;
    const includes = [...parsed.includes];
    if (!includes.some((x) => x.includes('精修') && /\d+/.test(x))) {
      includes.unshift(mustRefined);
    }
    if (!includes.some((x) => x.includes('电子版') && /\d+/.test(x))) {
      includes.unshift(mustElectronic);
    }
    return {
      description,
      features: parsed.features,
      includes: includes.slice(0, 20),
      excludes: parsed.excludes,
    };
  }

  /**
   * 智能风格推荐 - 根据用户偏好推荐拍摄风格和景点
   */
  async recommendStyle(request: StyleRecommendationRequest): Promise<any> {
    const prompt = `
你是一位专业的婚纱旅拍顾问。根据用户的信息，推荐最适合的拍摄风格和景点：

用户偏好描述: ${request.preferences}
预算范围: ${request.budget ? `¥${request.budget}` : '未指定'}
适合场景: ${request.occasions?.join(', ') || '通用'}

请提供以下内容：
1. **推荐风格**: 3种最适合的拍摄风格
2. **推荐景点**: 每种风格对应的5个最佳景点
3. **风格特点**: 每种风格的特点描述
4. **最佳季节**: 推荐的拍摄季节
5. **预算参考**: 每种风格的预算范围

请用JSON格式返回，包含以下结构：
{
  "recommendedStyles": [
    {
      "name": "风格名称",
      "description": "风格描述",
      "season": "推荐季节",
      "budget": "预算范围",
      "topSpots": ["景点1", "景点2", "景点3", "景点4", "景点5"]
    }
  ],
  "personalizedAdvice": "个性化建议"
}`;

    const content = await this.callDeepSeek([
      {
        role: 'system',
        content:
          '你是一位专业的婚纱旅拍顾问，擅长根据客户需求推荐最适合的拍摄风格和景点。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        advice: content,
        preferences: request.preferences,
      };
    } catch (error) {
      return {
        advice: content,
        preferences: request.preferences,
      };
    }
  }

  /**
   * 智能行程规划 - 根据目的地和风格生成详细行程
   */
  async planItinerary(request: ItineraryPlanningRequest): Promise<any> {
    const prompt = `
你是一位专业的婚纱旅拍行程规划师。为用户规划一个完整的${request.duration}天${request.destination}婚纱旅拍行程：

目的地: ${request.destination}
天数: ${request.duration}天
拍摄风格: ${request.style}
兴趣爱好: ${request.interests?.join(', ') || '通用'}

请提供：
1. **行程总览**（overview 字段）：用一段话精炼概括主题与亮点，**中文总字数控制在 60 字以内**，避免冗长排比与套话
2. **日程安排**: 每天的详细日程（必须细化到上午/下午/傍晚三个时段）
3. **景点介绍**: 主要景点的拍摄要点
4. **最佳光线**: 每天的最佳拍摄时间
5. **实用建议**: 当地天气、交通、美食等建议（需给出至少 3 条可执行交通建议）
6. **准备清单**: 需要准备的物品和装备

请用JSON格式返回，包含以下结构：
{
  "destination": "目的地",
  "duration": 天数,
  "overview": "行程概述（60字以内、一段话）",
  "dailySchedule": [
    {
      "day": 1,
      "theme": "主题",
      "schedule": "上午：...；下午：...；傍晚：...（每个时段都要写清景点顺序、建议停留时长、以及上一站到下一站的交通方式+大致耗时）",
      "spots": ["景点1", "景点2"],
      "bestTime": "最佳拍摄时间",
      "tips": "拍摄技巧"
    }
  ],
  "packingList": ["物品1", "物品2"],
  "localTips": "当地实用建议（包含到达主城区交通、跨景点通勤路线、高峰避堵时段）"
}`;

    const content = await this.callDeepSeek([
      {
        role: 'system',
        content:
          '你是一位专业的婚纱旅拍行程规划师，擅长根据目的地和风格为用户设计完整的旅拍行程。输出 JSON 时 overview 须简短有力，中文不超过约 60 字；dailySchedule[].schedule 必须严格采用“上午：...；下午：...；傍晚：...”格式，并在每个时段写明交通路线（如地铁X号线/打车/步行）与大致耗时。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        plan: content,
        destination: request.destination,
        duration: request.duration,
      };
    } catch (error) {
      return {
        plan: content,
        destination: request.destination,
        duration: request.duration,
      };
    }
  }

  /**
   * 智能客服问答：根据登录用户解析角色（摄影师/妆造师/消费者等），注入对应系统提示词
   */
  async customerSupport(
    request: CustomerSupportRequest,
    actor?: { user?: any } | null,
  ): Promise<{
    answer: string;
  }> {
    const cleanQuestion = request.question?.trim();
    if (!cleanQuestion) {
      throw new HttpException('问题不能为空', HttpStatus.BAD_REQUEST);
    }

    const sanitizedHistory = (request.history || [])
      .filter((item) => item?.role && item?.content)
      .slice(-8)
      .map((item) => ({
        role: item.role,
        content: String(item.content).slice(0, 1000),
      }));

    const persona = resolveCustomerSupportPersona(actor?.user);
    const systemPrompt = buildCustomerSupportSystemPrompt(persona);

    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [
      { role: 'system', content: systemPrompt },
      ...sanitizedHistory,
      { role: 'user', content: cleanQuestion },
    ];

    const answer = await this.callDeepSeek(messages);
    return { answer };
  }

  /**
   * 保存客服问答历史
   */
  async saveCustomerSupportHistory(
    userId: number,
    question: string,
    answer: string,
  ): Promise<void> {
    const cleanQuestion = question.trim();
    const cleanAnswer = answer.trim();
    if (!cleanQuestion || !cleanAnswer) return;

    await this.prisma.customerSupportHistory.create({
      data: {
        userId,
        question: cleanQuestion,
        answer: cleanAnswer,
      },
    });
  }

  /**
   * 获取客服问答历史（按时间升序返回，便于前端直接回放）
   */
  async getCustomerSupportHistory(
    userId: number,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<CustomerSupportHistoryList> {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, Math.min(100, pageSize));
    const skip = (safePage - 1) * safePageSize;

    const items = await this.prisma.$queryRaw<
      Array<{
        id: bigint;
        question: string;
        answer: string;
        title: string | null;
        isPinned: boolean;
        pinnedAt: Date | null;
        createdAt: Date;
      }>
    >`
      SELECT id, question, answer, title, isPinned, pinnedAt, createdAt
      FROM customer_support_histories
      WHERE userId = ${userId}
      ORDER BY isPinned DESC,
        IF(isPinned = 1, pinnedAt, createdAt) DESC,
        id DESC
      LIMIT ${safePageSize} OFFSET ${skip}
    `;
    const totalRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count
      FROM customer_support_histories
      WHERE userId = ${userId}
    `;
    const total = Number(totalRows[0]?.count || 0);

    const now = new Date();
    const todayYmd = AiService.shanghaiYmd(now);
    const yesterdayYmd = AiService.shanghaiYesterdayYmd(todayYmd);

    return {
      items: items.map((item) => {
        const row = item as Record<string, unknown>;
        /** MySQL 驱动常把列名以小写返回，避免 createdAt 丢失导致前端无法分组 */
        const rawCreated = row.createdAt ?? row.createdat ?? row['createdAt'];
        let createdAt: Date;
        if (rawCreated instanceof Date) {
          createdAt = rawCreated;
        } else if (
          typeof rawCreated === 'string' ||
          typeof rawCreated === 'number'
        ) {
          createdAt = new Date(rawCreated);
        } else {
          createdAt = new Date(0);
        }
        const titleRaw = row.title ?? row.Title;
        const pinRaw = row.isPinned ?? row.ispinned;
        const pinnedAtRaw = row.pinnedAt ?? row.pinnedat;
        const titleResolved =
          typeof titleRaw === 'string'
            ? titleRaw
            : titleRaw == null
              ? null
              : typeof titleRaw === 'number' || typeof titleRaw === 'boolean'
                ? String(titleRaw)
                : null;
        const pinnedResolved =
          pinnedAtRaw instanceof Date
            ? pinnedAtRaw
            : pinnedAtRaw == null
              ? null
              : typeof pinnedAtRaw === 'string' ||
                  typeof pinnedAtRaw === 'number'
                ? new Date(pinnedAtRaw)
                : null;
        return {
          id: Number(item.id),
          question: item.question,
          answer: item.answer,
          title: titleResolved,
          isPinned: Boolean(pinRaw),
          pinnedAt: pinnedResolved,
          createdAt,
        };
      }),
      pagination: {
        total,
        page: safePage,
        pageSize: safePageSize,
      },
      grouping: {
        today: todayYmd,
        yesterday: yesterdayYmd,
      },
    };
  }

  /**
   * 更新客服历史自定义标题（仅本人）
   */
  async updateCustomerSupportHistoryTitle(
    userId: number,
    id: number,
    title: string,
  ): Promise<void> {
    const t = title.trim();
    const row = await this.prisma.customerSupportHistory.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new HttpException(
        { statusCode: 404, message: '记录不存在' },
        HttpStatus.NOT_FOUND,
      );
    }
    await this.prisma.customerSupportHistory.update({
      where: { id },
      data: { title: t.length > 0 ? t.slice(0, 400) : null },
    });
  }

  /**
   * 置顶 / 取消置顶（仅本人）
   */
  async toggleCustomerSupportHistoryPin(
    userId: number,
    id: number,
  ): Promise<{ isPinned: boolean }> {
    const row = await this.prisma.customerSupportHistory.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new HttpException(
        { statusCode: 404, message: '记录不存在' },
        HttpStatus.NOT_FOUND,
      );
    }
    const next = !row.isPinned;
    await this.prisma.customerSupportHistory.update({
      where: { id },
      data: {
        isPinned: next,
        pinnedAt: next ? new Date() : null,
      },
    });
    return { isPinned: next };
  }

  /**
   * 删除单条客服历史（仅本人）
   */
  async deleteCustomerSupportHistory(
    userId: number,
    id: number,
  ): Promise<void> {
    const res = await this.prisma.customerSupportHistory.deleteMany({
      where: { id, userId },
    });
    if (res.count === 0) {
      throw new HttpException(
        { statusCode: 404, message: '记录不存在' },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * 调试方法 - 返回当前配置（不包含完整的 API Key）
   */
  getDebugConfig() {
    return {
      volces: {
        apiKey: this.volcesApiKey
          ? `${this.volcesApiKey.substring(0, 12)}...${this.volcesApiKey.substring(this.volcesApiKey.length - 4)}`
          : 'NOT_SET',
        apiUrl: this.volcesApiUrl,
        model: this.volcesModel,
        visionChatModel: this.volcesVisionChatModel || 'NOT_SET',
        chatCompletionsUrl: this.volcesChatCompletionsUrl,
        envVars: {
          VOLCES_API_KEY: process.env.VOLCES_API_KEY ? 'SET' : 'NOT_SET',
          ARK_API_KEY: process.env.ARK_API_KEY ? 'SET' : 'NOT_SET',
          VOLCES_API_URL: process.env.VOLCES_API_URL ? 'SET' : 'NOT_SET',
          VOLCES_MODEL: process.env.VOLCES_MODEL ? 'SET' : 'NOT_SET',
          VOLCES_VISION_CHAT_MODEL: process.env.VOLCES_VISION_CHAT_MODEL
            ? 'SET'
            : 'NOT_SET',
          VOLCES_CHAT_URL: process.env.VOLCES_CHAT_URL ? 'SET' : 'NOT_SET',
        },
      },
      deepseek: {
        apiKey:
          this.deepseekApiKey.substring(0, 20) +
          '...' +
          this.deepseekApiKey.substring(this.deepseekApiKey.length - 5),
        baseURL: this.deepseekBaseURL,
        envVars: {
          DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? 'SET' : 'NOT_SET',
        },
      },
    };
  }

  /**
   * 虚拍可选风格：与「风格标签」后台启用的标签同步（名称、描述、图标、实例图）
   */
  async getAvailableStyles(): Promise<{ styles: unknown[] }> {
    const FALLBACK_DESC: Record<string, string> = {
      minimalist:
        '3:4竖版，浅灰/米白极简背景，新郎黑西装+领结，新娘缎面婚纱+轻纱；漫射光、低饱和、依偎互动，韩式画报胶片感',
      classical:
        '新中式：室内纯色正红背景，3:4竖版，正红与暖棕为基底；自然微笑，避免僵硬',
      bohemian: '阳光沙滩、轻盈纱裙，偏海岛度假与松弛氛围',
      romantic:
        '森系草坪胶片：阴天漫射光、深绿松柏、富士颗粒与莫兰迪色调；新郎黑西装领结、新娘抹胸/鱼尾蕾丝与大头纱，马蹄莲手捧，东亚情侣纪实互动',
      adventure:
        '大理苍山日出日照金山、云雾与枯黄草坡；蕾丝蓬蓬婚纱+刺绣头纱、黑西装领结、浅粉玫瑰手捧；逆光人像、背景虚化',
      artistic: '古镇街巷与人文旅拍，强调情绪、构图与故事感',
    };
    const DEFAULT_ICON: Record<string, string> = {
      minimalist: '⬜',
      classical: '👑',
      bohemian: '🌻',
      romantic: '✨',
      adventure: '⛰️',
      artistic: '🎨',
    };

    const tags = await this.prisma.styleTag.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    if (!tags.length) {
      return {
        styles: [
          'minimalist',
          'classical',
          'bohemian',
          'romantic',
          'adventure',
          'artistic',
        ].map((id) => ({
          id,
          name: this.defaultStyleNameForKey(id),
          description: FALLBACK_DESC[id] ?? '',
          icon: DEFAULT_ICON[id] ?? '✨',
          previewUrl: null as string | null,
        })),
      };
    }

    const styles = tags.map((t) => {
      const imgs = this.jsonToStringArray(t.sampleImages);
      return {
        id: t.key,
        name: t.name,
        description:
          (t.description && t.description.trim()) ||
          FALLBACK_DESC[t.key] ||
          '可在管理后台「风格标签」中补充描述，用于虚拍说明与 AI 提示',
        icon: (t.icon && t.icon.trim()) || DEFAULT_ICON[t.key] || '✨',
        previewUrl: imgs[0] || null,
      };
    });
    return { styles };
  }

  private defaultStyleNameForKey(key: string): string {
    const m: Record<string, string> = {
      minimalist: '韩式简约',
      classical: '国风典雅',
      bohemian: '海岛松弛',
      romantic: '森系草坪',
      adventure: '旷野自由',
      artistic: '纪实故事',
    };
    return m[key] || key;
  }

  private jsonToStringArray(v: unknown): string[] {
    if (!v) return [];
    if (Array.isArray(v)) return v.map((x) => String(x));
    return [];
  }

  /** 自定义风格：用后台描述生成虚拍文案块；无描述时返回 null */
  private async getVirtualTryOnAdviceForCustomStyle(
    styleKey: string,
  ): Promise<Record<string, unknown> | null> {
    const tag = await this.prisma.styleTag.findUnique({
      where: { key: styleKey },
    });
    if (!tag?.description?.trim()) return null;
    const d = tag.description.trim();
    return {
      style: styleKey,
      virtualAdvice: `虚拍画幅统一为 3:4 竖版。${d}`,
      makeupAdvice:
        '妆容与所选风格协调，自然通透、上镜立体；可按个性化偏好选项微调。',
      hairstyleAdvice: '发型与服装、场景统一，突出风格气质。',
      dressAdvice: '礼服或服装与场景、风格一致，层次与质感清晰。',
      shootingTips: [
        d.length > 200 ? `${d.slice(0, 200)}…` : d,
        '保持 3:4 竖构图，人物主体突出',
        '光线柔和均匀，肤色自然',
      ],
      previewDescription: d.length > 140 ? `${d.slice(0, 140)}…` : d,
    };
  }

  /**
   * 将外部URL的图片转换为base64格式
   */
  private async convertImageUrlToBase64(
    imageUrl: string,
  ): Promise<string | null> {
    try {
      // 如果已经是base64格式，直接返回
      if (imageUrl.startsWith('data:')) {
        return imageUrl;
      }

      // 如果是外部URL，由服务端下载再转 base64（避免浏览器直连火山 CDN 被防火墙/连接重置）
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 90000,
          maxContentLength: 50 * 1024 * 1024,
          maxBodyLength: 50 * 1024 * 1024,
          headers: {
            Accept: 'image/*,*/*;q=0.8',
            'User-Agent':
              'Mozilla/5.0 (compatible; GraduateDesignBackend/1.0; +https://localhost)',
          },
          validateStatus: (s) => s >= 200 && s < 400,
        });

        const buffer = Buffer.from(response.data);
        const contentType = response.headers['content-type'] || 'image/jpeg';
        const base64 = buffer.toString('base64');
        return `data:${contentType};base64,${base64}`;
      }

      return imageUrl;
    } catch (error) {
      console.error('[AI Service] 转换图片为base64失败:', error);
      return null;
    }
  }

  /**
   * 保存虚拍历史记录
   */
  async saveVirtualTryOnHistory(
    data: VirtualTryOnRequest,
    result: any,
    userId?: number,
    status: string = 'success',
    errorMessage?: string,
  ): Promise<any> {
    try {
      // 处理生成图片URL：如果是外部URL，转换为base64格式保存
      let modifiedImageUrl = result?.modifiedImageUrl || undefined;
      if (modifiedImageUrl && typeof modifiedImageUrl === 'string') {
        // 如果是外部URL，转换为base64格式
        if (
          modifiedImageUrl.startsWith('http://') ||
          modifiedImageUrl.startsWith('https://')
        ) {
          console.log('[AI Service] 检测到外部URL，转换为base64格式保存');
          const base64Url =
            await this.convertImageUrlToBase64(modifiedImageUrl);
          if (base64Url) {
            modifiedImageUrl = base64Url;
          } else {
            // 如果转换失败，仍然保存原始URL（至少可以尝试加载）
            console.warn('[AI Service] base64转换失败，保存原始URL');
          }
        }
      }

      const prefObj =
        data.preferences && typeof data.preferences === 'object'
          ? { ...data.preferences }
          : {};
      if (data.subjectRole) {
        (prefObj as Record<string, unknown>).subjectRole = data.subjectRole;
      }

      return await this.prisma.virtualTryOnHistory.create({
        data: {
          imageUrl: data.imageUrl,
          style: data.style,
          preferences:
            Object.keys(prefObj).length > 0 ? (prefObj as object) : undefined,
          modifiedImageUrl: modifiedImageUrl,
          virtualAdvice: result?.virtualAdvice || undefined,
          makeupAdvice: result?.makeupAdvice || undefined,
          hairstyleAdvice: result?.hairstyleAdvice || undefined,
          dressAdvice: result?.dressAdvice || undefined,
          shootingTips: result?.shootingTips || undefined,
          previewDescription: result?.previewDescription || undefined,
          userId: userId || undefined,
          status,
          errorMessage: errorMessage || undefined,
        },
      });
    } catch (error) {
      console.error('[AI Service] 保存虚拍历史失败:', error);
      throw error; // 抛出异常，让上层处理
    }
  }

  /**
   * 保存风格推荐历史记录
   */
  async saveStyleRecommendationHistory(
    data: StyleRecommendationRequest,
    result: any,
    userId?: number,
    status: string = 'success',
    errorMessage?: string,
  ): Promise<any> {
    try {
      return await this.prisma.styleRecommendationHistory.create({
        data: {
          preferences: data.preferences,
          budget: data.budget || undefined,
          occasions: data.occasions || undefined,
          recommendedStyles: result?.recommendedStyles || undefined,
          personalizedAdvice: result?.personalizedAdvice || undefined,
          userId: userId || undefined,
          status,
          errorMessage: errorMessage || undefined,
        },
      });
    } catch (error) {
      console.error('[AI Service] 保存风格推荐历史失败:', error);
      throw error; // 抛出异常，让上层处理
    }
  }

  /**
   * 保存行程规划历史记录
   */
  async saveItineraryPlanningHistory(
    data: ItineraryPlanningRequest,
    result: any,
    userId?: number,
    status: string = 'success',
    errorMessage?: string,
  ): Promise<any> {
    try {
      return await this.prisma.itineraryPlanningHistory.create({
        data: {
          destination: data.destination,
          duration: data.duration,
          style: data.style,
          interests: data.interests || undefined,
          overview: result?.overview || undefined,
          dailySchedule: result?.dailySchedule || undefined,
          packingList: result?.packingList || undefined,
          localTips: result?.localTips || undefined,
          userId: userId || undefined,
          status,
          errorMessage: errorMessage || undefined,
        },
      });
    } catch (error) {
      console.error('[AI Service] 保存行程规划历史失败:', error);
      throw error; // 抛出异常，让上层处理
    }
  }

  /**
   * $queryRaw 在 MySQL 驱动下常把整型列返回为 BigInt，JSON 序列化会抛错，需转为 number
   */
  private normalizeVirtualTryOnRawRows(rows: any[]): VirtualTryOnHistory[] {
    return rows.map((row) => ({
      ...row,
      id: Number(row.id),
      userId: row.userId != null ? Number(row.userId) : null,
    })) as VirtualTryOnHistory[];
  }

  /**
   * 获取当前用户的虚拍历史记录（按创建时间倒序，支持分页）
   * @param subjectRole 可选：female | male | couple，不传则返回全部（MySQL JSON 用原生 SQL 筛选）
   */
  async getVirtualTryOnHistoriesByUser(
    userId: number,
    page: number = 1,
    pageSize: number = 10,
    subjectRole?: VirtualTryOnSubjectRole,
    scene: VirtualTryOnHistoryScene = 'all',
  ) {
    const skip = (page - 1) * pageSize;
    const sceneWhere: Prisma.VirtualTryOnHistoryWhereInput =
      scene === 'makeup-try-on'
        ? { style: { startsWith: 'makeup-' } }
        : scene === 'virtual-try-on'
          ? { NOT: { style: { startsWith: 'makeup-' } } }
          : {};

    if (!subjectRole) {
      const [items, total] = await this.prisma.$transaction([
        this.prisma.virtualTryOnHistory.findMany({
          where: { userId, ...sceneWhere },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        this.prisma.virtualTryOnHistory.count({
          where: { userId, ...sceneWhere },
        }),
      ]);
      return {
        items,
        pagination: {
          total,
          page,
          pageSize,
        },
      };
    }

    /** preferences.subjectRole 缺省或空 → 视为女生（兼容旧数据） */
    const roleSql =
      subjectRole === 'female'
        ? Prisma.sql`COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(preferences, '$.subjectRole')), ''), 'female') = 'female'`
        : subjectRole === 'male'
          ? Prisma.sql`JSON_UNQUOTE(JSON_EXTRACT(preferences, '$.subjectRole')) = 'male'`
          : Prisma.sql`JSON_UNQUOTE(JSON_EXTRACT(preferences, '$.subjectRole')) = 'couple'`;
    const sceneSql =
      scene === 'makeup-try-on'
        ? Prisma.sql`style LIKE 'makeup-%'`
        : scene === 'virtual-try-on'
          ? Prisma.sql`(style NOT LIKE 'makeup-%' OR style IS NULL)`
          : Prisma.sql`1=1`;

    const rawItems = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM virtual_try_on_histories
      WHERE userId = ${userId}
      AND ${roleSql}
      AND ${sceneSql}
      ORDER BY createdAt DESC
      LIMIT ${pageSize} OFFSET ${skip}
    `;

    const countRow = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count FROM virtual_try_on_histories
      WHERE userId = ${userId}
      AND ${roleSql}
      AND ${sceneSql}
    `;
    const total = Number(countRow[0].count);

    const items = this.normalizeVirtualTryOnRawRows(rawItems);

    return {
      items,
      pagination: {
        total,
        page,
        pageSize,
      },
    };
  }

  /**
   * 获取当前用户的风格推荐历史记录（按创建时间倒序，支持分页）
   */
  async getStyleRecommendationHistoriesByUser(
    userId: number,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.styleRecommendationHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.styleRecommendationHistory.count({
        where: { userId },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        pageSize,
      },
    };
  }

  /**
   * 获取当前用户的行程规划历史记录（按创建时间倒序，支持分页）
   */
  async getItineraryPlanningHistoriesByUser(
    userId: number,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.itineraryPlanningHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.itineraryPlanningHistory.count({
        where: { userId },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        pageSize,
      },
    };
  }

  /**
   * 删除虚拍历史记录
   */
  async deleteVirtualTryOnHistory(id: number, userId: number): Promise<void> {
    const history = await this.prisma.virtualTryOnHistory.findFirst({
      where: { id, userId },
    });

    if (!history) {
      throw new HttpException(
        {
          statusCode: 404,
          message: '历史记录不存在或无权访问',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.virtualTryOnHistory.delete({
      where: { id },
    });
  }

  /**
   * 删除风格推荐历史记录
   */
  async deleteStyleRecommendationHistory(
    id: number,
    userId: number,
  ): Promise<void> {
    const history = await this.prisma.styleRecommendationHistory.findFirst({
      where: { id, userId },
    });

    if (!history) {
      throw new HttpException(
        {
          statusCode: 404,
          message: '历史记录不存在或无权访问',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.styleRecommendationHistory.delete({
      where: { id },
    });
  }

  /**
   * 删除行程规划历史记录
   */
  async deleteItineraryPlanningHistory(
    id: number,
    userId: number,
  ): Promise<void> {
    const history = await this.prisma.itineraryPlanningHistory.findFirst({
      where: { id, userId },
    });

    if (!history) {
      throw new HttpException(
        {
          statusCode: 404,
          message: '历史记录不存在或无权访问',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.itineraryPlanningHistory.delete({
      where: { id },
    });
  }
}
