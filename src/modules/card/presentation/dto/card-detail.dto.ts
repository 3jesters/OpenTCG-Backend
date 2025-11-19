import { ApiProperty } from '@nestjs/swagger';
import {
  CardType,
  PokemonType,
  Rarity,
  EvolutionStage,
} from '../../domain/enums';
import { AbilityDto } from './ability.dto';
import { AttackDto } from './attack.dto';
import { WeaknessDto } from './weakness.dto';
import { ResistanceDto } from './resistance.dto';

/**
 * Card Detail DTO
 * Provides full details of a card
 */
export class CardDetailDto {
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
    description: 'Pokédex number',
    example: '065',
  })
  pokemonNumber: string;

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
    description: 'Evolution stage (for Pokémon cards only)',
    enum: EvolutionStage,
    required: false,
    example: EvolutionStage.STAGE_2,
  })
  stage?: EvolutionStage;

  @ApiProperty({
    description: 'Level (for older Pokémon cards)',
    required: false,
    example: 42,
  })
  level?: number;

  @ApiProperty({
    description: 'Name of Pokémon this evolves from',
    required: false,
    example: 'Kadabra',
  })
  evolvesFrom?: string;

  @ApiProperty({
    description: 'Pokémon ability',
    type: AbilityDto,
    required: false,
  })
  ability?: AbilityDto;

  @ApiProperty({
    description: 'Pokémon attacks',
    type: [AttackDto],
    required: false,
  })
  attacks?: AttackDto[];

  @ApiProperty({
    description: 'Weakness',
    type: WeaknessDto,
    required: false,
  })
  weakness?: WeaknessDto;

  @ApiProperty({
    description: 'Resistance',
    type: ResistanceDto,
    required: false,
  })
  resistance?: ResistanceDto;

  @ApiProperty({
    description: 'Retreat cost',
    required: false,
    example: 3,
  })
  retreatCost?: number;

  @ApiProperty({
    description: 'Card artist',
    example: 'Ken Sugimori',
  })
  artist: string;

  @ApiProperty({
    description: 'Flavor text or description',
    required: false,
    example: 'Its brain can outperform a supercomputer.',
  })
  description?: string;

  @ApiProperty({
    description: 'URL to card image',
    example: 'https://example.com/cards/alakazam.png',
  })
  imageUrl: string;

  @ApiProperty({
    description: 'Regulation mark',
    required: false,
    example: 'F',
  })
  regulationMark?: string;
}

