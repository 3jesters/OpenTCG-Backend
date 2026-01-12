import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  ArrayMaxSize,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PokemonType,
  EvolutionStage,
  EnergyType,
  AbilityActivationType,
} from '../../domain/enums';
import { AttackEffectDto } from '../../presentation/dto/attack-effect.dto';
import { AbilityEffectDto } from '../../presentation/dto/ability-effect.dto';

class CreateAttackDto {
  @ApiProperty({ description: 'Attack name', example: 'Fire Blast' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Energy cost array',
    type: [String],
    enum: EnergyType,
    example: [EnergyType.FIRE, EnergyType.FIRE],
  })
  @IsArray()
  @IsEnum(EnergyType, { each: true })
  energyCost: EnergyType[];

  @ApiProperty({ description: 'Damage string', example: '100' })
  @IsString()
  @IsNotEmpty()
  damage: string;

  @ApiProperty({
    description: 'Attack text description',
    example: 'Discard 2 Energy attached to this Pokemon.',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({
    description: 'Attack effects',
    type: [AttackEffectDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttackEffectDto)
  effects?: AttackEffectDto[];

  @ApiPropertyOptional({ description: 'Energy bonus cap for + damage attacks' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  energyBonusCap?: number;
}

class CreateAbilityDto {
  @ApiProperty({ description: 'Ability name', example: 'Damage Swap' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Ability text description' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ description: 'Activation type', enum: AbilityActivationType })
  @IsEnum(AbilityActivationType)
  activationType: AbilityActivationType;

  @ApiPropertyOptional({
    description: 'Ability effects',
    type: [AbilityEffectDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AbilityEffectDto)
  effects?: AbilityEffectDto[];
}

class CreateWeaknessDto {
  @ApiProperty({ description: 'Weakness type', enum: PokemonType })
  @IsEnum(PokemonType)
  type: PokemonType;

  @ApiProperty({ description: 'Weakness modifier', example: '×2' })
  @IsString()
  @IsNotEmpty()
  modifier: string;
}

class CreateResistanceDto {
  @ApiProperty({ description: 'Resistance type', enum: PokemonType })
  @IsEnum(PokemonType)
  type: PokemonType;

  @ApiProperty({ description: 'Resistance modifier', example: '-30' })
  @IsString()
  @IsNotEmpty()
  modifier: string;
}

class CreateEvolutionDto {
  @ApiProperty({ description: 'Pokemon name', example: 'Ivysaur' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Pokemon number', example: '002' })
  @IsString()
  @IsNotEmpty()
  pokemonNumber: string;
}

/**
 * Create Card Request DTO
 * Used for creating new cards through the editor
 */
export class CreateCardRequestDto {
  @ApiProperty({
    description: 'Pokemon name (must be from supported list)',
    example: 'Pikachu',
  })
  @IsString()
  @IsNotEmpty()
  pokemonName: string;

  @ApiProperty({
    description: 'Pokemon number (must match pokemonName)',
    example: '025',
  })
  @IsString()
  @IsNotEmpty()
  pokemonNumber: string;

  @ApiProperty({ description: 'Hit points', example: 60, minimum: 1 })
  @IsNumber()
  @Min(1)
  hp: number;

  @ApiProperty({ description: 'Evolution stage', enum: EvolutionStage })
  @IsEnum(EvolutionStage)
  stage: EvolutionStage;

  @ApiProperty({ description: 'Pokemon type', enum: PokemonType })
  @IsEnum(PokemonType)
  pokemonType: PokemonType;

  @ApiPropertyOptional({
    description: 'Attacks (max 2)',
    type: [CreateAttackDto],
    maxItems: 2,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateAttackDto)
  attacks?: CreateAttackDto[];

  @ApiPropertyOptional({ description: 'Ability', type: CreateAbilityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAbilityDto)
  ability?: CreateAbilityDto;

  @ApiPropertyOptional({ description: 'Weakness', type: CreateWeaknessDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateWeaknessDto)
  weakness?: CreateWeaknessDto;

  @ApiPropertyOptional({ description: 'Resistance', type: CreateResistanceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateResistanceDto)
  resistance?: CreateResistanceDto;

  @ApiPropertyOptional({ description: 'Retreat cost', example: 1, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  retreatCost?: number;

  @ApiPropertyOptional({
    description: 'Evolution from',
    type: CreateEvolutionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEvolutionDto)
  evolvesFrom?: CreateEvolutionDto;

  @ApiProperty({ description: 'Username of creator', example: 'test-user' })
  @IsString()
  @IsNotEmpty()
  createdBy: string;
}
