import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

export interface VirtualTryOnRequest {
  imageUrl: string;
  style: string;
  preferences?: {
    makeup?: string;
    hairstyle?: string;
    dress?: string;
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

@Injectable()
export class AiService {
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
   * AI 虚拍 - 生成虚拍建议和修改后的图片效果（基于风格模板）
   */
  async generateVirtualTryOn(request: VirtualTryOnRequest): Promise<any> {
    // 直接定义虚拍建议模板（基于风格）
    const styleAdvice: Record<string, any> = {
      romantic: {
        style: 'romantic',
        virtualAdvice:
          '浪漫梦幻风格强调柔和的光线和优雅的气质，适合营造温暖而梦幻的氛围。',
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
          '修改后的图片将呈现出柔和、梦幻的视觉效果，整体色调偏暖，光线柔和，营造出温暖而优雅的婚礼氛围。',
      },
      artistic: {
        style: 'artistic',
        virtualAdvice: '艺术文艺风格体现创意和个性，追求构图的创意性和艺术感。',
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
          '修改后的图片将展现出艺术感十足的效果，构图独特，色调对比度高，充满创意和个性。',
      },
      bohemian: {
        style: 'bohemian',
        virtualAdvice:
          '波西米亚风格强调自由奔放和异域风情，适合自然光和户外场景。',
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
          '修改后的图片将呈现出充满异域风情的效果，自然光充足，色调温暖，充满生活气息和自由感。',
      },
      minimalist: {
        style: 'minimalist',
        virtualAdvice:
          '极简现代风格强调简洁大气和线条感，追求视觉上的纯净和舒适。',
        makeupAdvice: '建议使用简洁的妆容，强调肌肤质感，眼妆清淡但有神采。',
        hairstyleAdvice: '推荐贴头皮或简约的发型，露出脸部线条。',
        dressAdvice: '选择设计简洁的婚纱，注重剪裁和质感，避免繁复装饰。',
        shootingTips: [
          '使用纯色或单一纹理的背景',
          '强调构图中的几何形状和对称性',
          '控制画面元素，避免视觉混乱',
          '使用高饱和度的光线，营造干净利落的效果',
          '后期处理保持简洁，避免过度修饰',
        ],
        previewDescription:
          '修改后的图片将展现出极简现代的美感，画面干净利落，色调简洁，强调线条和空间感。',
      },
      classical: {
        style: 'classical',
        virtualAdvice:
          '古典优雅风格融合传统元素和现代审美，营造庄重而典雅的氛围。',
        makeupAdvice: '建议使用经典的棕色系妆容，强调眼型和唇型的精致感。',
        hairstyleAdvice: '推荐盘发或优雅的发型，可配以古典风格的发饰。',
        dressAdvice: '选择经典设计的婚纱，注重优雅的剪裁和精致的细节。',
        shootingTips: [
          '选择具有历史感的建筑或场景作为背景',
          '使用正式的姿态和构图',
          '强调细节和质感，如蕾丝或珍珠',
          '使用柔和的光线营造贵族气质',
          '后期处理采用低饱和度和暖色调',
        ],
        previewDescription:
          '修改后的图片将呈现出古典优雅的气质，画面庄重典雅，色调沉着冷静，充满贵族范儿。',
      },
      adventure: {
        style: 'adventure',
        virtualAdvice: '冒险活力风格充满能量和青春气息，适合展现自信和活力。',
        makeupAdvice:
          '建议使用鲜艳的色彩搭配，如橙红色或珊瑚色，打造充满活力的妆容。',
        hairstyleAdvice: '推荐蓬松的长卷发或活力感十足的短发。',
        dressAdvice: '选择设计感强、颜色鲜艳的婚纱，彰显个性和活力。',
        shootingTips: [
          '选择开阔的户外场景，如海边或山地',
          '捕捉动态的运动瞬间',
          '使用鲜艳的色彩和高对比度的光线',
          '鼓励自信和夸张的姿态',
          '使用高饱和度的滤镜，营造充满活力的效果',
        ],
        previewDescription:
          '修改后的图片将展现出充满活力的效果，色彩鲜艳，充满能量，展现出青春和自信的气质。',
      },
    };

    // 获取对应风格的建议
    const advice = styleAdvice[request.style] || styleAdvice.romantic;

    // 调用火山引擎 API 生成处理后的图片
    let modifiedImageUrl = request.imageUrl;
    try {
      modifiedImageUrl = await this.generateModifiedImage(
        request.imageUrl,
        request.style,
      );
    } catch (imageError) {
      console.error('[AI Service] 生成修改图片时出错:', imageError);
      // 如果生成失败，继续使用原始图片
    }

    return {
      ...advice,
      modifiedImageUrl,
    };
  }

  /**
   * 调用火山引擎 API 生成虚拍处理后的图片
   */
  private async generateModifiedImage(
    imageUrl: string,
    style: string,
  ): Promise<string> {
    try {
      // 如果是 Base64 格式，直接使用（火山引擎支持 Base64）
      // 如果是 URL 格式，也直接使用
      let finalImageUrl = imageUrl;

      console.log('[AI Service] 处理图片 URL:', {
        isBase64: imageUrl.startsWith('data:'),
        style,
      });

      // 根据风格生成相应的提示词
      const stylePrompts: Record<string, string> = {
        romantic:
          '生成浪漫梦幻风格的高级婚纱摄影照片，柔和光线，优雅气质，细节精致，高保真，工作室灯光',
        artistic:
          '生成艺术文艺风格的高级婚纱摄影照片，创意构图，艺术感，细节丰富，高保真，前沿摄影',
        bohemian:
          '生成波西米亚风格的高级婚纱摄影照片，自由奔放，异域风情，自然光，高保真，充满生活气息',
        minimalist:
          '生成极简现代风格的高级婚纱摄影照片，简洁大气，强调线条和留白，高保真，现代美学',
        classical:
          '生成古典优雅风格的高级婚纱摄影照片，庄重典雅，融合传统元素，高保真，气质优雅',
        adventure:
          '生成冒险活力风格的高级婚纱摄影照片，充满能量，展现青春活力，自然光，高保真，动感十足',
      };

      const prompt =
        stylePrompts[style] || '生成高级婚纱摄影照片，高保真，专业级别';

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
        prompt,
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
        const generatedUrl = response.data.data[0]?.url;
        if (generatedUrl) {
          console.log(
            '[AI Service] 火山引擎 API 返回成功，图片 URL:',
            generatedUrl,
          );
          return generatedUrl;
        }
      }

      // 备用检查 image_url 字段（兼容其他格式）
      if (response.data?.data?.image_url) {
        console.log(
          '[AI Service] 火山引擎 API 返回成功，图片 URL:',
          response.data.data.image_url,
        );
        return response.data.data.image_url;
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
      romantic: { name: '浪漫梦幻', color: '#ff758c' },
      artistic: { name: '艺术文艺', color: '#9b59b6' },
      bohemian: { name: '波西米亚', color: '#e67e22' },
      minimalist: { name: '极简现代', color: '#34495e' },
      classical: { name: '古典优雅', color: '#c0504d' },
      adventure: { name: '冒险活力', color: '#27ae60' },
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
   * 获取可用的风格列表
   */
  async getAvailableStyles(): Promise<any> {
    return {
      styles: [
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
      ],
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

      // 如果是外部URL，下载并转换为base64
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 10000, // 10秒超时
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

      return await this.prisma.virtualTryOnHistory.create({
        data: {
          imageUrl: data.imageUrl,
          style: data.style,
          preferences: data.preferences || undefined,
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
   * 获取当前用户的虚拍历史记录（按创建时间倒序，支持分页）
   */
  async getVirtualTryOnHistoriesByUser(
    userId: number,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.virtualTryOnHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.virtualTryOnHistory.count({
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
}
