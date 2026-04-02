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

@ApiTags('Cities')
@Controller('cities')
@UseGuards(AdminOrJwtAuthGuard)
@ApiBearerAuth()
export class CitiesController {
  constructor(private readonly spotsService: SpotsService) {}

  @Get()
  @ApiOperation({ summary: '城市列表（管理员）' })
  findAll() {
    return this.spotsService.findAllCities();
  }

  @Post()
  @ApiOperation({ summary: '新增城市' })
  create(@Body() body: { name: string }) {
    return this.spotsService.createCity(body.name);
  }

  @Patch(':id')
  @ApiOperation({ summary: '重命名城市（同步已绑定套餐的目的地）' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name: string },
  ) {
    return this.spotsService.updateCity(id, body.name);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除城市（无下属景点时）' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.spotsService.removeCity(id);
  }
}
