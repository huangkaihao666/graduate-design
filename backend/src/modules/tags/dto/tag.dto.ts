import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ description: '标签名称', example: '职场' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: '标签颜色', example: '#FF6B6B' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '排序权重，越大越靠前', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  weight?: number;
}

export class UpdateTagDto {
  @ApiPropertyOptional({ description: '标签名称' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: '标签颜色' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '排序权重' })
  @IsOptional()
  @IsInt()
  @Min(0)
  weight?: number;
}
