import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CardType, PokemonType, Rarity } from '../../domain/enums';

/**
 * Request DTO for searching cards
 */
export class SearchCardsRequestDto {
  @ApiProperty({
    description: 'Search query (searches in card name)',
    required: false,
    example: 'Alakazam',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({
    description: 'Filter by card type',
    enum: CardType,
    required: false,
  })
  @IsOptional()
  @IsEnum(CardType)
  cardType?: CardType;

  @ApiProperty({
    description: 'Filter by Pokémon type',
    enum: PokemonType,
    required: false,
  })
  @IsOptional()
  @IsEnum(PokemonType)
  pokemonType?: PokemonType;

  @ApiProperty({
    description: 'Filter by author',
    required: false,
    example: 'pokemon',
  })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({
    description: 'Filter by rarity',
    enum: Rarity,
    required: false,
  })
  @IsOptional()
  @IsEnum(Rarity)
  rarity?: Rarity;

  @ApiProperty({
    description: 'Maximum number of results to return',
    required: false,
    default: 50,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 50;

  @ApiProperty({
    description: 'Number of results to skip (for pagination)',
    required: false,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

