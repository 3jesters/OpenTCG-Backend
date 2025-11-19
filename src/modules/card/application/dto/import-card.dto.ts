import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PokemonType } from '../../domain/enums/pokemon-type.enum';
import { EvolutionStage } from '../../domain/enums/evolution-stage.enum';
import { Rarity } from '../../domain/enums/rarity.enum';
import { CardType } from '../../domain/enums/card-type.enum';
import { TrainerType } from '../../domain/enums/trainer-type.enum';
import { EnergyType } from '../../domain/enums/energy-type.enum';
import { AbilityImportDto } from './ability-import.dto';
import { AttackImportDto } from './attack-import.dto';
import { WeaknessImportDto } from './weakness-import.dto';
import { ResistanceImportDto } from './resistance-import.dto';
import { TrainerEffectImportDto } from './trainer-effect-import.dto';
import { EnergyProvisionImportDto } from './energy-provision-import.dto';

/**
 * Import Card DTO
 * For validating individual card data from JSON import
 */
export class ImportCardDto {
  @IsString()
  name: string;

  @IsString()
  cardNumber: string;

  @IsOptional()
  @IsEnum(CardType)
  cardType?: CardType;

  @IsOptional()
  @IsString()
  pokemonNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  hp?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  level?: number;

  @IsOptional()
  @IsEnum(EvolutionStage)
  stage?: EvolutionStage;

  @IsOptional()
  @IsString()
  evolvesFrom?: string;

  @IsOptional()
  @IsEnum(PokemonType)
  pokemonType?: PokemonType;

  @IsOptional()
  @IsEnum(TrainerType)
  trainerType?: TrainerType;

  @IsOptional()
  @IsEnum(EnergyType)
  energyType?: EnergyType;

  @IsOptional()
  @IsEnum(Rarity)
  rarity?: Rarity;

  @IsOptional()
  @ValidateNested()
  @Type(() => AbilityImportDto)
  ability?: AbilityImportDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttackImportDto)
  attacks?: AttackImportDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => WeaknessImportDto)
  weakness?: WeaknessImportDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ResistanceImportDto)
  resistance?: ResistanceImportDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  retreatCost?: number;

  @IsString()
  artist: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrainerEffectImportDto)
  trainerEffects?: TrainerEffectImportDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => EnergyProvisionImportDto)
  energyProvision?: EnergyProvisionImportDto;
}

