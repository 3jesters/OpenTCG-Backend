import { IsEnum, IsString, IsNumber, IsBoolean, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AbilityEffectType } from '../../domain/enums/ability-effect-type.enum';
import { ConditionImportDto } from './condition-import.dto';

/**
 * Ability Effect Import DTO
 * For validating ability effect data from JSON import
 */
export class AbilityEffectImportDto {
  @IsEnum(AbilityEffectType)
  effectType: AbilityEffectType;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsString()
  damageModifier?: string;

  @IsOptional()
  @IsBoolean()
  permanent?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionImportDto)
  conditions?: ConditionImportDto[];
}

