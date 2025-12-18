import { ApiProperty } from '@nestjs/swagger';
import { CardType, PokemonType, Rarity } from '../../domain/enums';

/**
 * Card Summary DTO
 * Provides a summary of a card for list views
 */
export class CardSummaryDto {
  @ApiProperty({
    description: 'Unique card identifier (template ID)',
    example: 'pokemon-base-set-v1.0-alakazam-1',
  })
  cardId: string;

  @ApiProperty({
    description: 'Unique instance identifier (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  instanceId: string;

  @ApiProperty({
    description: 'Card name',
    example: 'Alakazam',
  })
  name: string;

  @ApiProperty({
    description: 'Card number within the set',
    example: '1',
  })
  cardNumber: string;

  @ApiProperty({
    description: 'Set name',
    example: 'Base Set',
  })
  setName: string;

  @ApiProperty({
    description: 'Card type',
    enum: CardType,
    example: CardType.POKEMON,
  })
  cardType: CardType;

  @ApiProperty({
    description: 'Pokémon type (for Pokémon cards only)',
    enum: PokemonType,
    required: false,
    example: PokemonType.PSYCHIC,
  })
  pokemonType?: PokemonType;

  @ApiProperty({
    description: 'Card rarity',
    enum: Rarity,
    example: Rarity.RARE_HOLO,
  })
  rarity: Rarity;

  @ApiProperty({
    description: 'Hit points (for Pokémon cards only)',
    required: false,
    example: 80,
  })
  hp?: number;

  @ApiProperty({
    description: 'URL to card image',
    example: 'https://example.com/cards/alakazam.png',
  })
  imageUrl: string;
}
