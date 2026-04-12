import { IsOptional, IsString, MaxLength } from 'class-validator';

/** 摄影师拍摄建议：参考证件照/正脸照 + 可选文字偏好 */
export class PhotographerShootingAdviceDto {
  @IsString()
  @MaxLength(15_000_000)
  photo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  sceneHint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  clientType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  lensPreference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  lightingCondition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shootStyle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
