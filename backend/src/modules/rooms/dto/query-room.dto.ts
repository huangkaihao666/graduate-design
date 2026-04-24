import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryRoomDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @IsOptional()
  @IsString()
  status?: string; // WAITING, LIVE, CLOSED

  @IsOptional()
  @IsString()
  search?: string; // 搜索关键词 (title 或 content)

  @IsOptional()
  @IsIn(['newest', 'hot', 'mine'], { message: '排序方式不正确' })
  sort?: string = 'newest'; // newest, hot, mine

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  tagId?: number; // 按标签筛选
}
