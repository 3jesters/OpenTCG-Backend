import { Injectable, Inject } from '@nestjs/common';
import { Card } from '../../../../card/domain/entities';
import { Attack } from '../../../../card/domain/value-objects';
import { StatusConditionEffect } from '../../../../card/domain/value-objects/attack-effect.value-object';
import { CardInstance } from '../../../domain/value-objects';
import { AttackEffectType } from '../../../../card/domain/enums/attack-effect-type.enum';
import { PreconditionType } from '../../../../card/domain/enums/precondition-type.enum';
import {
  PokemonScore,
  SortedPokemonScoreList,
} from '../types/action-analysis.types';
import { sortPokemonScores } from '../utils/sorting.utils';
import { ILogger } from '../../../../../shared/application/ports/logger.interface';

/**
 * Pokemon Scoring Service
 * Calculates strategic scores for Pokemon based on HP, attacks, and side effects
 */
@Injectable()
export class PokemonScoringService {
  constructor(
    @Inject(ILogger)
    private readonly logger: ILogger,
  ) {}

  /**
   * Calculate Pokemon score
   * Formula: maxHP + sum(attackScore) for all attacks
   * attackScore = (averageDamage / energyCost) + sideEffectPoints
   */
  calculateScore(card: Card, cardInstance: CardInstance): number {
    this.logger.verbose('calculateScore called', 'PokemonScoringService', {
      cardId: card.cardId,
      cardName: card.name,
      maxHp: cardInstance.maxHp,
      attacksCount: card.attacks?.length || 0,
    });

    const maxHp = cardInstance.maxHp;
    const attacks = card.attacks || [];

    if (attacks.length === 0) {
      this.logger.debug('No attacks, returning maxHP as score', 'PokemonScoringService', {
        cardId: card.cardId,
        score: maxHp,
      });
      return maxHp;
    }

    let totalAttackScore = 0;

    for (const attack of attacks) {
      const attackScore = this.calculateAttackScore(attack, maxHp);
      totalAttackScore += attackScore;
      this.logger.verbose('Attack score calculated', 'PokemonScoringService', {
        cardId: card.cardId,
        attackName: attack.name,
        attackScore,
      });
    }

    const totalScore = maxHp + totalAttackScore;
    this.logger.debug('Pokemon score calculated', 'PokemonScoringService', {
      cardId: card.cardId,
      cardName: card.name,
      maxHp,
      totalAttackScore,
      totalScore,
    });

    return totalScore;
  }

  /**
   * Calculate score for a single attack
   * attackScore = (averageDamage / energyCost) + sideEffectPoints
   */
  private calculateAttackScore(attack: Attack, maxHp: number): number {
    const energyCost = attack.getTotalEnergyCost();
    const baseDamage = this.parseBaseDamage(attack.damage);

    // Calculate average damage (accounting for coin flips that affect damage)
    const averageDamage = this.calculateAverageDamage(attack, baseDamage);

    // Calculate side effect points
    const sideEffectPoints = this.calculateSideEffectPoints(attack, baseDamage);

    // Handle division by zero (edge case: zero energy cost)
    const energyCostForCalculation = energyCost === 0 ? 1 : energyCost;

    const damageEfficiency = averageDamage / energyCostForCalculation;
    return damageEfficiency + sideEffectPoints;
  }

  /**
   * Calculate average damage accounting for coin flips that affect damage
   */
  private calculateAverageDamage(attack: Attack, baseDamage: number): number {
    // Check if attack has coin flip preconditions
    const hasCoinFlip = attack.hasPreconditions() &&
      attack.getPreconditionsByType(PreconditionType.COIN_FLIP).length > 0;

    if (!hasCoinFlip) {
      // No coin flip, use base damage
      return baseDamage;
    }

    // Parse attack text to determine if coin flip affects damage
    const attackText = attack.text.toLowerCase();

    // Pattern 1: "Flip a coin. If tails, this attack does nothing."
    if (
      attackText.includes('flip a coin') &&
      attackText.includes('if tails') &&
      attackText.includes('does nothing')
    ) {
      // Average = (baseDamage + 0) / 2
      return (baseDamage + 0) / 2;
    }

    // Pattern 2: "Flip a coin. If heads, this attack does X more damage."
    // Also handles: "Flip a coin. If heads, do X more damage."
    const bonusMatch = attackText.match(
      /if heads.*?(\d+)\s+more\s+damage/i,
    );
    if (bonusMatch) {
      const bonus = parseInt(bonusMatch[1], 10);
      // Average = (baseDamage + (baseDamage + bonus)) / 2
      return (baseDamage + (baseDamage + bonus)) / 2;
    }

    // Pattern 3: Status effect coin flip - damage always applies, coin flip only affects status
    // Example: "Flip a coin. If heads, the Defending Pokémon is now Paralyzed."
    if (
      attackText.includes('flip a coin') &&
      (attackText.includes('if heads') || attackText.includes('if tails')) &&
      attackText.includes('now') &&
      (attackText.includes('paralyzed') ||
        attackText.includes('confused') ||
        attackText.includes('asleep') ||
        attackText.includes('poisoned'))
    ) {
      // Damage always applies, coin flip doesn't affect damage
      return baseDamage;
    }

    // Default: if coin flip exists but doesn't match known patterns affecting damage,
    // assume it doesn't affect damage (use base damage)
    return baseDamage;
  }

  /**
   * Calculate side effect points
   * Only calculated when attack has status condition side effects
   * - Poison: 20
   * - Other status effects: 10
   * - No side effect: 0
   */
  private calculateSideEffectPoints(
    attack: Attack,
    baseDamage: number,
  ): number {
    // Check if attack has status condition effects
    if (!attack.hasEffects()) {
      return 0;
    }

    const statusEffects = attack.getEffectsByType(
      AttackEffectType.STATUS_CONDITION,
    );

    if (statusEffects.length === 0) {
      return 0;
    }

    // Check if any status effect is poison
    // Type guard: check if effect has statusCondition property (StatusConditionEffect)
    const hasPoison = statusEffects.some((effect) => {
      if (effect.effectType === AttackEffectType.STATUS_CONDITION) {
        const statusEffect = effect as StatusConditionEffect;
        return statusEffect.statusCondition === 'POISONED';
      }
      return false;
    });

    if (hasPoison) {
      return 20;
    }

    // Other status effects (paralyze, sleep, confuse, burn)
    return 10;
  }

  /**
   * Parse base damage from damage string
   * Handles formats like "30", "30+", "30×", ""
   */
  private parseBaseDamage(damage: string): number {
    if (!damage || damage.trim() === '') {
      return 0;
    }

    // Extract numeric part (remove +, ×, etc.)
    const match = damage.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Score a Pokemon and return PokemonScore object
   */
  scorePokemon(cardInstance: CardInstance, card: Card): PokemonScore {
    const score = this.calculateScore(card, cardInstance);

    return {
      cardInstance,
      card,
      score,
      position: cardInstance.position,
    };
  }

  /**
   * Sort Pokemon scores by score (highest to lowest)
   */
  sortByScore(pokemonScores: PokemonScore[]): SortedPokemonScoreList {
    return sortPokemonScores(pokemonScores);
  }
}

