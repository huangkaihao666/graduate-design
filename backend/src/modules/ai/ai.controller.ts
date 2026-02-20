import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type {
  VirtualTryOnRequest,
  StyleRecommendationRequest,
  ItineraryPlanningRequest,
} from './ai.service';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * 获取可用的拍摄风格列表
   */
  @Get('styles')
  async getStyles() {
    return this.aiService.getAvailableStyles();
  }

  /**
   * 调试接口 - 获取配置信息
   */
  @Get('debug/config')
  async getDebugConfig() {
    return this.aiService.getDebugConfig();
  }

  /**
   * AI 虚拍 - 生成虚拍建议
   */
  @Post('virtual-try-on')
  async virtualTryOn(@Body() request: VirtualTryOnRequest, @Req() req: any) {
    try {
      const result = await this.aiService.generateVirtualTryOn(request);
      const userId = req.user?.sub ? parseInt(req.user.sub) : undefined;

      return {
        statusCode: 200,
        message: '虚拍建议生成成功',
        data: {
          userId: userId || 'guest',
          ...result,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error('[AI Controller] 虚拍生成失败:', error);
      throw new HttpException(
        {
          statusCode: 400,
          message: error.message || '生成虚拍建议失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 智能风格推荐 - 推荐拍摄风格和景点
   */
  @Post('style-recommendation')
  async recommendStyle(
    @Body() request: StyleRecommendationRequest,
    @Req() req: any,
  ) {
    try {
      const result = await this.aiService.recommendStyle(request);
      const userId = req.user?.sub ? parseInt(req.user.sub) : undefined;

      return {
        statusCode: 200,
        message: '风格推荐生成成功',
        data: {
          userId: userId || 'guest',
          ...result,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error('[AI Controller] 风格推荐失败:', error);
      throw new HttpException(
        {
          statusCode: 400,
          message: error.message || '生成风格推荐失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 智能行程规划 - 根据目的地和风格生成行程
   */
  @Post('itinerary-planning')
  async planItinerary(
    @Body() request: ItineraryPlanningRequest,
    @Req() req: any,
  ) {
    try {
      const result = await this.aiService.planItinerary(request);
      const userId = req.user?.sub ? parseInt(req.user.sub) : undefined;

      return {
        statusCode: 200,
        message: '行程规划生成成功',
        data: {
          userId: userId || 'guest',
          ...result,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error('[AI Controller] 行程规划失败:', error);
      throw new HttpException(
        {
          statusCode: 400,
          message: error.message || '生成行程规划失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 保存 AI 生成历史
   */
  @Post('save-history')
  async saveHistory(
    @Body()
    body: {
      type: 'virtual-try-on' | 'style-recommendation' | 'itinerary-planning';
      input: any;
      output: any;
    },
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.sub ? parseInt(req.user.sub) : undefined;

      if (body.type === 'virtual-try-on') {
        // 保存虚拍历史
        await this.aiService.saveVirtualTryOnHistory(
          body.input,
          body.output,
          userId,
          'success',
        );
      } else if (body.type === 'style-recommendation') {
        // 保存风格推荐历史
        await this.aiService.saveStyleRecommendationHistory(
          body.input,
          body.output,
          userId,
          'success',
        );
      } else if (body.type === 'itinerary-planning') {
        // 保存行程规划历史
        await this.aiService.saveItineraryPlanningHistory(
          body.input,
          body.output,
          userId,
          'success',
        );
      }

      return {
        statusCode: 200,
        message: '历史记录保存成功',
        data: {
          userId: userId || 'guest',
          type: body.type,
          savedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error('[AI Controller] 保存历史失败:', error);
      throw new HttpException(
        {
          statusCode: 400,
          message: error.message || '保存历史记录失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
