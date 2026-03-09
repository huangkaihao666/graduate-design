import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  /**
   * 创建案件 (需要 JWT)
   */
  @Post()
  @UseGuards(JwtGuard)
  @ApiCreatedResponse({ description: '案件创建成功' })
  async createRoom(@Body() createRoomDto: CreateRoomDto, @Request() req: any) {
    return await this.roomsService.createRoom(createRoomDto, req.user.sub);
  }

  /**
   * 获取所有 Agent
   */
  @Get('agents/list')
  @ApiOkResponse({ description: '获取 Agent 列表成功' })
  async getAllAgents() {
    return await this.roomsService.getAllAgents();
  }

  /**
   * 获取案件列表
   */
  @Get()
  @ApiOkResponse({ description: '获取案件列表成功' })
  async getRooms(@Query() query: QueryRoomDto, @Request() req?: any) {
    const userId = req?.user?.sub;
    return await this.roomsService.getRooms(query, userId);
  }

  /**
   * 获取案件详情
   */
  @Get(':id')
  @ApiOkResponse({ description: '获取案件详情成功' })
  async getRoomById(@Param('id') id: string) {
    return await this.roomsService.getRoomById(parseInt(id, 10));
  }

  /**
   * 更新案件 (需要 JWT 且为案件所有者)
   */
  @Put(':id')
  @UseGuards(JwtGuard)
  @ApiOkResponse({ description: '案件更新成功' })
  async updateRoom(
    @Param('id') id: string,
    @Body() updateRoomDto: Partial<CreateRoomDto>,
    @Request() req: any,
  ) {
    return await this.roomsService.updateRoom(
      parseInt(id, 10),
      updateRoomDto,
      req.user.sub,
    );
  }

  /**
   * 删除案件 (需要 JWT 且为案件所有者)
   */
  @Delete(':id')
  @UseGuards(JwtGuard)
  @ApiOkResponse({ description: '案件删除成功' })
  async deleteRoom(@Param('id') id: string, @Request() req: any) {
    return await this.roomsService.deleteRoom(parseInt(id, 10), req.user.sub);
  }
}
