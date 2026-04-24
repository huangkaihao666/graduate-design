import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('tags')
@Controller()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  /** 获取所有标签（公开） */
  @Get('tags')
  @ApiOkResponse({ description: '标签列表' })
  findAll() {
    return this.tagsService.findAll();
  }

  /** 新增标签（管理员） */
  @Post('admin/tags')
  @ApiBearerAuth()
  @UseGuards(JwtGuard, AdminGuard)
  @ApiOkResponse({ description: '新增标签' })
  create(@Body() dto: CreateTagDto) {
    return this.tagsService.create(dto);
  }

  /** 编辑标签（管理员） */
  @Put('admin/tags/:id')
  @ApiBearerAuth()
  @UseGuards(JwtGuard, AdminGuard)
  @ApiOkResponse({ description: '编辑标签' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTagDto) {
    return this.tagsService.update(id, dto);
  }

  /** 删除标签（管理员） */
  @Delete('admin/tags/:id')
  @ApiBearerAuth()
  @UseGuards(JwtGuard, AdminGuard)
  @ApiOkResponse({ description: '删除标签' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tagsService.remove(id);
  }
}
