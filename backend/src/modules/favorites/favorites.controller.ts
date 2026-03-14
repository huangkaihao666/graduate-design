import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  /**
   * 添加收藏
   */
  @UseGuards(JwtAuthGuard)
  @Post('packages/:packageId')
  async addFavorite(
    @Param('packageId', ParseIntPipe) packageId: number,
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;

      if (!userId) {
        throw new HttpException(
          {
            statusCode: 401,
            message: '未登录用户无法添加收藏',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const favorite = await this.favoritesService.addFavorite(
        userId,
        packageId,
      );

      return {
        statusCode: 200,
        message: '收藏成功',
        data: favorite,
      };
    } catch (error: any) {
      console.error('[Favorites Controller] 添加收藏失败:', error);
      throw new HttpException(
        {
          statusCode: error.status || 400,
          message: error.message || '添加收藏失败',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 删除收藏（通过收藏ID）
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async removeFavorite(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    try {
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;

      if (!userId) {
        throw new HttpException(
          {
            statusCode: 401,
            message: '未登录用户无法删除收藏',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      await this.favoritesService.removeFavorite(userId, id);

      return {
        statusCode: 200,
        message: '取消收藏成功',
      };
    } catch (error: any) {
      console.error('[Favorites Controller] 删除收藏失败:', error);
      throw new HttpException(
        {
          statusCode: error.status || 400,
          message: error.message || '删除收藏失败',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 删除收藏（通过套餐ID）
   */
  @UseGuards(JwtAuthGuard)
  @Delete('packages/:packageId')
  async removeFavoriteByPackageId(
    @Param('packageId', ParseIntPipe) packageId: number,
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;

      if (!userId) {
        throw new HttpException(
          {
            statusCode: 401,
            message: '未登录用户无法删除收藏',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      await this.favoritesService.removeFavoriteByPackageId(userId, packageId);

      return {
        statusCode: 200,
        message: '取消收藏成功',
      };
    } catch (error: any) {
      console.error('[Favorites Controller] 删除收藏失败:', error);
      throw new HttpException(
        {
          statusCode: error.status || 400,
          message: error.message || '删除收藏失败',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 检查是否已收藏
   */
  @UseGuards(JwtAuthGuard)
  @Get('packages/:packageId/check')
  async checkFavorite(
    @Param('packageId', ParseIntPipe) packageId: number,
    @Req() req: any,
  ) {
    try {
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;

      if (!userId) {
        return {
          statusCode: 200,
          message: '未登录',
          data: {
            isFavorite: false,
          },
        };
      }

      const isFavorite = await this.favoritesService.isFavorite(
        userId,
        packageId,
      );

      return {
        statusCode: 200,
        message: '查询成功',
        data: {
          isFavorite,
        },
      };
    } catch (error: any) {
      console.error('[Favorites Controller] 检查收藏状态失败:', error);
      throw new HttpException(
        {
          statusCode: error.status || 400,
          message: error.message || '检查收藏状态失败',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 获取用户的收藏列表
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getFavorites(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Req() req?: any,
  ) {
    try {
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;

      if (!userId) {
        throw new HttpException(
          {
            statusCode: 401,
            message: '未登录用户无法获取收藏列表',
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const pageNum = page ? parseInt(page, 10) : 1;
      const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 12;

      const result = await this.favoritesService.getFavorites(
        userId,
        pageNum,
        pageSizeNum,
      );

      return {
        statusCode: 200,
        message: '获取收藏列表成功',
        data: result,
      };
    } catch (error: any) {
      console.error('[Favorites Controller] 获取收藏列表失败:', error);
      throw new HttpException(
        {
          statusCode: error.status || 400,
          message: error.message || '获取收藏列表失败',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 批量检查收藏状态（获取用户收藏的所有套餐ID）
   */
  @UseGuards(JwtAuthGuard)
  @Get('packages/ids')
  async getFavoritePackageIds(@Req() req: any) {
    try {
      const userId = req.user?.sub ? parseInt(req.user.sub, 10) : undefined;

      if (!userId) {
        return {
          statusCode: 200,
          message: '未登录',
          data: {
            packageIds: [],
          },
        };
      }

      const packageIds =
        await this.favoritesService.getFavoritePackageIds(userId);

      return {
        statusCode: 200,
        message: '获取收藏套餐ID列表成功',
        data: {
          packageIds,
        },
      };
    } catch (error: any) {
      console.error('[Favorites Controller] 获取收藏套餐ID列表失败:', error);
      throw new HttpException(
        {
          statusCode: error.status || 400,
          message: error.message || '获取收藏套餐ID列表失败',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
