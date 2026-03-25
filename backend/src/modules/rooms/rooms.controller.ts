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
import { DebateService } from './debate.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly debateService: DebateService,
  ) {}

  /**
   * 创建案件 (需要 JWT)
   */
  @Post()
  @UseGuards(JwtGuard)
  @ApiCreatedResponse({ description: '案件创建成功' })
  async createRoom(@Body() createRoomDto: CreateRoomDto, @Request() req: any) {
    // req.user 是 JwtStrategy 返回的完整 user 对象
    return await this.roomsService.createRoom(createRoomDto, req.user.id);
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
   * - 未登录时正常访问（公开列表），但 sort=mine 会返回空
   * - 登录后携带 token，JwtGuard 会注入 req.user
   */
  @Get()
  @UseGuards(JwtGuard)
  @ApiOkResponse({ description: '获取案件列表成功' })
  async getRooms(@Query() query: QueryRoomDto, @Request() req: any) {
    const userId = req.user?.id;
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
      req.user.id,
    );
  }

  /**
   * 删除案件 (需要 JWT 且为案件所有者)
   */
  @Delete(':id')
  @UseGuards(JwtGuard)
  @ApiOkResponse({ description: '案件删除成功' })
  async deleteRoom(@Param('id') id: string, @Request() req: any) {
    return await this.roomsService.deleteRoom(parseInt(id, 10), req.user.id);
  }

  /**
   * 开始辩论 (需要 JWT 且为案件所有者)
   */
  @Post(':id/start')
  @UseGuards(JwtGuard)
  @ApiOkResponse({ description: '辩论开始成功' })
  async startDebate(@Param('id') id: string, @Request() req: any) {
    const roomId = parseInt(id, 10);
    // TODO: 验证是否为 owner
    await this.debateService.startDebate(roomId);
    return { message: '辩论已开始' };
  }

  /**
   * 暂停辩论
   */
  @Post(':id/pause')
  @UseGuards(JwtGuard)
  @ApiOkResponse({ description: '辩论暂停成功' })
  async pauseDebate(@Param('id') id: string) {
    await this.debateService.pauseDebate(parseInt(id, 10));
    return { message: '辩论已暂停' };
  }

  /**
   * 继续辩论
   */
  @Post(':id/resume')
  @UseGuards(JwtGuard)
  @ApiOkResponse({ description: '辩论继续成功' })
  async resumeDebate(@Param('id') id: string) {
    await this.debateService.resumeDebate(parseInt(id, 10));
    return { message: '辩论已继续' };
  }

  /**
   * 结案（结束辩论）
   */
  @Post(':id/close')
  @UseGuards(JwtGuard)
  @ApiOkResponse({ description: '结案成功' })
  async closeRoom(@Param('id') id: string, @Request() req: any) {
    return await this.roomsService.closeRoom(parseInt(id, 10), req.user.id);
  }

  /**
   * 获取结案报告
   */
  @Get(':id/report')
  @UseGuards(JwtGuard)
  @ApiOkResponse({ description: '获取结案报告成功' })
  async getRoomReport(@Param('id') id: string) {
    return await this.roomsService.getRoomReport(parseInt(id, 10));
  }
}
