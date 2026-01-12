import { PokemonPosition } from '../../../domain/enums';
import {
  PokemonScore,
  AttackAnalysis,
  KnockoutAnalysis,
  EnergyAttachmentOption,
  TrainerCardOption,
  SortedPokemonScoreList,
  SortedAttackAnalysisList,
  SortedKnockoutAnalysisList,
  SortedEnergyAttachmentOptionList,
  SortedTrainerCardOptionList,
} from '../types/action-analysis.types';

/**
 * Sorting Utilities for AI Action Analysis
 * Provides sorting functions for all sorted list types
 */

/**
 * Sort Pokemon scores by score (highest to lowest)
 * @param scores - Array of Pokemon scores to sort
 * @returns Sorted list of Pokemon scores
 */
export function sortPokemonScores(
  scores: PokemonScore[],
): SortedPokemonScoreList {
  return [...scores].sort((a, b) => b.score - a.score);
}

/**
 * Sort attack analyses by attack potential
 * Priority:
 * 1. canPerform (true first - attacks we can actually use)
 * 2. position (ACTIVE before BENCH)
 * 3. baseDamage (descending - highest damage first)
 * 4. sideEffectPoints (descending - higher side effect value first)
 * @param attacks - Array of attack analyses to sort
 * @returns Sorted list of attack analyses
 */
export function sortAttackAnalyses(
  attacks: AttackAnalysis[],
): SortedAttackAnalysisList {
  return [...attacks].sort((a, b) => {
    // First: can perform
    if (a.canPerform !== b.canPerform) {
      return a.canPerform ? -1 : 1;
    }
    // Second: position (ACTIVE = 0, BENCH = 1)
    const posA = a.position === PokemonPosition.ACTIVE ? 0 : 1;
    const posB = b.position === PokemonPosition.ACTIVE ? 0 : 1;
    if (posA !== posB) return posA - posB;
    // Third: base damage
    if (b.baseDamage !== a.baseDamage) {
      return b.baseDamage - a.baseDamage;
    }
    // Fourth: side effect points
    return b.sideEffectPoints - a.sideEffectPoints;
  });
}

/**
 * Sort knockout analyses by priority
 * Priority:
 * 1. targetPosition (ACTIVE before BENCH)
 * 2. hasSideEffectToOpponent (true first - prefer attacks with opponent side effects)
 * 3. hasSideEffectToPlayer (false first - prefer NO self-side effects)
 * 4. damage (descending - highest damage first)
 * @param knockouts - Array of knockout analyses to sort
 * @returns Sorted list of knockout analyses
 */
export function sortKnockoutAnalyses(
  knockouts: KnockoutAnalysis[],
): SortedKnockoutAnalysisList {
  return [...knockouts].sort((a, b) => {
    // First: attacker position (ACTIVE = 0, BENCH = 1+) - prioritize ACTIVE attackers
    const attackerPosA =
      a.attackAnalysis.position === PokemonPosition.ACTIVE ? 0 : 1;
    const attackerPosB =
      b.attackAnalysis.position === PokemonPosition.ACTIVE ? 0 : 1;
    if (attackerPosA !== attackerPosB) return attackerPosA - attackerPosB;

    // Second: target position (ACTIVE = 0, BENCH = 1)
    const posA = a.targetPosition === PokemonPosition.ACTIVE ? 0 : 1;
    const posB = b.targetPosition === PokemonPosition.ACTIVE ? 0 : 1;
    if (posA !== posB) return posA - posB;

    // Third: side effects to opponent (prefer attacks with opponent side effects)
    if (a.hasSideEffectToOpponent !== b.hasSideEffectToOpponent) {
      return a.hasSideEffectToOpponent ? -1 : 1;
    }
    // Fourth: side effects to player (prefer NO self-side effects)
    if (a.hasSideEffectToPlayer !== b.hasSideEffectToPlayer) {
      return a.hasSideEffectToPlayer ? 1 : -1;
    }
    // Fifth: damage
    return b.damage - a.damage;
  });
}

/**
 * Sort energy attachment options by priority
 * Priority:
 * 1. enablesKnockout (true first)
 * 2. increasesDamage (true first)
 * 3. isExactMatch (true first - prefer exact matches, no overflow)
 * 4. priority (descending - higher priority score first)
 * @param options - Array of energy attachment options to sort
 * @returns Sorted list of energy attachment options
 */
export function sortEnergyAttachmentOptions(
  options: EnergyAttachmentOption[],
): SortedEnergyAttachmentOptionList {
  return [...options].sort((a, b) => {
    // First: enables knockout
    if (a.enablesKnockout !== b.enablesKnockout) {
      return a.enablesKnockout ? -1 : 1;
    }
    // Second: increases damage
    if (a.increasesDamage !== b.increasesDamage) {
      return a.increasesDamage ? -1 : 1;
    }
    // Third: exact match (prefer no overflow)
    if (a.isExactMatch !== b.isExactMatch) {
      return a.isExactMatch ? -1 : 1;
    }
    // Fourth: priority score
    return b.priority - a.priority;
  });
}

/**
 * Sort trainer card options by priority
 * Priority:
 * 1. wouldCauseDeckEmpty (false first - never play if deck empty)
 * 2. category (ascending - lower category number = higher priority)
 * 3. shouldPlay (true first)
 * 4. estimatedImpact (prioritize: enablesKnockout > preventsOurKnockout > changesOpponentSureDamage)
 * @param options - Array of trainer card options to sort
 * @returns Sorted list of trainer card options
 */
export function sortTrainerCardOptions(
  options: TrainerCardOption[],
): SortedTrainerCardOptionList {
  return [...options].sort((a, b) => {
    // First: would cause deck empty (never play these)
    if (a.wouldCauseDeckEmpty !== b.wouldCauseDeckEmpty) {
      return a.wouldCauseDeckEmpty ? 1 : -1;
    }
    // Second: category (lower number = higher priority)
    if (a.category !== b.category) {
      return a.category - b.category;
    }
    // Third: should play
    if (a.shouldPlay !== b.shouldPlay) {
      return a.shouldPlay ? -1 : 1;
    }
    // Fourth: estimated impact priority
    const impactA = a.estimatedImpact;
    const impactB = b.estimatedImpact;
    // Prioritize: enablesKnockout > preventsOurKnockout > changesOpponentSureDamage
    if (impactA.enablesKnockout !== impactB.enablesKnockout) {
      return impactA.enablesKnockout ? -1 : 1;
    }
    if (impactA.preventsOurKnockout !== impactB.preventsOurKnockout) {
      return impactA.preventsOurKnockout ? -1 : 1;
    }
    if (
      impactA.changesOpponentSureDamage !== impactB.changesOpponentSureDamage
    ) {
      return impactA.changesOpponentSureDamage ? -1 : 1;
    }
    return 0;
  });
}
