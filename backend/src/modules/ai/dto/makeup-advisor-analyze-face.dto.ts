import { IsOptional, IsString, MaxLength } from 'class-validator';

/** 妆容建议「识别并填充」：允许超大 base64 data URL */
export class MakeupAdvisorAnalyzeFaceDto {
  @IsOptional()
  @IsString()
  @MaxLength(15_000_000)
  photo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15_000_000)
  idPhoto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15_000_000)
  frontPhoto?: string;
}
