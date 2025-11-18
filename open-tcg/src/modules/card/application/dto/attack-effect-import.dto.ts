import { IsEnum, IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AttackEffectType } from '../../domain/enums/attack-effect-type.enum';
import { ConditionImportDto } from './condition-import.dto';

/**
 * Attack Effect Import DTO
 * For validating attack effect data from JSON import
 */
export class AttackEffectImportDto {
  @IsEnum(AttackEffectType)
  effectType: AttackEffectType;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsString()
  statusCondition?: string;

  @IsOptional()
  @IsString()
  damageModifier?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionImportDto)
  conditions?: ConditionImportDto[];
}

