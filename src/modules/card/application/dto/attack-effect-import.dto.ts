import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttackEffectType } from '../../domain/enums/attack-effect-type.enum';
import { ConditionImportDto } from './condition-import.dto';
import { TargetType } from '../../domain/enums/target-type.enum';
import { EnergyType } from '../../domain/enums/energy-type.enum';

/**
 * Attack Effect Import DTO
 * For validating attack effect data from JSON import
 */
export class AttackEffectImportDto {
  @IsEnum(AttackEffectType)
  effectType: AttackEffectType;

  @IsOptional()
  @IsEnum(TargetType)
  target?: TargetType;

  @IsOptional()
  @IsString()
  targetType?: string; // Legacy support

  @IsOptional()
  @IsNumber()
  value?: number; // Legacy support

  // DISCARD_ENERGY specific fields
  @IsOptional()
  amount?: number | 'all';

  @IsOptional()
  @IsEnum(EnergyType)
  energyType?: EnergyType;

  // STATUS_CONDITION specific fields
  @IsOptional()
  @IsString()
  statusCondition?: string;

  // DAMAGE_MODIFIER specific fields
  @IsOptional()
  @IsString()
  damageModifier?: string;

  @IsOptional()
  @IsNumber()
  modifier?: number;

  // HEAL specific fields
  @IsOptional()
  @IsNumber()
  healAmount?: number;

  // PREVENT_DAMAGE specific fields
  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionImportDto)
  conditions?: ConditionImportDto[];
}
