import { AbilityEffectType } from '../enums/ability-effect-type.enum';
import { PokemonType } from '../enums/pokemon-type.enum';
import { EnergyType } from '../enums/energy-type.enum';
import { CardType } from '../enums/card-type.enum';
import { TargetType } from '../enums/target-type.enum';
import { Condition } from './condition.value-object';

/**
 * Base Ability Effect Interface
 * All ability effects extend from this base structure
 */
export interface AbilityEffect {
  effectType: AbilityEffectType;
  target?: TargetType;
  requiredConditions?: Condition[];
}

// ========================================
// SHARED EFFECT TYPES (with attacks)
// ========================================

/**
 * Heal Effect
 * Heal damage from Pokémon
 */
export interface HealAbilityEffect extends AbilityEffect {
  effectType: AbilityEffectType.HEAL;
  target:
    | TargetType.SELF
    | TargetType.ALL_YOURS
    | TargetType.BENCHED_YOURS
    | TargetType.ACTIVE_YOURS;
  amount: number;
}

/**
 * Prevent Damage Effect
 * Prevent damage to Pokémon during specific duration
 */
export interface PreventDamageAbilityEffect extends AbilityEffect {
  effectType: AbilityEffectType.PREVENT_DAMAGE;
  target:
    | TargetType.SELF
    | TargetType.ALL_YOURS
    | TargetType.BENCHED_YOURS
    | TargetType.ACTIVE_YOURS
    | TargetType.DEFENDING;
  duration: 'next_turn' | 'this_turn' | 'permanent';
  amount?: number | 'all';
}

/**
 * Status Condition Effect
 * Apply status condition to Pokémon
 */
export interface StatusConditionAbilityEffect extends AbilityEffect {
  effectType: AbilityEffectType.STATUS_CONDITION;
  target:
    | TargetType.DEFENDING
    | TargetType.ALL_OPPONENTS
    | TargetType.ACTIVE_OPPONENT;
  statusCondition:
    | 'PARALYZED'
    | 'POISONED'
    | 'BURNED'
    | 'ASLEEP'
    | 'CONFUSED';
}

/**
 * Energy Acceleration Effect
 * Attach energy from deck/discard/hand
 */
export interface EnergyAccelerationAbilityEffect extends AbilityEffect {
  effectType: AbilityEffectType.ENERGY_ACCELERATION;
  target:
    | TargetType.SELF
    | TargetType.BENCHED_YOURS
    | TargetType.ALL_YOURS
    | TargetType.ACTIVE_YOURS;
  source: 'deck' | 'discard' | 'hand';
  count: number;
  energyType?: EnergyType;
  selector?: 'choice' | 'random';
}

/**
 * Switch Pokémon Effect
 * Switch active or benched Pokémon
 */
export interface SwitchPokemonAbilityEffect extends AbilityEffect {
  effectType: AbilityEffectType.SWITCH_POKEMON;
  target: TargetType.SELF;
  with: TargetType.BENCHED_YOURS;
  selector: 'choice' | 'random';
}

// ========================================
// ABILITY-SPECIFIC EFFECT TYPES
// ========================================

/**
 * Draw Cards Effect
 * Draw cards from deck
 */
export interface DrawCardsEffect extends AbilityEffect {
  effectType: AbilityEffectType.DRAW_CARDS;
  count: number;
}

/**
 * Search Deck Effect
 * Search deck for specific cards
 */
export interface SearchDeckEffect extends AbilityEffect {
  effectType: AbilityEffectType.SEARCH_DECK;
  cardType?: CardType;
  pokemonType?: PokemonType;
  count: number;
  destination: 'hand' | 'bench';
  selector?: 'choice' | 'random';
}

/**
 * Boost Attack Effect
 * Increase attack damage for self or allies
 */
export interface BoostAttackEffect extends AbilityEffect {
  effectType: AbilityEffectType.BOOST_ATTACK;
  target:
    | TargetType.SELF
    | TargetType.ALL_YOURS
    | TargetType.BENCHED_YOURS
    | TargetType.ACTIVE_YOURS;
  modifier: number;
  affectedTypes?: PokemonType[];
}

/**
 * Boost HP Effect
 * Increase maximum HP
 */
