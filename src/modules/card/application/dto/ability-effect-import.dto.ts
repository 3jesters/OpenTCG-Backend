import {
  IsEnum,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AbilityEffectType } from '../../domain/enums/ability-effect-type.enum';
import { TargetType } from '../../domain/enums/target-type.enum';
import { EnergySource } from '../../domain/enums/energy-source.enum';
import { EnergyType } from '../../domain/enums/energy-type.enum';
import { PokemonType } from '../../domain/enums/pokemon-type.enum';
import { StatusCondition } from '../../domain/enums/status-condition.enum';
import { Duration } from '../../domain/enums/duration.enum';
import { CardType } from '../../domain/enums/card-type.enum';
import { Destination } from '../../domain/enums/destination.enum';
import { Selector } from '../../domain/enums/selector.enum';
import { ConditionImportDto } from './condition-import.dto';

/**
 * Ability Effect Import DTO
 * For validating ability effect data from JSON import
 */
export class AbilityEffectImportDto {
  @IsEnum(AbilityEffectType)
  effectType: AbilityEffectType;

  @IsOptional()
  @IsEnum(TargetType)
  target?: TargetType;

  @IsOptional()
  @IsString()
  targetType?: string; // Legacy support

  @IsOptional()
  @IsEnum(EnergySource)
  source?: EnergySource;

  @IsOptional()
  @IsNumber()
  count?: number;

  @IsOptional()
  amount?: number | 'all';

  @IsOptional()
  @IsEnum(EnergyType)
  energyType?: EnergyType;

  @IsOptional()
  @IsEnum(PokemonType)
  targetPokemonType?: PokemonType;

  @IsOptional()
  @IsEnum(PokemonType)
  sourcePokemonType?: PokemonType;

  @IsOptional()
  @IsEnum(StatusCondition)
  statusCondition?: StatusCondition;

  @IsOptional()
  @IsEnum(Duration)
  duration?: Duration;

  @IsOptional()
  @IsNumber()
  modifier?: number;

  @IsOptional()
  @IsEnum(CardType)
  cardType?: CardType;

  @IsOptional()
  @IsEnum(PokemonType)
  pokemonType?: PokemonType;

  @IsOptional()
  @IsEnum(Destination)
  destination?: Destination;

  @IsOptional()
  @IsEnum(Selector)
  selector?: Selector;

  @IsOptional()
  @IsArray()
  @IsEnum(PokemonType, { each: true })
  affectedTypes?: PokemonType[];

  @IsOptional()
  @IsEnum(TargetType)
  with?: TargetType;

  @IsOptional()
  @IsNumber()
  value?: number; // Legacy support

  @IsOptional()
  @IsString()
  damageModifier?: string; // Legacy support

  @IsOptional()
  @IsBoolean()
  permanent?: boolean; // Legacy support

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionImportDto)
  conditions?: ConditionImportDto[];
}
