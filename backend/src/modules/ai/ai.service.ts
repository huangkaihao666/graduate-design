import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, type VirtualTryOnHistory } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

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

  // 火山引擎（字节跳动）图像生成 API 配置
  private readonly volcesApiKey =
    process.env.VOLCES_API_KEY || 'b36d35f5-5fc6-45ff-a279-5650574d947d';
  private readonly volcesApiUrl =
    process.env.VOLCES_API_URL ||
    'https://ark.cn-beijing.volces.com/api/v3/images/generations';
  private readonly volcesModel =
    process.env.VOLCES_MODEL || 'doubao-seedream-4-5-251128';

  // DeepSeek API 配置
  private readonly deepseekApiKey =
    process.env.DEEPSEEK_API_KEY || 'sk-9ac47d9827ba4f20be971e7dace87264';
  private readonly deepseekBaseURL =
    'https://api.deepseek.com/chat/completions';

  constructor(private readonly prisma: PrismaService) {
    console.log('[AI Service] 初始化配置:');
    console.log(
      '[AI Service] Volces API Key:',
      this.volcesApiKey.substring(0, 20) + '...',
    );
    console.log('[AI Service] Volces Model:', this.volcesModel);
    console.log('[AI Service] Volces URL:', this.volcesApiUrl);
    console.log(
      '[AI Service] DeepSeek API Key:',
      this.deepseekApiKey.substring(0, 20) + '...',
    );
  }

  /**
   * 韩式简约：女生单人 / 男生单人 / 男女双人 三套文案（与前端展示、图生图提示一致）
   */
  private getMinimalistStyleAdvice(subjectRole: VirtualTryOnSubjectRole) {
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
          '虚拍画幅统一为 3:4 竖版。森系草坪风格强调自然光、草坪与绿植，清新柔美，适合森系婚礼与户外仪式。',
        makeupAdvice:
          '建议使用柔和的粉色系妆容，强调眼影的层次感，打造温柔的眼神。',
        hairstyleAdvice: '推荐盘发或半扎造型，配以精致的头饰，展现温婉气质。',
        dressAdvice: '选择蓬松的婚纱设计，配以精致的蕾丝和珍珠装饰。',
        shootingTips: [
          '利用窗边的自然光线创造柔和的光影效果',
          '选择中性色调的背景，避免分散注意力',
          '多进行近距离拍摄，突出细节和纹理',
          '鼓励自然的姿态和真实的情感表达',
          '使用低饱和度的滤镜后期处理',
        ],
        previewDescription:
          '修改后的图片将呈现森系草坪的清新感，自然光充足，绿意与纱裙呼应，氛围温柔治愈。',
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
          '虚拍画幅统一为 3:4 竖版。海岛松弛风格强调阳光、沙滩与度假感，轻盈纱裙与松弛姿态，适合海岛旅拍。',
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
          '虚拍画幅统一为 3:4 竖版。旷野自由风格强调公路、山野、雪山垭口与开阔天际，动感与风感，适合川西、公路与雪山雪景旅拍大片。',
        makeupAdvice:
          '可使用活力暖色妆面，或雪山场景下的冰感冷调高光与腮红，注意雪地反射下的曝光与肤质表现。',
        hairstyleAdvice:
          '推荐蓬松长卷、利落短发或搭配毛绒针织帽/防风造型，雪山风大时便于固定与保暖感呈现。',
        dressAdvice:
          '可选择长拖尾、斗篷、皮衣混搭或耐寒披肩款婚纱，雪山远景时注意层次与与环境冷暖对比。',
        shootingTips: [
          '选择开阔户外：公路、草甸、垭口，或雪山与雪景远景，注意天空与积雪的曝光',
          '捕捉动态瞬间：行走、回眸、风吹纱裙，雪山前宜留白构图突出主峰',
          '利用侧光或黄金时刻增强立体感，雪地可适当降低曝光补偿避免过曝',
          '鼓励自信、舒展的姿态，远景人物与雪山比例可参考环境人像',
          '后期可强化冷暖对比（蓝天白雪与人物暖调）或电影感青橙色调',
        ],
        previewDescription:
          '修改后的图片将呈现旷野自由的张力：或公路旷野、或雪山垭口雪景，视野开阔、动感十足，像电影感旅拍大片。',
      },
    };

    // 获取对应风格的建议（韩式简约按出镜方式分三套文案；自定义风格读库）
    const subjectRole: VirtualTryOnSubjectRole =
      request.subjectRole || 'female';
    let advice =
      normalizedStyle === 'minimalist'
        ? this.getMinimalistStyleAdvice(subjectRole)
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
      romantic: '珍珠头饰或头纱',
      adventure: '礼帽或披肩',
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

    if (subjectRole === 'male') {
      return (
        ` 【图生图硬性要求-新郎/男生单人】` +
        `参考图仅用于保持同一人面部身份与五官相似度；` +
        `必须彻底重绘头发造型（含帽子、发际线、分缝、长度与蓬松度）与全身着装（含外套、大衣、西装、衬衫、配饰），` +
        `严格按用户选择落实：${zhList}。` +
        `配饰必须在画面中清晰可见且与风格匹配，不可省略。` +
        `严禁沿用参考图中的发型、帽子与衣物款式；若原图为长发而用户选择短发/背头/戴帽，输出须体现该造型。` +
        ` Image edit for solo groom: preserve facial identity only; completely redraw hair (including hats) and full outfit to match: makeup "${enMk}", hairstyle "${enHs}", clothing "${enDr}", accessory "${enAcc}". ` +
        `Do NOT keep the reference photo's original hairstyle, hat, or garments.`
      );
    }

    if (subjectRole === 'couple') {
      return (
        ` 【图生图硬性要求-双人合影】参考图用于人物身份；须按用户选择调整妆容、发型与服装（男女造型均需落实），` +
        `用户选择：${zhList}。配饰必须可见并符合风格语义。勿完整沿用原图婚纱/西装与发型。` +
        ` Couple edit: apply styling per user (${enMk} / ${enHs} / ${enDr} / ${enAcc}); replace outfits and hairstyles; keep accessories visible and style-consistent.`
      );
    }

    return (
      ` 【图生图硬性要求-新娘/女生】参考图仅保留面部身份；须按用户选择更换妆容、发型与婚纱/礼服：${zhList}。` +
      `配饰（如头纱/发簪等）需与风格一致并清晰可见。` +
      `勿沿用原图发型与裙装款式。` +
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

      // 根据风格生成相应的提示词（女生/双人偏婚纱叙事）
      const stylePrompts: Record<string, string> = {
        romantic:
          '3:4竖版，生成森系草坪风格的高级婚纱摄影照片，自然光、草坪绿植、清新柔美，高保真，森系婚礼感',
        artistic:
          '3:4竖版，生成纪实故事风格的高级婚纱摄影照片，古镇街巷与人文旅拍，情绪与构图，高保真，电影叙事感',
        bohemian:
          '3:4竖版，生成海岛松弛风格的高级婚纱摄影照片，阳光沙滩、轻盈纱裙、度假松弛感，高保真',
        minimalist:
          '韩式简约新娘单人婚纱照，3:4竖版，纯色浅灰米白极简背景，柔和漫射光通透低饱和，细腻胶片质感韩式画报风。缎面婚纱可选法式方领A字垂坠、深V心形修身、圆领松弛、立领长袖伞裙；轻薄短头纱，清透伪素颜妆，低盘碎发，侧身静立或轻提裙摆，温婉淡笑，缎面光泽，温柔治愈高级感。高保真',
        classical:
          '新中式国风新娘单人婚纱照，3:4竖版，室内纯色正红背景无室外，色彩正红与暖棕为基底，秀禾龙凤褂或改良旗袍金饰刺绣，柔光均匀。表情自然亲切可面向镜头微笑，眼神温柔，避免僵硬。高保真',
        adventure:
          '3:4竖版，生成旷野自由风格的高级婚纱摄影照片，可含公路山野或雪山雪景垭口远景、开阔天际、高原旅拍大片感，高保真',
      };

      /** 男生单人：避免「婚纱/纱裙」等新娘向词汇，强调西装/男装与环境，利于与偏好一致 */
      const stylePromptsMale: Record<string, string> = {
        romantic:
          '3:4竖版，生成森系草坪风格的新郎婚礼人像照片，自然光、草坪绿植，男士西装或礼服造型，清新利落，高保真',
        artistic:
          '3:4竖版，生成纪实故事风格的新郎婚礼人像照片，古镇街巷与人文旅拍，男士西装或大衣，情绪与构图，高保真，电影叙事感',
        bohemian:
          '3:4竖版，生成海岛松弛风格的新郎婚礼人像照片，阳光沙滩，男士浅色西装或亚麻休闲正装，度假松弛感，高保真',
        minimalist:
          '韩式简约新郎单人婚礼人像，3:4竖版，浅灰米白极简纯色背景，均匀柔和漫射光，低饱和通透干净，细腻胶片颗粒。西装可选黑色戗驳领+丝质领结、深灰平驳领修身+简约领带、黑色休闲单排扣微开领无领带。发型清爽，站姿放松，单手插袋或自然垂臂，面部光影柔和，表情温和淡然，韩系简约绅士格调。高保真',
        classical:
          '新中式国风新郎单人，3:4竖版，室内纯色正红背景，正红暖棕色调，中山装长衫或新中式男装。表情自然微笑可面向镜头，神态放松，避免僵硬。高保真',
        adventure:
          '3:4竖版，生成旷野自由风格的新郎婚礼人像照片，可含公路山野或雪山垭口远景，男士大衣/皮衣/西装叠穿，高原旅拍大片感，高保真',
      };

      const subjectTail: Record<VirtualTryOnSubjectRole, string> = {
        female:
          '。画面主体为新娘/女性单人，婚礼婚纱或礼服造型，人物与场景共同入镜',
        male: '。画面主体为新郎/男性单人，婚礼西装、礼服或中式男装，人物与场景共同入镜',
        couple:
          '。画面为新郎与新娘双人合影，男女同框出镜，婚纱与西装或礼服搭配，亲密放松的互动与走位，避免呆板并排立正',
      };

      /** 双人合影：韩式简约使用用户提供的完整画报向描述（含新郎新娘造型） */
      const stylePromptsCouple: Partial<Record<string, string>> = {
        minimalist:
          '韩式简约男女双人婚纱照，3:4竖版，浅灰米白极简纯色背景，柔和漫射光铺满，低饱和温柔色调，细腻胶片质感治愈高级。新娘缎面婚纱+轻薄头纱素雅干净，新郎简约西装利落沉稳。轻拥依偎、并肩对视、牵手浅笑，肢体松弛无摆拍，表情温柔缱绻。无多余道具，缎面与西装线条映衬，极简构图韩系画报，甜蜜瞬间。高保真',
        classical:
          '新中式国风男女双人婚纱照，3:4竖版，室内纯色正红背景，正红与暖棕为色彩基底，新娘秀禾龙凤褂或红裙旗袍，新郎中山装或新中式男装金饰细节。两人表情自然，可面向镜头微笑，并肩或轻靠，亲密放松，避免僵硬摆拍。高保真',
      };

      const prompt = makeupOnly
        ? (() => {
            const mk =
              preferenceLabels?.makeup?.trim() ||
              preferences?.makeup?.trim() ||
              style ||
              '自然清透';
            return (
              ` Face-only makeup retouch, preserve identity. ` +
              `STRICT: keep original clothes, hairstyle structure, pose, framing and background unchanged; do not replace outfit; do not change scene. ` +
              `Only enhance facial makeup details (foundation, eyebrow, eyeshadow, eyeliner, blush, lip color) with style "${mk}". ` +
              `Natural skin texture, realistic look, avoid plastic skin. ` +
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
            const compositionBlock =
              style === 'classical'
                ? this.buildClassicalNeoChineseCompositionPrompt()
                : this.buildVirtualTryOnCompositionPrompt();
            const editBlock = this.buildVirtualTryOnImageEditPrompt(
              subjectRole,
              style,
              preferences,
              preferenceLabels,
            );
            return `${aspectRatioBlock}${basePrompt}${subjectTail[subjectRole]}${compositionBlock}${editBlock}`;
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
1. **行程总览**: 整体行程概述
2. **日程安排**: 每天的详细日程
3. **景点介绍**: 主要景点的拍摄要点
4. **最佳光线**: 每天的最佳拍摄时间
5. **实用建议**: 当地天气、交通、美食等建议
6. **准备清单**: 需要准备的物品和装备

请用JSON格式返回，包含以下结构：
{
  "destination": "目的地",
  "duration": 天数,
  "overview": "行程概述",
  "dailySchedule": [
    {
      "day": 1,
      "theme": "主题",
      "schedule": "日程详情",
      "spots": ["景点1", "景点2"],
      "bestTime": "最佳拍摄时间",
      "tips": "拍摄技巧"
    }
  ],
  "packingList": ["物品1", "物品2"],
  "localTips": "当地实用建议"
}`;

    const content = await this.callDeepSeek([
      {
        role: 'system',
        content:
          '你是一位专业的婚纱旅拍行程规划师，擅长根据目的地和风格为用户设计完整的旅拍行程。',
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
   * 智能客服问答 - 面向平台用户的帮助咨询
   */
  async customerSupport(request: CustomerSupportRequest): Promise<{
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

    const systemPrompt = `
你是“旅拍·智享”平台的智能客服助手，请使用中文回答用户问题。

回答要求：
1. 优先解答平台常见问题：套餐浏览、下单预约、支付、订单、收藏、AI 功能使用、账号与登录。
2. 如果问题信息不足，请先提出 1-2 个澄清问题，不要编造不存在的规则。
3. 回答要简洁、可执行，可用分点形式。
4. 若涉及退款、账号异常等需要人工介入的问题，请明确建议联系人工客服并说明需准备的信息（订单号、手机号、问题截图等）。
`.trim();

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
        apiKey:
          this.volcesApiKey.substring(0, 20) +
          '...' +
          this.volcesApiKey.substring(this.volcesApiKey.length - 5),
        apiUrl: this.volcesApiUrl,
        model: this.volcesModel,
        envVars: {
          VOLCES_API_KEY: process.env.VOLCES_API_KEY ? 'SET' : 'NOT_SET',
          VOLCES_API_URL: process.env.VOLCES_API_URL ? 'SET' : 'NOT_SET',
          VOLCES_MODEL: process.env.VOLCES_MODEL ? 'SET' : 'NOT_SET',
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
      romantic: '自然光、草坪与绿植，清新柔美、森系婚礼感',
      adventure: '公路、山野、雪山雪景与开阔天际，动感与旅拍大片感',
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
