import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 添加收藏
   */
  async addFavorite(userId: number, packageId: number): Promise<any> {
    try {
      // 检查是否已收藏
      const existing = await this.prisma.favorite.findUnique({
        where: {
          userId_packageId: {
            userId,
            packageId,
          },
        },
      });

      if (existing) {
        throw new HttpException(
          {
            statusCode: 400,
            message: '该套餐已收藏',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 创建收藏记录
      const favorite = await this.prisma.favorite.create({
        data: {
          userId,
          packageId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return favorite;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('[Favorites Service] 添加收藏失败:', error);
      throw new HttpException(
        {
          statusCode: 500,
          message: error.message || '添加收藏失败',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 删除收藏
   */
  async removeFavorite(userId: number, favoriteId: number): Promise<void> {
    try {
      // 检查收藏是否存在且属于该用户
      const favorite = await this.prisma.favorite.findFirst({
        where: {
          id: favoriteId,
          userId,
        },
      });

      if (!favorite) {
        throw new HttpException(
          {
            statusCode: 404,
            message: '收藏记录不存在或无权删除',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // 删除收藏
      await this.prisma.favorite.delete({
        where: {
          id: favoriteId,
        },
      });
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('[Favorites Service] 删除收藏失败:', error);
      throw new HttpException(
        {
          statusCode: 500,
          message: error.message || '删除收藏失败',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 根据套餐ID删除收藏（用于套餐页面）
   */
  async removeFavoriteByPackageId(
    userId: number,
    packageId: number,
  ): Promise<void> {
    try {
      // 查找收藏记录
      const favorite = await this.prisma.favorite.findFirst({
        where: {
          userId,
          packageId,
        },
      });

      if (!favorite) {
        throw new HttpException(
          {
            statusCode: 404,
            message: '收藏记录不存在',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      // 删除收藏
      await this.prisma.favorite.delete({
        where: {
          id: favorite.id,
        },
      });
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('[Favorites Service] 删除收藏失败:', error);
      throw new HttpException(
        {
          statusCode: 500,
          message: error.message || '删除收藏失败',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 检查是否已收藏
   */
  async isFavorite(userId: number, packageId: number): Promise<boolean> {
    try {
      const favorite = await this.prisma.favorite.findUnique({
        where: {
          userId_packageId: {
            userId,
            packageId,
          },
        },
      });
      return !!favorite;
    } catch (error) {
      console.error('[Favorites Service] 检查收藏状态失败:', error);
      return false;
    }
  }

  /**
   * 获取用户的收藏列表
   */
  async getFavorites(
    userId: number,
    page: number = 1,
    pageSize: number = 12,
  ): Promise<any> {
    try {
      const skip = (page - 1) * pageSize;

      // 获取收藏列表和总数
      const [items, total] = await Promise.all([
        this.prisma.favorite.findMany({
          where: {
            userId,
          },
          skip,
          take: pageSize,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        this.prisma.favorite.count({
          where: {
            userId,
          },
        }),
      ]);

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error: any) {
      console.error('[Favorites Service] 获取收藏列表失败:', error);
      throw new HttpException(
        {
          statusCode: 500,
          message: error.message || '获取收藏列表失败',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 获取用户的收藏套餐ID列表（用于批量检查）
   */
  async getFavoritePackageIds(userId: number): Promise<number[]> {
    try {
      const favorites = await this.prisma.favorite.findMany({
        where: {
          userId,
        },
        select: {
          packageId: true,
        },
      });

      return favorites.map((f) => f.packageId);
    } catch (error) {
      console.error('[Favorites Service] 获取收藏套餐ID列表失败:', error);
      return [];
    }
  }
}
