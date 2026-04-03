import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService, type AvatarUploadFile } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminOrJwtAuthGuard } from '../auth/admin-or-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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

  @Put(':id/status')
  @ApiOperation({
    summary: '启用/禁用用户',
    description: '根据 isActive 更新用户状态',
  })
  @ApiParam({ name: 'id', type: Number, description: '用户 ID' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isActive: boolean },
  ) {
    return this.usersService.setActive(id, Boolean(body?.isActive));
  }

  @Post(':id/reset-password')
  @ApiOperation({
    summary: '重置用户密码',
    description: '管理员重置指定用户密码',
  })
  @ApiParam({ name: 'id', type: Number, description: '用户 ID' })
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newPassword: string },
  ) {
    const nextPassword = body?.newPassword?.trim();
    if (!nextPassword || nextPassword.length < 6) {
      throw new BadRequestException('新密码至少 6 位');
    }
    return this.usersService.resetPassword(id, nextPassword);
  }

  @Delete(':id/worker')
  @UseGuards(AdminOrJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '删除工作人员账号',
    description:
      '仅允许删除 role=worker 的账号，并同步删除绑定的摄影师/妆造师业务档案（photographers 表）',
  })
  @ApiParam({ name: 'id', type: Number, description: '用户 ID' })
  removeWorker(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.removeWorkerAccount(id);
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

  @Post(':id/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '上传用户头像',
    description: '上传用户头像图片文件',
  })
  @ApiParam({ name: 'id', type: Number, description: '用户 ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: '头像图片文件',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '头像上传成功',
    schema: {
      example: {
        statusCode: 200,
        message: 'Request successful',
        data: {
          id: 1,
          name: '张三',
          email: 'zhangsan@example.com',
          avatar: 'data:image/jpeg;base64,...',
          isActive: true,
          createdAt: '2024-02-12T03:00:00.000Z',
          updatedAt: '2024-02-12T03:00:01.000Z',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: AvatarUploadFile | undefined,
  ) {
    return this.usersService.uploadAvatar(id, file);
  }
}
