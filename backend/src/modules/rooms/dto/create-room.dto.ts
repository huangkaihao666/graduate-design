import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class CreateRoomDto {
  @IsString({ message: '案件标题必须是字符串' })
  @IsNotEmpty({ message: '案件标题不能为空' })
  title: string;

  @IsString({ message: '案件内容必须是字符串' })
  @IsNotEmpty({ message: '案件内容不能为空' })
  content: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsArray({ message: '选择的 Agent 必须是数组' })
  @ArrayMinSize(1, { message: '至少需要选择一个 Agent' })
  @ArrayMaxSize(3, { message: '最多只能选择三个 Agent' })
  agents: string[];
}
