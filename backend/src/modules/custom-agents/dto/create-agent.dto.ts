import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomAgentDto {
  @ApiProperty({ description: '智能体名称' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ description: '性格特点' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  personality?: string;

  @ApiPropertyOptional({ description: '简介' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'System Prompt' })
  @IsString()
  @MaxLength(4000)
  prompt: string;

  @ApiPropertyOptional({ description: '头像 URL 或 Base64' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ description: '擅长领域标签，逗号分隔' })
  @IsOptional()
  @IsString()
  domains?: string;

  @ApiPropertyOptional({
    description:
      '可选：绑定当前用户自建知识库（Coze dataset）；创建后会与平台默认「AI 情绪伙伴」知识库合并挂载',
  })
  @IsOptional()
  @IsInt()
  knowledgeBaseId?: number;

  @ApiPropertyOptional({ description: '是否公开（申请审核）', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
