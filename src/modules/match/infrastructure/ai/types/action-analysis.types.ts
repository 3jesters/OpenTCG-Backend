import { CardInstance } from '../../../domain/value-objects';
import { Card } from '../../../../card/domain/entities';
import { Attack } from '../../../../card/domain/value-objects';
import { PokemonPosition, PlayerIdentifier } from '../../../domain/enums';
import { TrainerEffectType } from '../../../../card/domain/enums';

/**
 * Pokemon Score
 * Represents a Pokemon with its calculated strategic score
 */
export interface PokemonScore {
  cardInstance: CardInstance;
  card: Card;
  score: number;
  position: PokemonPosition;
}

/**
 * Attack Analysis
 * Represents an attack with its analysis data including damage, energy cost, and side effects
 */
export interface AttackAnalysis {
  attack: Attack;
  pokemon: CardInstance;
  card: Card;
  position: PokemonPosition;
  energyCost: number; // Number of energy cards required
  baseDamage: number; // Parsed base damage value
  hasCoinFlip: boolean; // Whether attack requires coin flip
  hasPoisonEffect: boolean; // Whether attack applies poison
  hasOnlySideEffect: boolean; // Whether attack has only side effects (no damage)
  sideEffectPoints: number; // Calculated side effect points for scoring
  canPerform: boolean; // Whether Pokemon has sufficient energy to perform attack
}

/**
 * Knockout Analysis
 * Represents an attack that can knockout an opponent Pokemon
 */
export interface KnockoutAnalysis {
  attack: Attack;
  attackAnalysis: AttackAnalysis;
  targetPokemon: CardInstance;
  targetCard: Card;
  targetPosition: PokemonPosition;
  damage: number; // Final calculated damage
  willKnockout: boolean; // Whether this attack will knockout the target
  hasSideEffectToOpponent: boolean; // Whether attack has side effects affecting opponent
  hasSideEffectToPlayer: boolean; // Whether attack has side effects affecting player
}

/**
 * Opponent Threat
 * Represents the opponent's attack capabilities and threat level
 */
export interface OpponentThreat {
  sureAttackDamage: number; // Maximum damage without playing any cards
  riskAttackDamage: number; // Maximum damage with coin flips and potential energy attachments
  canKnockoutActive: boolean; // Whether opponent can knockout our active Pokemon
  canKnockoutBench: CardInstance[]; // List of bench Pokemon opponent can knockout
  mostThreateningPokemon: PokemonPosition | null; // Position of highest scored Pokemon in opponent's hand/bench
  activePokemonScore: number; // Score of opponent's active Pokemon
}

/**
 * Energy Attachment Option
 * Represents a candidate energy attachment with its evaluation
 */
export interface EnergyAttachmentOption {
  energyCardId: string;
  energyType: string; // Energy type identifier
  targetPokemon: CardInstance;
  targetCard: Card;
  enablesKnockout: boolean; // Whether this attachment enables a knockout attack
  increasesDamage: boolean; // Whether this attachment increases damage output
  isExactMatch: boolean; // Whether this is an exact energy match (no overflow)
  priority: number; // Calculated priority score (higher = better)
}

/**
 * Trainer Card Option
 * Represents a trainer card play candidate with its evaluation
 */
export interface TrainerCardOption {
  trainerCardId: string;
  trainerCard: Card;
  effectTypes: TrainerEffectType[]; // All effect types (after filtering ignored effects)
  primaryEffectType: TrainerEffectType; // Highest priority effect type
  category: TrainerCardCategory; // Categorized priority
  shouldPlay: boolean; // Whether this card should be played
  reason: string; // Reason for playing or not playing
  targetPokemon?: CardInstance; // Target Pokemon (for healing, etc.)
  targetCard?: Card; // Target card entity
  wouldCauseDeckEmpty: boolean; // Whether playing this would cause deck to reach 0 cards
  estimatedImpact: TrainerCardImpact; // Estimated impact on game state
}

/**
 * Trainer Card Category
 * Priority order for trainer card categorization
 */
