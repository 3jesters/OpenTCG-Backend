import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TrainerEffectType } from '../../domain/enums/trainer-effect-type.enum';
import { TargetType } from '../../domain/enums/target-type.enum';

/**
 * Trainer Effect Import DTO
 * For validating trainer effect data from JSON import
 */
export class TrainerEffectImportDto {
  @IsEnum(TrainerEffectType)
  effectType: TrainerEffectType;

  @IsEnum(TargetType)
  target: TargetType;

  @IsOptional()
  value?: number | string;

  @IsOptional()
  @IsString()
  cardType?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  source?: string;
}
