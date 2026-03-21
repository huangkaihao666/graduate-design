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
import { SpotsService } from './spots.service';

@ApiTags('Spots')
@Controller('spots')
export class SpotsController {
  constructor(private readonly spotsService: SpotsService) {}

  @Get('public')
  @ApiOperation({ summary: '景点列表（用户端选目的地/展示，无需登录）' })
  findPublic() {
    return this.spotsService.findPublic();
  }

  @Get()
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '景点列表（管理员）' })
  findAll() {
    return this.spotsService.findAll();
  }

  @Post()
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '新增景点' })
  create(
    @Body()
    body: {
      name: string;
      city: string;
      category: string;
      recommended?: boolean;
    },
  ) {
    return this.spotsService.create(body);
  }

  @Patch(':id')
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新景点' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: Partial<{
      name: string;
      city: string;
      category: string;
      recommended: boolean;
    }>,
  ) {
    return this.spotsService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除景点' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.spotsService.remove(id);
  }
}