export enum TrainerCardCategory {
  HEALING_DAMAGE_REMOVAL = 1, // Highest priority
  DAMAGE_MODIFICATION = 2,
  CARD_DRAWING_DECK_MANIPULATION = 3,
  CARD_DISCARD_RETRIEVAL = 4,
  OPPONENT_MANIPULATION = 5,
  POKEMON_MANIPULATION = 6,
  ENERGY_MANIPULATION = 7,
  SPECIAL_EFFECTS = 8, // Lowest priority
}

/**
 * Trainer Card Impact
 * Estimated impact of playing a trainer card
 */
export interface TrainerCardImpact {
  changesOpponentSureDamage: boolean; // Whether this changes opponent's sure attack damage
  enablesKnockout: boolean; // Whether this enables a knockout of opponent
  preventsOurKnockout: boolean; // Whether this prevents our Pokemon from being knocked out
  improvesHandSize: boolean; // Whether this improves our hand size
  improvesOpponentHandSize: boolean; // Whether this improves opponent's hand size (bad for us)
  reducesRoundsToKnockout?: boolean; // Whether this reduces the number of rounds needed to knockout opponent
  increasesRoundsWeCanSurvive?: boolean; // Whether this increases the number of rounds we can survive
}

/**
 * Switch/Retreat Priority
 * Priority levels for switch/retreat decisions
 */
export enum SwitchRetreatPriority {
  HIGH = 1, // Free retreat or game-losing scenario
  MEDIUM = 2, // Trainer card available or affordable energy retreat
  LOW = 3, // Energy retreat with cost
}

/**
 * Switch/Retreat Option
 * Represents a switch/retreat decision with evaluation
 */
export interface SwitchRetreatOption {
  shouldSwitch: boolean;
  reason: string;
  targetPokemon?: CardInstance;
  targetCard?: Card;
  shouldUseTrainerCard: boolean;
  trainerCardId?: string;
  retreatCost: number;
  canAffordRetreat: boolean;
  priority: SwitchRetreatPriority;
  isGameLosingScenario?: boolean;
  benchPokemonWillSurvive?: boolean;
}

// ========================================
// Sorted List Types
// ========================================

/**
 * Sorted Pokemon Score List
 * List of Pokemon scores sorted by score (highest to lowest)
 * Sorting: score (descending)
 */
export type SortedPokemonScoreList = PokemonScore[];

/**
 * Sorted Attack Analysis List
 * List of attack analyses sorted by attack potential
 * Sorting priority:
 * 1. canPerform (true first - attacks we can actually use)
 * 2. position (ACTIVE before BENCH)
 * 3. baseDamage (descending - highest damage first)
 * 4. sideEffectPoints (descending - higher side effect value first)
 */
export type SortedAttackAnalysisList = AttackAnalysis[];

/**
 * Sorted Knockout Analysis List
 * List of knockout analyses sorted by priority
 * Sorting priority:
 * 1. targetPosition (ACTIVE before BENCH)
 * 2. hasSideEffectToOpponent (true first - prefer attacks with opponent side effects)
 * 3. hasSideEffectToPlayer (false first - prefer NO self-side effects)
 * 4. damage (descending - highest damage first)
 */
export type SortedKnockoutAnalysisList = KnockoutAnalysis[];

/**
 * Sorted Energy Attachment Option List
 * List of energy attachment options sorted by priority (highest to lowest)
 * Sorting priority:
 * 1. enablesKnockout (true first)
 * 2. increasesDamage (true first)
 * 3. isExactMatch (true first - prefer exact matches, no overflow)
 * 4. priority (descending - higher priority score first)
 */
export type SortedEnergyAttachmentOptionList = EnergyAttachmentOption[];

/**
 * Sorted Trainer Card Option List
 * List of trainer card options sorted by priority (highest to lowest)
 * Sorting priority:
 * 1. wouldCauseDeckEmpty (false first - never play if deck empty)
 * 2. category (ascending - lower category number = higher priority)
 * 3. shouldPlay (true first)
 * 4. estimatedImpact (prioritize: enablesKnockout > preventsOurKnockout > changesOpponentSureDamage)
 */
export type SortedTrainerCardOptionList = TrainerCardOption[];