export interface BoostHPEffect extends AbilityEffect {
  effectType: AbilityEffectType.BOOST_HP;
  target:
    | TargetType.SELF
    | TargetType.ALL_YOURS
    | TargetType.BENCHED_YOURS
    | TargetType.ACTIVE_YOURS;
  modifier: number;
}

/**
 * Reduce Damage Effect
 * Reduce incoming damage from attacks
 */
export interface ReduceDamageEffect extends AbilityEffect {
  effectType: AbilityEffectType.REDUCE_DAMAGE;
  target:
    | TargetType.SELF
    | TargetType.ALL_YOURS
    | TargetType.BENCHED_YOURS
    | TargetType.ACTIVE_YOURS;
  amount: number | 'all';
  source?: PokemonType;
}

/**
 * Discard From Hand Effect
 * Discard cards from player's hand
 */
export interface DiscardFromHandEffect extends AbilityEffect {
  effectType: AbilityEffectType.DISCARD_FROM_HAND;
  count: number | 'all';
  selector: 'choice' | 'random';
  cardType?: CardType;
}

/**
 * Attach From Discard Effect
 * Attach cards from discard pile
 */
export interface AttachFromDiscardEffect extends AbilityEffect {
  effectType: AbilityEffectType.ATTACH_FROM_DISCARD;
  target:
    | TargetType.SELF
    | TargetType.BENCHED_YOURS
    | TargetType.ALL_YOURS
    | TargetType.ACTIVE_YOURS;
  energyType?: EnergyType;
  count: number;
  selector?: 'choice' | 'random';
}

/**
 * Retrieve From Discard Effect
 * Put cards from discard pile to hand
 */
export interface RetrieveFromDiscardEffect extends AbilityEffect {
  effectType: AbilityEffectType.RETRIEVE_FROM_DISCARD;
  cardType?: CardType;
  pokemonType?: PokemonType;
  count: number;
  selector: 'choice' | 'random';
}

// ========================================
// TYPE UNION
// ========================================

/**
 * Union type of all ability effect types
 */
export type AnyAbilityEffect =
  | HealAbilityEffect
  | PreventDamageAbilityEffect
  | StatusConditionAbilityEffect
  | EnergyAccelerationAbilityEffect
  | SwitchPokemonAbilityEffect
  | DrawCardsEffect
  | SearchDeckEffect
  | BoostAttackEffect
  | BoostHPEffect
  | ReduceDamageEffect
  | DiscardFromHandEffect
  | AttachFromDiscardEffect
  | RetrieveFromDiscardEffect;

// ========================================
// FACTORY
// ========================================

/**
 * Factory for creating ability effects with type safety
 */
export class AbilityEffectFactory {
  // SHARED EFFECTS

  static heal(
    target:
      | TargetType.SELF
      | TargetType.ALL_YOURS
      | TargetType.BENCHED_YOURS
      | TargetType.ACTIVE_YOURS,
    amount: number,
    conditions?: Condition[],
  ): HealAbilityEffect {
    return {
      effectType: AbilityEffectType.HEAL,
      target,
      amount,
      requiredConditions: conditions,
    };
  }

  static preventDamage(
    target:
      | TargetType.SELF
      | TargetType.ALL_YOURS
      | TargetType.BENCHED_YOURS
      | TargetType.ACTIVE_YOURS
      | TargetType.DEFENDING,
    duration: 'next_turn' | 'this_turn' | 'permanent',
    amount?: number | 'all',
    conditions?: Condition[],
  ): PreventDamageAbilityEffect {
    return {
      effectType: AbilityEffectType.PREVENT_DAMAGE,
      target,
      duration,
      amount,
      requiredConditions: conditions,
    };
  }

  static statusCondition(
    statusCondition:
      | 'PARALYZED'
      | 'POISONED'
      | 'BURNED'
      | 'ASLEEP'
      | 'CONFUSED',
    target:
      | TargetType.DEFENDING
      | TargetType.ALL_OPPONENTS
      | TargetType.ACTIVE_OPPONENT = TargetType.DEFENDING,
    conditions?: Condition[],
  ): StatusConditionAbilityEffect {
    return {
      effectType: AbilityEffectType.STATUS_CONDITION,
      target,
      statusCondition,
      requiredConditions: conditions,
    };
  }

