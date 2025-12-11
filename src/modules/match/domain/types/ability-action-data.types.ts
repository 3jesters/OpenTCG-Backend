/**
 * Ability Action Data Types
 * Type definitions for actionData parameter in USE_ABILITY actions
 * Use proper type hints - prefer object types (interfaces/types), then primitives, avoid any/unknown
 */

import { PokemonPosition } from '../enums/pokemon-position.enum';

/**
 * Base interface for all ability action data
 */
export interface BaseAbilityActionData {
  cardId: string; // The Pokemon card template ID
  target: PokemonPosition; // Position of the Pokemon using the ability
  pokemonInstanceId?: string; // Optional: For disambiguation if multiple instances exist
}

/**
 * Action data for HEAL effect
 */
export interface HealAbilityActionData extends BaseAbilityActionData {
  targetPokemon?: string; // Optional: Target Pokemon position for effects that target other Pokemon
}

/**
 * Action data for DRAW_CARDS effect
 */
export interface DrawCardsAbilityActionData extends BaseAbilityActionData {
  // No additional fields, uses count from effect
}

/**
 * Action data for SEARCH_DECK effect
 */
export interface SearchDeckAbilityActionData extends BaseAbilityActionData {
  selectedCardIds: string[]; // Required: Cards selected from deck
}

/**
 * Action data for RETRIEVE_FROM_DISCARD effect
 */
export interface RetrieveFromDiscardAbilityActionData extends BaseAbilityActionData {
  selectedCardIds: string[]; // Required: Cards selected from discard pile
}

/**
 * Action data for ENERGY_ACCELERATION effect
 */
export interface EnergyAccelerationAbilityActionData extends BaseAbilityActionData {
  targetPokemon?: PokemonPosition; // Optional: Target Pokemon position for attaching energy
  selectedCardIds?: string[]; // Optional: Energy cards selected (if source is hand/discard)
}

/**
 * Action data for SWITCH_POKEMON effect
 */
export interface SwitchPokemonAbilityActionData extends BaseAbilityActionData {
  benchPosition: PokemonPosition; // Required: BENCH_0 | BENCH_1 | etc.
}

/**
 * Action data for DISCARD_FROM_HAND effect
 */
export interface DiscardFromHandAbilityActionData extends BaseAbilityActionData {
  handCardIds: string[]; // Required: Cards to discard from hand
}

/**
 * Action data for ATTACH_FROM_DISCARD effect
 */
export interface AttachFromDiscardAbilityActionData extends BaseAbilityActionData {
  targetPokemon?: string; // Optional: Target Pokemon position
  selectedCardIds: string[]; // Required: Energy cards selected from discard
}

/**
 * Action data for STATUS_CONDITION effect
 */
export interface StatusConditionAbilityActionData extends BaseAbilityActionData {
  targetPokemon: PokemonPosition; // Required: Target Pokemon position (opponent's Pokemon)
}

/**
 * Action data for PREVENT_DAMAGE effect
 */
export interface PreventDamageAbilityActionData extends BaseAbilityActionData {
  // No additional fields needed
}

/**
 * Action data for BOOST_ATTACK effect
 */
export interface BoostAttackAbilityActionData extends BaseAbilityActionData {
  // No additional fields needed (affects all matching Pokemon)
}

/**
 * Action data for BOOST_HP effect
 */
export interface BoostHpAbilityActionData extends BaseAbilityActionData {
  // No additional fields needed (affects all matching Pokemon)
}

/**
 * Action data for REDUCE_DAMAGE effect
 */
export interface ReduceDamageAbilityActionData extends BaseAbilityActionData {
  // No additional fields needed
}

/**
 * Union type for all ability action data types
 */
export type AbilityActionData =
  | BaseAbilityActionData
  | HealAbilityActionData
  | DrawCardsAbilityActionData
  | SearchDeckAbilityActionData
  | RetrieveFromDiscardAbilityActionData
  | EnergyAccelerationAbilityActionData
  | SwitchPokemonAbilityActionData
  | DiscardFromHandAbilityActionData
  | AttachFromDiscardAbilityActionData
  | StatusConditionAbilityActionData
  | PreventDamageAbilityActionData
  | BoostAttackAbilityActionData
  | BoostHpAbilityActionData
  | ReduceDamageAbilityActionData;
