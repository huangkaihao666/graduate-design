import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOkResponse({ description: '获取 Agent 列表成功' })
  async getAgents(
    @Query('search') search?: string,
    @Query('sort') sort?: 'winRate' | 'participateCount' | 'fans' | 'name',
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return await this.agentsService.getAgents({ search, sort, order });
  }

  @Get(':id')
  @ApiOkResponse({ description: '获取 Agent 详情成功' })
  async getAgentById(@Param('id') id: string) {
    return await this.agentsService.getAgentById(id);
  }

  @Get(':id/cases')
  @ApiOkResponse({ description: '获取 Agent 参与案件成功' })
  async getAgentCases(@Param('id') id: string, @Query('limit') limit?: string) {
    return await this.agentsService.getAgentCases(
      id,
      limit ? Number(limit) : 5,
    );
  }
}
