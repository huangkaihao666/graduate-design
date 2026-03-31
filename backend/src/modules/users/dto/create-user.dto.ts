import {
  IsBoolean,
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: '用户名称',
    example: '张三',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '用户邮箱（唯一）',
    example: 'zhangsan@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: '用户密码',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: '用户头像（Base64编码或URL）',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({
    description:
      '注册身份：user=普通用户（默认） photographer=摄影师 makeup=妆造师；与 registerAsPhotographer 二选一，优先本字段',
    required: false,
    enum: ['user', 'photographer', 'makeup'],
  })
  @IsOptional()
  @IsIn(['user', 'photographer', 'makeup'])
  registrationType?: 'user' | 'photographer' | 'makeup';

  @ApiProperty({
    description: '是否注册为摄影师（需管理员审核后接单）',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  registerAsPhotographer?: boolean;

  @ApiProperty({
    description: '摄影师注册时填写的拍摄风格（可选）',
    required: false,
  })
  @IsString()
  @IsOptional()
  shootingStyleForPhotographer?: string;
}
