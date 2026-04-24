import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  MinLength,
  MaxLength,
  IsInt,
} from 'class-validator';

export class CreateRoomDto {
  @IsString({ message: '案件标题必须是字符串' })
  @IsNotEmpty({ message: '案件标题不能为空' })
  @MinLength(5, { message: '案件标题至少 5 个字符' })
  @MaxLength(100, { message: '案件标题不超过 100 个字符' })
  title: string;

  @IsString({ message: '案件内容必须是字符串' })
  @IsNotEmpty({ message: '案件内容不能为空' })
  @MinLength(50, { message: '案件内容至少 50 个字符' })
  @MaxLength(1000, { message: '案件内容不超过 1000 个字符' })
  content: string;

  @IsOptional()
  @IsString({ message: '图片数据必须是字符串' })
  image?: string; // 支持 Base64 或 URL

  @IsArray({ message: '选择的 Agent 必须是数组' })
  @ArrayMinSize(3, { message: '必须选择 3 个 Agent' })
  @ArrayMaxSize(3, { message: '必须选择 3 个 Agent' })
  agents: string[];

  @IsOptional()
  @IsArray({ message: '标签必须是数组' })
  @ArrayMaxSize(3, { message: '最多选择 3 个标签' })
  @IsInt({ each: true, message: '标签 ID 必须是整数' })
  tagIds?: number[];
}
