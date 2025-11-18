import { IsString, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AbilityActivationType } from '../../domain/enums/ability-activation-type.enum';
import { GameEventType } from '../../domain/enums/game-event-type.enum';
import { UsageLimit } from '../../domain/enums/usage-limit.enum';
import { AbilityEffectImportDto } from './ability-effect-import.dto';

/**
 * Ability Import DTO
 * For validating ability data from JSON import
 */
export class AbilityImportDto {
  @IsString()
  name: string;

  @IsString()
  text: string;

  @IsEnum(AbilityActivationType)
  activationType: AbilityActivationType;

  @IsOptional()
  @IsEnum(GameEventType)
  triggerEvent?: GameEventType;

  @IsOptional()
  @IsEnum(UsageLimit)
  usageLimit?: UsageLimit;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AbilityEffectImportDto)
  effects?: AbilityEffectImportDto[];
}

