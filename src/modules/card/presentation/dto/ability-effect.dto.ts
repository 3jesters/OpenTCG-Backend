import { ApiProperty } from '@nestjs/swagger';
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
import { PokemonPosition } from '../../../match/domain/enums/pokemon-position.enum';

/**
 * Ability Effect DTO
 * Represents a structured effect of a Pokémon ability in API responses
 * This DTO covers all ability effect types and their specific properties
 */
export class AbilityEffectDto {
  @ApiProperty({
    description: 'Type of ability effect',
    enum: AbilityEffectType,
    example: AbilityEffectType.ENERGY_ACCELERATION,
  })
  effectType: AbilityEffectType;

  @ApiProperty({
    description: 'Target of the effect',
    enum: TargetType,
    required: false,
    example: TargetType.ALL_YOURS,
  })
  target?: TargetType;

  @ApiProperty({
    description:
      'Source location for energy acceleration effects (DECK, HAND, DISCARD, SELF)',
    enum: EnergySource,
    required: false,
    example: EnergySource.HAND,
  })
  source?: EnergySource;

  @ApiProperty({
    description:
      'Number of items affected (cards to draw, energy to attach, etc.). For DISCARD_FROM_HAND, can be "all"',
    required: false,
    example: 1,
  })
  count?: number | 'all';

  @ApiProperty({
    description: 'Amount value (HP to heal, damage to reduce, etc.)',
    required: false,
    example: 20,
  })
  amount?: number | 'all';

  @ApiProperty({
    description: 'Energy type restriction (for energy-related effects)',
    enum: EnergyType,
    required: false,
    example: EnergyType.WATER,
  })
  energyType?: EnergyType;

  @ApiProperty({
    description: 'Target Pokémon type restriction',
    enum: PokemonType,
    required: false,
    example: PokemonType.WATER,
  })
  targetPokemonType?: PokemonType;

  @ApiProperty({
    description:
      'Source Pokémon type restriction (for SELF source energy acceleration)',
    enum: PokemonType,
    required: false,
    example: PokemonType.FIRE,
  })
  sourcePokemonType?: PokemonType;

  @ApiProperty({
    description: 'Status condition to apply (for STATUS_CONDITION effects)',
    enum: StatusCondition,
    required: false,
    example: StatusCondition.PARALYZED,
  })
  statusCondition?: StatusCondition;

  @ApiProperty({
    description: 'Duration of the effect (for PREVENT_DAMAGE effects)',
    enum: Duration,
    required: false,
    example: Duration.THIS_TURN,
  })
  duration?: Duration;

  @ApiProperty({
    description: 'Modifier value (for BOOST_ATTACK, BOOST_HP effects)',
    required: false,
    example: 10,
  })
  modifier?: number;

  @ApiProperty({
    description: 'Card type filter (for search/retrieve effects)',
    enum: CardType,
    required: false,
    example: CardType.POKEMON,
  })
  cardType?: CardType;

  @ApiProperty({
    description: 'Pokémon type filter (for search/retrieve effects)',
    enum: PokemonType,
    required: false,
    example: PokemonType.FIRE,
  })
  pokemonType?: PokemonType;

  @ApiProperty({
    description: 'Destination for searched cards (for SEARCH_DECK effects)',
    enum: Destination,
    required: false,
    example: Destination.HAND,
  })
  destination?: Destination;

  @ApiProperty({
    description: 'Selection method (choice, random, etc.)',
    enum: Selector,
    required: false,
    example: Selector.CHOICE,
  })
  selector?: Selector;

  @ApiProperty({
    description: 'Pokémon types affected by boost effects',
    type: [String],
    enum: PokemonType,
    required: false,
    example: [PokemonType.FIRE],
  })
  affectedTypes?: PokemonType[];

  @ApiProperty({
    description: 'Bench position for switch effects',
    enum: PokemonPosition,
    required: false,
    example: PokemonPosition.BENCH_0,
  })
  benchPosition?: PokemonPosition;

  @ApiProperty({
    description: 'Target for switch effects (which Pokémon to switch with)',
    enum: TargetType,
    required: false,
    example: TargetType.BENCHED_YOURS,
  })
  with?: TargetType;
}