  static energyAcceleration(
    target:
      | TargetType.SELF
      | TargetType.BENCHED_YOURS
      | TargetType.ALL_YOURS
      | TargetType.ACTIVE_YOURS,
    source: 'deck' | 'discard' | 'hand',
    count: number,
    energyType?: EnergyType,
    selector?: 'choice' | 'random',
    conditions?: Condition[],
  ): EnergyAccelerationAbilityEffect {
    return {
      effectType: AbilityEffectType.ENERGY_ACCELERATION,
      target,
      source,
      count,
      energyType,
      selector,
      requiredConditions: conditions,
    };
  }

  static switchPokemon(
    selector: 'choice' | 'random',
    conditions?: Condition[],
  ): SwitchPokemonAbilityEffect {
    return {
      effectType: AbilityEffectType.SWITCH_POKEMON,
      target: TargetType.SELF,
      with: TargetType.BENCHED_YOURS,
      selector,
      requiredConditions: conditions,
    };
  }

  // ABILITY-SPECIFIC EFFECTS

  static drawCards(
    count: number,
    conditions?: Condition[],
  ): DrawCardsEffect {
    return {
      effectType: AbilityEffectType.DRAW_CARDS,
      count,
      requiredConditions: conditions,
    };
  }

  static searchDeck(
    count: number,
    destination: 'hand' | 'bench',
    params?: {
      cardType?: CardType;
      pokemonType?: PokemonType;
      selector?: 'choice' | 'random';
    },
    conditions?: Condition[],
  ): SearchDeckEffect {
    return {
      effectType: AbilityEffectType.SEARCH_DECK,
      count,
      destination,
      cardType: params?.cardType,
      pokemonType: params?.pokemonType,
      selector: params?.selector,
      requiredConditions: conditions,
    };
  }

  static boostAttack(
    target:
      | TargetType.SELF
      | TargetType.ALL_YOURS
      | TargetType.BENCHED_YOURS
      | TargetType.ACTIVE_YOURS,
    modifier: number,
    affectedTypes?: PokemonType[],
    conditions?: Condition[],
  ): BoostAttackEffect {
    return {
      effectType: AbilityEffectType.BOOST_ATTACK,
      target,
      modifier,
      affectedTypes,
      requiredConditions: conditions,
    };
  }

  static boostHP(
    target:
      | TargetType.SELF
      | TargetType.ALL_YOURS
      | TargetType.BENCHED_YOURS
      | TargetType.ACTIVE_YOURS,
    modifier: number,
    conditions?: Condition[],
  ): BoostHPEffect {
    return {
      effectType: AbilityEffectType.BOOST_HP,
      target,
      modifier,
      requiredConditions: conditions,
    };
  }

  static reduceDamage(
    target:
      | TargetType.SELF
      | TargetType.ALL_YOURS
      | TargetType.BENCHED_YOURS
      | TargetType.ACTIVE_YOURS,
    amount: number | 'all',
    source?: PokemonType,
    conditions?: Condition[],
  ): ReduceDamageEffect {
    return {
      effectType: AbilityEffectType.REDUCE_DAMAGE,
      target,
      amount,
      source,
      requiredConditions: conditions,
    };
  }

  static discardFromHand(
    count: number | 'all',
    selector: 'choice' | 'random',
    cardType?: CardType,
    conditions?: Condition[],
  ): DiscardFromHandEffect {
    return {
      effectType: AbilityEffectType.DISCARD_FROM_HAND,
      count,
      selector,
      cardType,
      requiredConditions: conditions,
    };
  }

  static attachFromDiscard(
    target:
      | TargetType.SELF
      | TargetType.BENCHED_YOURS
      | TargetType.ALL_YOURS
      | TargetType.ACTIVE_YOURS,
    count: number,
    energyType?: EnergyType,
    selector?: 'choice' | 'random',
    conditions?: Condition[],
  ): AttachFromDiscardEffect {
    return {
      effectType: AbilityEffectType.ATTACH_FROM_DISCARD,
      target,
      count,
      energyType,
      selector,
      requiredConditions: conditions,
    };
  }

  static retrieveFromDiscard(
    count: number,
    selector: 'choice' | 'random',
    params?: {
      cardType?: CardType;
      pokemonType?: PokemonType;
    },
    conditions?: Condition[],
  ): RetrieveFromDiscardEffect {
    return {
      effectType: AbilityEffectType.RETRIEVE_FROM_DISCARD,
      count,
      selector,
      cardType: params?.cardType,
      pokemonType: params?.pokemonType,
      requiredConditions: conditions,
    };
  }
}

