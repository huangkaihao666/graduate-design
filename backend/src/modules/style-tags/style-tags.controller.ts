import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOrJwtAuthGuard } from '../auth/admin-or-jwt-auth.guard';
import { StyleTagsService } from './style-tags.service';

@ApiTags('StyleTags')
@Controller('style-tags')
export class StyleTagsController {
  constructor(private readonly styleTagsService: StyleTagsService) {}

  @Get('public')
  @ApiOperation({ summary: '启用的风格标签（用户端筛选）' })
  findPublic() {
    return this.styleTagsService.findEnabled();
  }

  @Get()
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '全部风格标签（管理员）' })
  findAll() {
    return this.styleTagsService.findAll();
  }

  @Post()
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '新增风格标签' })
  create(
    @Body()
    body: {
      key: string;
      name: string;
      enabled?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.styleTagsService.create(body);
  }

  @Patch(':id')
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新风格标签' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: Partial<{
      key: string;
      name: string;
      enabled: boolean;
      sortOrder: number;
    }>,
  ) {
    return this.styleTagsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除风格标签' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.styleTagsService.remove(id);
  }
}
