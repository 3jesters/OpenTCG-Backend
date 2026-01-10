import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CardType, PokemonType, Rarity } from '../../domain/enums';

/**
 * Search Cards Request DTO
 * Query parameters for card search endpoint
 */
export class SearchCardsRequestDto {
  @ApiPropertyOptional({
    description: 'Search by card name (case insensitive)',
    example: 'Pikachu',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by card type',
    enum: CardType,
    example: CardType.POKEMON,
  })
  @IsOptional()
  @IsEnum(CardType)
  cardType?: CardType;

  @ApiPropertyOptional({
    description: 'Filter by Pokémon type',
    enum: PokemonType,
    example: PokemonType.ELECTRIC,
  })
  @IsOptional()
  @IsEnum(PokemonType)
  pokemonType?: PokemonType;

  @ApiPropertyOptional({
    description: 'Filter by author (set author)',
    example: 'pokemon',
  })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({
    description: 'Filter by rarity',
    enum: Rarity,
    example: Rarity.RARE_HOLO,
  })
  @IsOptional()
  @IsEnum(Rarity)
  rarity?: Rarity;

  @ApiPropertyOptional({
    description: 'Results per page (default: 50, max: 500)',
    example: 50,
    minimum: 1,
    maximum: 500,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of results to skip (default: 0)',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

