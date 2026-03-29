import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type {
  CustomerSupportRequest,
  ItineraryPlanningRequest,
  StyleRecommendationRequest,
  VirtualTryOnRequest,
  VirtualTryOnSubjectRole,
} from './ai.service';
import { AiService } from './ai.service';
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
   * 帮助中心智能客服问答
   */
  @Post('customer-support')
  async customerSupport(
    @Body() request: CustomerSupportRequest,
    @Req() req: any,
  ) {
    try {
      const result = await this.aiService.customerSupport(request);
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;

      return {
        statusCode: 200,
        message: '智能客服回复成功',
        data: {
          userId: userId || 'guest',
          ...result,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error('[AI Controller] 智能客服问答失败:', error);
      throw new HttpException(
        {
          statusCode: 400,
          message: error.message || '智能客服问答失败',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 保存客服问答历史（仅登录用户）
   */
  @UseGuards(JwtAuthGuard)
  @Post('customer-support/history')
  async saveCustomerSupportHistory(
    @Body() body: { question: string; answer: string },
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;
      if (!userId) {
        throw new HttpException(
          {
            statusCode: 401,
            message: '未登录用户无法保存客服历史',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      await this.aiService.saveCustomerSupportHistory(
        userId,
        body.question || '',
        body.answer || '',
      );

      return {
        statusCode: 200,
        message: '客服问答历史保存成功',
        data: {
          userId,
          savedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error('[AI Controller] 保存客服历史失败:', error);
      throw new HttpException(
        {
          statusCode: error.status || 400,
          message: error.message || '保存客服历史失败',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 获取客服问答历史（仅登录用户）
   */
  @UseGuards(JwtAuthGuard)
  @Get('customer-support/history')
  async getCustomerSupportHistory(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '50',
  ) {
    try {
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;
      if (!userId) {
        throw new HttpException(
          {
            statusCode: 401,
            message: '未登录用户无法查看客服历史',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const pageNum = Number.isNaN(Number(page)) ? 1 : Number(page);
      const sizeNum = Number.isNaN(Number(pageSize)) ? 50 : Number(pageSize);
      const data = await this.aiService.getCustomerSupportHistory(
        userId,
        pageNum,
        sizeNum,
      );

      return {
        statusCode: 200,
        message: '获取客服历史成功',
        data,
      };
    } catch (error: any) {
      console.error('[AI Controller] 获取客服历史失败:', error);
      throw new HttpException(
        {
          statusCode: error.status || 400,
          message: error.message || '获取客服历史失败',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 更新客服历史标题（仅登录用户本人）
   */
  @UseGuards(JwtAuthGuard)
  @Patch('customer-support/history/:id')
  async patchCustomerSupportHistoryTitle(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title: string },
  ) {
    try {
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;
      if (!userId) {
        throw new HttpException(
          { statusCode: 401, message: '未登录' },
          HttpStatus.UNAUTHORIZED,
        );
      }
      await this.aiService.updateCustomerSupportHistoryTitle(
        userId,
        id,
        body?.title ?? '',
      );
      return {
        statusCode: 200,
        message: '标题已更新',
        data: { id },
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      console.error('[AI Controller] 更新客服历史标题失败:', error);
      throw new HttpException(
        {
          statusCode: error.status || 400,
          message: error.message || '更新失败',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 置顶 / 取消置顶
   */
  @UseGuards(JwtAuthGuard)
  @Post('customer-support/history/:id/pin')
  async toggleCustomerSupportHistoryPin(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;
      if (!userId) {
        throw new HttpException(
          { statusCode: 401, message: '未登录' },
          HttpStatus.UNAUTHORIZED,
        );
      }
      const data = await this.aiService.toggleCustomerSupportHistoryPin(
        userId,
        id,
      );
      return {
        statusCode: 200,
        message: data.isPinned ? '已置顶' : '已取消置顶',
        data,
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      console.error('[AI Controller] 置顶客服历史失败:', error);
      throw new HttpException(
        {
          statusCode: error.status || 400,
          message: error.message || '操作失败',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 删除单条客服历史
   */
  @UseGuards(JwtAuthGuard)
  @Delete('customer-support/history/:id')
  async deleteCustomerSupportHistory(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    try {
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;
      if (!userId) {
        throw new HttpException(
          { statusCode: 401, message: '未登录' },
          HttpStatus.UNAUTHORIZED,
        );
      }
      await this.aiService.deleteCustomerSupportHistory(userId, id);
      return {
        statusCode: 200,
        message: '已删除',
        data: { id },
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      console.error('[AI Controller] 删除客服历史失败:', error);
      throw new HttpException(
        {
          statusCode: error.status || 400,
          message: error.message || '删除失败',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 保存 AI 生成历史
   */
  @UseGuards(JwtAuthGuard)
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
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;

      if (!userId) {
        throw new HttpException(
          {
            statusCode: 401,
            message: '未登录用户无法保存历史记录',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

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

  /**
   * 获取当前用户的 AI 生成历史
   */
  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getHistory(
    @Req() req: any,
    @Query('type')
    type:
      | 'virtual-try-on'
      | 'style-recommendation'
      | 'itinerary-planning'
      | 'all' = 'all',
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('subjectRole') subjectRole?: string,
  ) {
    try {
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;

      if (!userId) {
        throw new HttpException(
          {
            statusCode: 401,
            message: '未登录用户无法查看历史记录',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const pageNum = Number.isNaN(Number(page)) ? 1 : Number(page);
      const sizeNum = Number.isNaN(Number(pageSize)) ? 10 : Number(pageSize);

      let vtoRole: VirtualTryOnSubjectRole | undefined;
      if (
        subjectRole === 'female' ||
        subjectRole === 'male' ||
        subjectRole === 'couple'
      ) {
        vtoRole = subjectRole;
      }

      let data: unknown;

      if (type === 'virtual-try-on') {
        data = await this.aiService.getVirtualTryOnHistoriesByUser(
          userId,
          pageNum,
          sizeNum,
          vtoRole,
        );
      } else if (type === 'style-recommendation') {
        data = await this.aiService.getStyleRecommendationHistoriesByUser(
          userId,
          pageNum,
          sizeNum,
        );
      } else if (type === 'itinerary-planning') {
        data = await this.aiService.getItineraryPlanningHistoriesByUser(
          userId,
          pageNum,
          sizeNum,
        );
      } else {
        // all: 分别获取三类历史
        const [virtualTryOn, styleRecommendation, itineraryPlanning] =
          await Promise.all([
            this.aiService.getVirtualTryOnHistoriesByUser(
              userId,
              pageNum,
              sizeNum,
            ),
            this.aiService.getStyleRecommendationHistoriesByUser(
              userId,
              pageNum,
              sizeNum,
            ),
            this.aiService.getItineraryPlanningHistoriesByUser(
              userId,
              pageNum,
              sizeNum,
            ),
          ]);

        data = {
          virtualTryOn,
          styleRecommendation,
          itineraryPlanning,
        };
      }

      return {
        statusCode: 200,
        message: '获取历史记录成功',
        data,
      };
    } catch (error: any) {
      console.error('[AI Controller] 获取历史记录失败:', error);
      throw new HttpException(
        {
          statusCode: error.status || 400,
          message: error.message || '获取历史记录失败',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 删除 AI 生成历史
   */
  @UseGuards(JwtAuthGuard)
  @Delete('history/:type/:id')
  async deleteHistory(
    @Param('type')
    type: 'virtual-try-on' | 'style-recommendation' | 'itinerary-planning',
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;

      if (!userId) {
        throw new HttpException(
          {
            statusCode: 401,
            message: '未登录用户无法删除历史记录',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (type === 'virtual-try-on') {
        await this.aiService.deleteVirtualTryOnHistory(id, userId);
      } else if (type === 'style-recommendation') {
        await this.aiService.deleteStyleRecommendationHistory(id, userId);
      } else if (type === 'itinerary-planning') {
        await this.aiService.deleteItineraryPlanningHistory(id, userId);
      } else {
        throw new HttpException(
          {
            statusCode: 400,
            message: '无效的历史记录类型',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        statusCode: 200,
        message: '历史记录删除成功',
        data: {
          id,
          type,
          deletedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error('[AI Controller] 删除历史记录失败:', error);
      throw new HttpException(
        {
          statusCode: error.status || 400,
          message: error.message || '删除历史记录失败',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
