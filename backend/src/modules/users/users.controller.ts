import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ParseIntPipe,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: '创建新用户', description: '创建一个新的用户账户' })
  @ApiBody({ type: CreateUserDto, description: '用户信息' })
  @ApiResponse({
    status: 201,
    description: '用户创建成功',
    schema: {
      example: {
        statusCode: 201,
        message: 'Request successful',
        data: {
          id: 1,
          name: '张三',
          email: 'zhangsan@example.com',
          password: 'password123',
          isActive: true,
          createdAt: '2024-02-12T03:00:00.000Z',
          updatedAt: '2024-02-12T03:00:00.000Z',
        },
      },
    },
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: '获取所有用户',
    description: '获取系统中所有用户列表',
  })
  @ApiResponse({
    status: 200,
    description: '用户列表获取成功',
    schema: {
      example: {
        statusCode: 200,
        message: 'Request successful',
        data: [
          {
            id: 1,
            name: '张三',
            email: 'zhangsan@example.com',
            isActive: true,
            createdAt: '2024-02-12T03:00:00.000Z',
            updatedAt: '2024-02-12T03:00:00.000Z',
          },
        ],
      },
    },
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取指定用户',
    description: '根据用户 ID 获取用户详情',
  })
  @ApiParam({ name: 'id', type: Number, description: '用户 ID' })
  @ApiResponse({
    status: 200,
    description: '用户获取成功',
    schema: {
      example: {
        statusCode: 200,
        message: 'Request successful',
        data: {
          id: 1,
          name: '张三',
          email: 'zhangsan@example.com',
          isActive: true,
          createdAt: '2024-02-12T03:00:00.000Z',
          updatedAt: '2024-02-12T03:00:00.000Z',
        },
      },
    },
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新用户', description: '更新指定用户的信息' })
  @ApiParam({ name: 'id', type: Number, description: '用户 ID' })
  @ApiBody({ type: CreateUserDto, description: '更新的用户信息' })
  @ApiResponse({
    status: 200,
    description: '用户更新成功',
    schema: {
      example: {
        statusCode: 200,
        message: 'Request successful',
        data: {
          id: 1,
          name: '李四',
          email: 'lisi@example.com',
          isActive: true,
          createdAt: '2024-02-12T03:00:00.000Z',
          updatedAt: '2024-02-12T03:00:01.000Z',
        },
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: Partial<CreateUserDto>,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户', description: '删除指定的用户' })
  @ApiParam({ name: 'id', type: Number, description: '用户 ID' })
  @ApiResponse({
    status: 200,
    description: '用户删除成功',
    schema: {
      example: {
        statusCode: 200,
        message: 'Request successful',
        data: {
          id: 1,
          name: '张三',
          email: 'zhangsan@example.com',
          isActive: true,
          createdAt: '2024-02-12T03:00:00.000Z',
          updatedAt: '2024-02-12T03:00:00.000Z',
        },
      },
    },
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  /**
   * 更新个人资料（头像/昵称/简介）
   */
  @Put(':id/profile')
  @UseGuards(JwtGuard)
  async updateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProfileDto,
    @Request() req: any,
  ) {
    return this.usersService.updateProfile(id, req.user.id, dto);
  }

  /**
   * 修改密码
   */
  @Put(':id/password')
  @UseGuards(JwtGuard)
  async updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePasswordDto,
    @Request() req: any,
  ) {
    return this.usersService.updatePassword(id, req.user.id, dto);
  }

  /**
   * 获取我发布的案件列表
   */
  @Get(':id/rooms')
  @UseGuards(JwtGuard)
  async getMyRooms(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('status') status: string,
    @Request() req: any,
  ) {
    return this.usersService.getUserRooms(id, req.user.id, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 10,
      status,
    });
  }

  /**
   * 获取我的投票历史
   */
  @Get(':id/votes')
  @UseGuards(JwtGuard)
  async getMyVotes(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Request() req: any,
  ) {
    return this.usersService.getUserVotes(id, req.user.id, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 10,
    });
  }

  /**
   * 性格诊断（雷达图数据）
   */
  @Get(':id/diagnosis')
  @UseGuards(JwtGuard)
  async getDiagnosis(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.usersService.getUserDiagnosis(id, req.user.id);
  }

  /**
   * 个人统计
   */
  @Get(':id/stats')
  @UseGuards(JwtGuard)
  async getStats(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.usersService.getUserStats(id, req.user.id);
  }
}
