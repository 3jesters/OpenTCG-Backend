/**
 * Trainer Action Data Types
 * Type definitions for actionData parameter in PLAY_TRAINER actions
 * Use proper type hints - prefer object types (interfaces/types), then primitives, avoid any/unknown
 */

/**
 * Base interface for all trainer action data
 */
export interface BaseTrainerActionData {
  cardId: string;
  target?: string; // 'ACTIVE' | 'BENCH_0' | 'BENCH_1' | etc.
  pokemonInstanceId?: string; // For disambiguation
}

/**
 * Action data for HEAL effect
 */
export interface HealActionData extends BaseTrainerActionData {
  target: string; // Required
}

/**
 * Action data for REMOVE_ENERGY effect
 */
export interface RemoveEnergyActionData extends BaseTrainerActionData {
  target: string; // Required
  energyCardId: string; // Required
}

/**
 * Action data for RETRIEVE_ENERGY effect
 */
export interface RetrieveEnergyActionData extends BaseTrainerActionData {
  handCardId?: string; // Required if DISCARD_HAND effect exists
  handCardIndex?: number; // Optional, for disambiguation
  selectedCardIds: string[]; // Required, array of energy card IDs
}

/**
 * Action data for DISCARD_HAND effect
 */
export interface DiscardHandActionData extends BaseTrainerActionData {
  handCardId: string; // Required
  handCardIndex?: number; // Optional
}

/**
 * Action data for DISCARD_ENERGY effect
 */
export interface DiscardEnergyActionData extends BaseTrainerActionData {
  target: string; // Required
  energyCardId: string; // Required
}

/**
 * Action data for SWITCH_ACTIVE effect
 */
export interface SwitchActiveActionData extends BaseTrainerActionData {
  benchPosition: string; // Required, 'BENCH_0' | 'BENCH_1' | etc.
}

/**
 * Action data for FORCE_SWITCH effect
 */
export interface ForceSwitchActionData extends BaseTrainerActionData {
  benchPosition: string; // Required
}

/**
 * Action data for SEARCH_DECK effect
 */
export interface SearchDeckActionData extends BaseTrainerActionData {
  selectedCardIds: string[]; // Required
}

/**
 * Action data for RETRIEVE_FROM_DISCARD effect
 */
export interface RetrieveFromDiscardActionData extends BaseTrainerActionData {
  selectedCardIds: string[]; // Required
}

/**
 * Action data for DRAW_CARDS effect
 */
export interface DrawCardsActionData extends BaseTrainerActionData {
  // No additional fields, uses value from effect
}

/**
 * Action data for SHUFFLE_DECK effect
 */
export interface ShuffleDeckActionData extends BaseTrainerActionData {
  // No additional fields
}

/**
 * Action data for CURE_STATUS effect
 */
export interface CureStatusActionData extends BaseTrainerActionData {
  target: string; // Required
}

/**
 * Action data for EVOLVE_POKEMON effect
 */
export interface EvolvePokemonActionData extends BaseTrainerActionData {
  target: string; // Required
  evolutionCardId: string; // Required
}

/**
 * Action data for DEVOLVE_POKEMON effect
 */
export interface DevolvePokemonActionData extends BaseTrainerActionData {
  target: string; // Required
}

/**
 * Action data for RETURN_TO_HAND effect
 */
export interface ReturnToHandActionData extends BaseTrainerActionData {
  target: string; // Required
}

/**
 * Action data for RETURN_TO_DECK effect
 */
export interface ReturnToDeckActionData extends BaseTrainerActionData {
  target: string; // Required
}

/**
 * Action data for PUT_INTO_PLAY effect
 */
export interface PutIntoPlayActionData extends BaseTrainerActionData {
  target: string; // Required
  pokemonCardId: string; // Required
}

/**
 * Action data for ATTACH_TO_POKEMON effect
 */
export interface AttachToPokemonActionData extends BaseTrainerActionData {
  target: string; // Required
}

/**
 * Action data for TRADE_CARDS effect
 */
export interface TradeCardsActionData extends BaseTrainerActionData {
  discardCardIds: string[]; // Required
  selectedCardIds: string[]; // Required
}

/**
 * Union type for all trainer action data types
 */
export type TrainerActionData =
  | HealActionData
  | RemoveEnergyActionData
  | RetrieveEnergyActionData
  | DiscardHandActionData
  | DiscardEnergyActionData
  | SwitchActiveActionData
  | ForceSwitchActionData
  | SearchDeckActionData
  | RetrieveFromDiscardActionData
  | DrawCardsActionData
  | ShuffleDeckActionData
  | CureStatusActionData
  | EvolvePokemonActionData
  | DevolvePokemonActionData
  | ReturnToHandActionData
  | ReturnToDeckActionData
  | PutIntoPlayActionData
  | AttachToPokemonActionData
  | TradeCardsActionData;
