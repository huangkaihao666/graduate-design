import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { AchievementsService } from './achievements.service';

@ApiTags('achievements')
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly service: AchievementsService) {}

  @Get()
  @ApiOkResponse({ description: '获取所有成就定义' })
  getAllAchievements() {
    return this.service.getAllAchievements();
  }

  @Get('leaderboard')
  @ApiOkResponse({ description: '经验值排行榜 Top20' })
  getLeaderboard() {
    return this.service.getLeaderboard();
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOkResponse({ description: '获取当前用户成就与经验' })
  getMyAchievements(@Request() req: any) {
    return this.service.getUserAchievements(req.user.id);
  }

  @Get('users/:id')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOkResponse({ description: '获取指定用户成就与经验' })
  getUserAchievements(@Param('id', ParseIntPipe) id: number) {
    return this.service.getUserAchievements(id);
  }
}
