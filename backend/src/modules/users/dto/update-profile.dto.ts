import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  // 支持 base64 / dataURL，长度会显著超过 500
  @MaxLength(300000)
  avatar?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
