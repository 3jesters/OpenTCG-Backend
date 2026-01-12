import { Card } from '../entities/card.entity';
import { EvolutionStage } from '../enums/evolution-stage.enum';
import { CardType } from '../enums/card-type.enum';
import { Attack } from '../value-objects/attack.value-object';
import { Weakness } from '../value-objects/weakness.value-object';
import { Resistance } from '../value-objects/resistance.value-object';
import { AttackEffectType } from '../enums/attack-effect-type.enum';
import { StatusCondition } from '../enums/status-condition.enum';

/**
 * Result of card strength calculation
 */
export interface CardStrengthResult {
  totalStrength: number; // 0-100 normalized score
  balanceCategory: 'very_weak' | 'weak' | 'balanced' | 'strong' | 'too_strong';
  breakdown: {
    hpStrength: number;
    attackStrength: number;
    abilityStrength: number;
  };
  penalties: {
    sustainability: number;
    evolutionDependency: number;
    prizeLiability: number;
    evolution: number;
  };
  bonuses: {
    retreatCost: number;
    basicPokemon: number;
  };
}

/**
 * Card Strength Calculator Service
 * Calculates balance/strength scores for Pokémon cards
 * Framework-agnostic domain service
 */
export class CardStrengthCalculatorService {
  /**
   * Calculate strength for a card
   */
  calculateStrength(card: Card): CardStrengthResult {
    // Only calculate for Pokémon cards
    if (card.cardType !== CardType.POKEMON || !card.hp) {
      return this.getEmptyResult();
    }

    const hpStrength = this.calculateHpStrength(card);
    const attackStrength = this.calculateAttackStrength(card);
    const abilityStrength = this.calculateAbilityStrength(card);

    const rawTotal = hpStrength.raw + attackStrength.raw + abilityStrength.raw;

    // Adjust normalization max based on whether ability exists
    const normalizationMax = card.ability ? 300 : 250;
    let normalizedTotal = this.normalizeValue(rawTotal, normalizationMax);

    // Calculate penalties
    const sustainabilityPenalty = this.calculateSustainabilityPenalty(card);
    const evolutionDependencyPenalty =
      this.calculateEvolutionDependencyPenalty(card);
    const prizeLiabilityPenalty = this.calculatePrizeLiabilityPenalty(card);
    const evolutionPenalty = this.calculateEvolutionPenalty(card);

    // Calculate bonuses
    const retreatCostBonus = this.calculateRetreatCostBonus(card);
    const basicPokemonBonus = this.calculateBasicPokemonBonus(card);

    // Apply all penalties and bonuses
    normalizedTotal -= sustainabilityPenalty;
    normalizedTotal -= evolutionDependencyPenalty;
    normalizedTotal -= prizeLiabilityPenalty;
    normalizedTotal -= evolutionPenalty;
    normalizedTotal += retreatCostBonus;
    normalizedTotal += basicPokemonBonus;

    normalizedTotal = Math.max(0, Math.min(100, normalizedTotal));

    const balanceCategory = this.getBalanceCategory(normalizedTotal);

    return {
      totalStrength: normalizedTotal,
      balanceCategory,
      breakdown: {
        hpStrength: hpStrength.normalized,
        attackStrength: attackStrength.normalized,
        abilityStrength: abilityStrength.normalized,
      },
      penalties: {
        sustainability: sustainabilityPenalty,
        evolutionDependency: evolutionDependencyPenalty,
        prizeLiability: prizeLiabilityPenalty,
        evolution: evolutionPenalty,
      },
      bonuses: {
        retreatCost: retreatCostBonus,
        basicPokemon: basicPokemonBonus,
      },
    };
  }

  private getEmptyResult(): CardStrengthResult {
    return {
      totalStrength: 0,
      balanceCategory: 'very_weak',
      breakdown: {
        hpStrength: 0,
        attackStrength: 0,
        abilityStrength: 0,
      },
      penalties: {
        sustainability: 0,
        evolutionDependency: 0,
        prizeLiability: 0,
        evolution: 0,
      },
      bonuses: {
        retreatCost: 0,
        basicPokemon: 0,
      },
    };
  }

  private getBalanceCategory(
    score: number,
  ): 'very_weak' | 'weak' | 'balanced' | 'strong' | 'too_strong' {
    if (score <= 30) {
      return 'very_weak';
    } else if (score <= 45) {
      return 'weak';
    } else if (score <= 54) {
      return 'balanced';
    } else if (score <= 70) {
      return 'strong';
    } else {
      return 'too_strong';
    }
  }

  // ========================================
  // Evolution Value
  // ========================================

  private getEvolutionValue(stage: EvolutionStage | undefined): number {
    switch (stage) {
      case EvolutionStage.BASIC:
        return 1.0;
      case EvolutionStage.STAGE_1:
        return 0.5;
      case EvolutionStage.STAGE_2:
        return 0.33;
      default:
        return 1.0;
    }
  }

  // ========================================
  // Normalization
  // ========================================

  private normalizeValue(rawValue: number, maxValue: number): number {
    const normalized = (rawValue / maxValue) * 100;
    return Math.min(100, Math.max(0, normalized));
  }

  // ========================================
  // Damage Parsing
  // ========================================

  private parseDamageString(
    damage: string | null | undefined,
    energyBonusCap: number = 0,
  ): number {
    if (!damage || damage === '0' || damage === '') {
      return 0;
    }

    // Handle coin flip damage (e.g., "20×")
    if (damage.includes('×')) {
      const baseDamage = parseInt(damage.replace('×', ''), 10) || 0;
      return baseDamage / 2; // 50% chance
    }

    // Handle energy bonus (e.g., "40+" with energyBonusCap)
    if (damage.includes('+') && damage.endsWith('+')) {
      const baseDamage = parseInt(damage.replace('+', ''), 10) || 0;
      if (energyBonusCap > 0) {
        const maxDamage = baseDamage + energyBonusCap * 10;
        return (baseDamage + maxDamage) / 2; // Average of min and max
      }
      return baseDamage; // If no cap, assume base damage
    }

    // Handle combined damage (e.g., "30+20")
    if (damage.includes('+') && !damage.endsWith('+')) {
      const parts = damage.split('+');
      return parts.reduce((sum, part) => sum + (parseInt(part, 10) || 0), 0);
    }

    // Regular damage
    return parseInt(damage, 10) || 0;
  }

  // ========================================
  // Effect Detection
  // ========================================

  private hasCoinFlip(text: string | undefined): boolean {
    if (!text) {
      return false;
    }
    const lowerText = text.toLowerCase();
    return lowerText.includes('flip a coin') || lowerText.includes('coin flip');
  }

  private hasPoisonEffect(attack: Attack): boolean {
    if (attack.effects && attack.effects.length > 0) {
      return attack.effects.some(
        (effect) =>
          effect.effectType === AttackEffectType.STATUS_CONDITION &&
          'statusCondition' in effect &&
          effect.statusCondition === 'POISONED',
      );
    }
    if (attack.text) {
      return attack.text.toLowerCase().includes('poisoned');
    }
    return false;
  }

  private getPoisonValue(attack: Attack): number {
    if (!attack) {
      return 0;
    }

    const text = (attack.text || '').toLowerCase();
    const hasEffects =
      attack.effects &&
      Array.isArray(attack.effects) &&
      attack.effects.length > 0;

    // Check for 20 HP poison (explicit mention)
    if (
      text.includes('20 poison') ||
      text.includes('takes 20 poison') ||
      text.includes('20 poison damage instead of 10')
    ) {
      return 4; // 20 HP poison = +4
    }

    // Check for 10 HP poison (default)
    if (
      text.includes('poisoned') ||
      (hasEffects &&
        attack.effects.some(
          (e) =>
            e.effectType === AttackEffectType.STATUS_CONDITION &&
            'statusCondition' in e &&
            e.statusCondition === 'POISONED',
        ))
    ) {
      return 3; // 10 HP poison = +3
    }

    return 0;
  }

  private hasEffects(attack: Attack): boolean {
    if (!attack) {
      return false;
    }
    if (attack.effects && attack.effects.length > 0) {
      return true;
    }
    if (attack.text) {
      const text = attack.text.toLowerCase();
      return (
        text.includes('confused') ||
        text.includes('paralyzed') ||
        text.includes('asleep') ||
        text.includes('poison') ||
        text.includes('burn')
      );
    }
    return false;
  }

  // ========================================
  // Self-Damage Parsing
  // ========================================

  private parseSelfDamage(attack: Attack, pokemonHp: number): number {
    if (!attack.text || !pokemonHp) {
      return 0;
    }

    const text = attack.text.toLowerCase();

    // Check for self-damage patterns
    if (
      text.includes('damage to itself') ||
      text.includes('damage to this') ||
      (text.includes('does') &&
        text.includes('damage') &&
        (text.includes('itself') || text.includes('this')))
    ) {
      // Extract damage amount
      const patterns = [
        /does\s+(\d+)\s+damage\s+to\s+(itself|this)/i,
        /(\d+)\s+damage\s+to\s+(itself|this)/i,
        /does\s+(\d+)\s+damage\s+to\s+itself/i,
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          return parseInt(match[1], 10) || 0;
        }
      }
    }

    return 0;
  }

  // ========================================
  // HP Strength Calculation
  // ========================================

  private calculateHpEfficiencyScore(card: Card): number {
    const hp = card.hp || 0;

    // Expected HP for stage (Base Set norms)
    const expectedHp: Record<EvolutionStage, number> = {
      [EvolutionStage.BASIC]: 60,
      [EvolutionStage.STAGE_1]: 80,
      [EvolutionStage.STAGE_2]: 100,
      [EvolutionStage.VMAX]: 100,
      [EvolutionStage.VSTAR]: 100,
      [EvolutionStage.GX]: 100,
      [EvolutionStage.EX]: 100,
      [EvolutionStage.MEGA]: 100,
      [EvolutionStage.BREAK]: 100,
      [EvolutionStage.LEGEND]: 100,
    };

    const stage = card.stage || EvolutionStage.BASIC;
    const expected = expectedHp[stage] || 60;

    // Base HP efficiency ratio
    let hpEfficiency = hp / expected;

    // Weakness penalty: Strong impact
    if (card.weakness) {
      const modifier = card.weakness.modifier;
      if (modifier === '×2') {
        const basePenalty = 0.25;
        const proportionalPenalty = hpEfficiency * 0.12;
        hpEfficiency -= basePenalty + proportionalPenalty;
      }
    }

    // Resistance bonus: VERY STRONG impact
    if (card.resistance) {
      const modifier = card.resistance.modifier;
      const reduction = Math.abs(parseInt(modifier, 10)) || 0;

      if (reduction >= 30) {
        const baseBonus = 0.3;
        const proportionalBonus = hpEfficiency * 0.18;
        hpEfficiency += baseBonus + proportionalBonus;
      } else if (reduction >= 20) {
        const baseBonus = 0.18;
        const proportionalBonus = hpEfficiency * 0.12;
        hpEfficiency += baseBonus + proportionalBonus;
      }
    }

    return hpEfficiency;
  }

  private calculateHpStrength(card: Card): {
    raw: number;
    normalized: number;
  } {
    const evolveValue = this.getEvolutionValue(card.stage);
    const hp = card.hp || 0;

    const hpEfficiency = this.calculateHpEfficiencyScore(card);
    const rawStrength = evolveValue * hp * hpEfficiency;

    return {
      raw: rawStrength,
      normalized: this.normalizeValue(rawStrength, 200),
    };
  }

  // ========================================
  // Attack Strength Calculation
  // ========================================

  private calculateCoinFlipPenalty(
    attack: Attack,
    energyCost: number,
    avgDamage: number,
  ): number {
    if (!this.hasCoinFlip(attack.text)) {
      return 0;
    }

    const basePenalty = 1;
    const energyMultiplier = energyCost >= 4 ? 2.5 : energyCost >= 3 ? 1.5 : 1;

    // Reduce penalty if attack is still efficient even with coin flip
    const damagePerEnergy = energyCost > 0 ? avgDamage / energyCost : 0;
    const efficiencyReduction = damagePerEnergy >= 15 ? 0.5 : 1;

    return basePenalty * energyMultiplier * efficiencyReduction;
  }

  private calculateAttackDrawbackPenalty(attack: Attack, card: Card): number {
    let penalty = 0;
    if (!attack.text) {
      return penalty;
    }

    const text = attack.text.toLowerCase();
    const energyCost = attack.energyCost.length;

    // 1. Self-damage penalty
    const selfDamage = this.parseSelfDamage(attack, card.hp || 0);
    if (selfDamage > 0 && card.hp) {
      const hpPercentage = (selfDamage / card.hp) * 100;
      if (hpPercentage >= 50) {
        penalty += 5;
      } else if (hpPercentage >= 25) {
        penalty += 3;
      } else {
        penalty += 1;
      }
    }

    // 2. Self-status condition penalties
    if (
      text.includes('this pokémon is now asleep') ||
      text.includes('this pokemon is now asleep') ||
      (text.includes('asleep') && text.includes('this'))
    ) {
      penalty += 2;
    }

    if (
      text.includes('this pokémon is now confused') ||
      text.includes('this pokemon is now confused') ||
      (text.includes('confused') && text.includes('this'))
    ) {
      penalty += 2;
    }

    if (
      text.includes('this pokémon is now paralyzed') ||
      text.includes('this pokemon is now paralyzed') ||
      (text.includes('paralyzed') && text.includes('this'))
    ) {
      penalty += 3;
    }

    // 3. Energy discard penalty
    const energyDiscardMatch =
      text.match(/discard\s+(\d+)\s+energy/i) ||
      text.match(/discard\s+(\w+)\s+energy/i);
    if (
      energyDiscardMatch ||
      (text.includes('discard') && text.includes('energy'))
    ) {
      let amount = 0;
      if (energyDiscardMatch) {
        const amountStr = energyDiscardMatch[1];
        if (amountStr === 'all' || text.includes('all energy')) {
          amount = 10;
        } else {
          amount = parseInt(amountStr, 10) || 2;
        }
      } else if (text.includes('all energy')) {
        amount = 10;
      } else {
        amount = 2;
      }

      if (amount >= 3 || text.includes('all')) {
        penalty += 3;
      } else if (amount === 2) {
        penalty += 2;
      } else {
        penalty += 1;
      }
    }

    // 4. Card discard penalty
    if (
      text.includes('discard') &&
      (text.includes('hand') || text.includes('deck'))
    ) {
      const cardDiscardMatch = text.match(/discard\s+(\d+)\s+card/i);
      if (cardDiscardMatch) {
        const amount = parseInt(cardDiscardMatch[1], 10) || 1;
        penalty += Math.min(amount, 2);
      }
    }

    // 5. Coin flip penalty
    const energyBonusCap = attack.energyBonusCap || 0;
    const avgDamage = this.parseDamageString(attack.damage, energyBonusCap);
    const coinFlipPenalty = this.calculateCoinFlipPenalty(
      attack,
      energyCost,
      avgDamage,
    );
    penalty += coinFlipPenalty;

    // 6. Cannot attack next turn
    if (
      text.includes('cannot attack') &&
      (text.includes('next turn') || text.includes('during your next turn'))
    ) {
      penalty += 3;
    }

    // 7. Cannot retreat
    if (
      text.includes('cannot retreat') &&
      (text.includes('next turn') || text.includes('during your next turn'))
    ) {
      penalty += 1;
    }

    return penalty;
  }

  private calculateEnergyEfficiencyPenalty(
    attack: Attack,
    avgDamage: number,
    energyCost: number,
  ): number {
    if (energyCost < 3) {
      return 0;
    }

    const damagePerEnergy = avgDamage / energyCost;
    const threshold = energyCost >= 4 ? 10 : 8;

    if (damagePerEnergy < threshold) {
      const inefficiency = threshold - damagePerEnergy;
      return Math.min(5, Math.floor(inefficiency / 2));
    }

    return 0;
  }

  private calculateAttackEfficiencyBonus(
    attack: Attack,
    avgDamage: number,
    energyCost: number,
  ): number {
    if (energyCost === 0) {
      return 0;
    }

    const damagePerEnergy = avgDamage / energyCost;

    if (damagePerEnergy >= 20) {
      return 10;
    } else if (damagePerEnergy >= 15) {
      return 6;
    } else if (damagePerEnergy >= 12) {
      return 3;
    }

    return 0;
  }

  private calculateAttackStrength(card: Card): {
    raw: number;
    normalized: number;
  } {
    const attacks = card.attacks;
    if (!attacks || attacks.length === 0) {
      return { raw: 0, normalized: 0 };
    }

    const attackStrengths = attacks.map((attack) => {
      const energyBonusCap = attack.energyBonusCap || 0;
      let averageDamage = this.parseDamageString(attack.damage, energyBonusCap);

      // Check for coin flip affecting damage
      const hasCoinFlip = this.hasCoinFlip(attack.text);
      if (hasCoinFlip && !attack.damage.includes('×')) {
        if (
          attack.text.toLowerCase().includes('heads') &&
          (attack.text.toLowerCase().includes('plus') ||
            attack.text.toLowerCase().includes('more damage'))
        ) {
          const baseDamage = averageDamage;
          const bonusMatch =
            attack.text.match(/plus (\d+)/i) ||
            attack.text.match(/(\d+) more/i);
          if (bonusMatch) {
            const bonus = parseInt(bonusMatch[1], 10) || 0;
            averageDamage = (baseDamage + (baseDamage + bonus)) / 2;
          } else {
            averageDamage = averageDamage / 2;
          }
        }
      }

      const energyCost = attack.energyCost.length;
      let attackEfficiency = energyCost > 0 ? averageDamage / energyCost : 0;

      // Calculate penalties
      const drawbackPenalty = this.calculateAttackDrawbackPenalty(attack, card);
      attackEfficiency -= drawbackPenalty;

      const energyEfficiencyPenalty = this.calculateEnergyEfficiencyPenalty(
        attack,
        averageDamage,
        energyCost,
      );
      attackEfficiency -= energyEfficiencyPenalty;

      // Calculate bonuses
      const efficiencyBonus = this.calculateAttackEfficiencyBonus(
        attack,
        averageDamage,
        energyCost,
      );
      attackEfficiency += efficiencyBonus;

      attackEfficiency = Math.max(0, attackEfficiency);

      // Add effect bonuses (only for opponent-targeting effects)
      const text = (attack.text || '').toLowerCase();
      const targetsSelf =
        text.includes('this pokémon') ||
        text.includes('this pokemon') ||
        text.includes('itself') ||
        text.includes('this attack');

      if (!targetsSelf) {
        const poisonValue = this.getPoisonValue(attack);
        if (poisonValue > 0) {
          attackEfficiency += poisonValue;
        } else if (this.hasEffects(attack)) {
          if (text.includes('paralyzed') && !text.includes('this')) {
            attackEfficiency += 2;
          } else if (text.includes('confused') && !text.includes('this')) {
            attackEfficiency += 2;
          } else if (
            (text.includes('asleep') || text.includes('sleep')) &&
            !text.includes('this')
          ) {
            attackEfficiency += 1.5;
          } else if (
            (text.includes('burned') || text.includes('burn')) &&
            !text.includes('this')
          ) {
            attackEfficiency += 1;
          } else if (text.includes('prevent') || text.includes('heal')) {
            attackEfficiency += 1;
          }
        }
      }

      return attackEfficiency;
    });

    const totalStrength = attackStrengths.reduce((sum, str) => sum + str, 0);
    const avgStrength =
      attackStrengths.length > 0 ? totalStrength / attackStrengths.length : 0;

    return {
      raw: avgStrength,
      normalized: this.normalizeValue(avgStrength, 50),
    };
  }

  // ========================================
  // Ability Strength Calculation
  // ========================================

  private calculateAbilityStrength(card: Card): {
    raw: number;
    normalized: number;
  } {
    if (!card.ability) {
      return { raw: 0, normalized: 0 };
    }

    const evolveValue = this.getEvolutionValue(card.stage);
    const baseAbilityValue = 50;
    const rawStrength = (1 / evolveValue) * baseAbilityValue;

    return {
      raw: rawStrength,
      normalized: this.normalizeValue(rawStrength, 150),
    };
  }

  // ========================================
  // Penalty Calculations
  // ========================================

  private calculateBaseSustainabilityPenalty(
    selfDamage: number,
    hp: number,
  ): number {
    const hpPercentage = (selfDamage / hp) * 100;

    if (hpPercentage >= 80) {
      return 30;
    } else if (hpPercentage >= 66) {
      return 20;
    } else if (hpPercentage >= 50) {
      return 12;
    } else if (hpPercentage >= 33) {
      return 6;
    } else if (hpPercentage >= 25) {
      return 3;
    } else {
      return 1;
    }
  }

  private calculateSustainabilityPenalty(card: Card): number {
    const attacks = card.attacks;
    if (!attacks || attacks.length === 0) {
      return 0;
    }

    let maxSelfDamage = 0;
    let hasSustainableAttack = false;

    attacks.forEach((attack) => {
      const selfDamage = this.parseSelfDamage(attack, card.hp || 0);
      if (selfDamage === 0) {
        hasSustainableAttack = true;
      }
      maxSelfDamage = Math.max(maxSelfDamage, selfDamage);
    });

    if (hasSustainableAttack && maxSelfDamage > 0 && card.hp) {
      const basePenalty = this.calculateBaseSustainabilityPenalty(
        maxSelfDamage,
        card.hp,
      );
      return basePenalty * 0.5;
    }

    if (maxSelfDamage > 0 && card.hp) {
      return this.calculateBaseSustainabilityPenalty(maxSelfDamage, card.hp);
    }

    return 0;
  }

  private calculateEvolutionDependencyPenalty(card: Card): number {
    const threeStageFirstForms = ['Caterpie', 'Weedle'];
    const threeStageSecondForms = ['Metapod', 'Kakuna'];

    if (threeStageFirstForms.includes(card.name)) {
      return 5;
    }

    if (threeStageSecondForms.includes(card.name)) {
      return 3;
    }

    return 0;
  }

  private calculatePrizeLiabilityPenalty(card: Card): number {
    const hp = card.hp || 0;
    const stage = card.stage || EvolutionStage.BASIC;

    const expectedHp: Record<EvolutionStage, number> = {
      [EvolutionStage.BASIC]: 60,
      [EvolutionStage.STAGE_1]: 80,
      [EvolutionStage.STAGE_2]: 100,
      [EvolutionStage.VMAX]: 100,
      [EvolutionStage.VSTAR]: 100,
      [EvolutionStage.GX]: 100,
      [EvolutionStage.EX]: 100,
      [EvolutionStage.MEGA]: 100,
      [EvolutionStage.BREAK]: 100,
      [EvolutionStage.LEGEND]: 100,
    };

    const expected = expectedHp[stage] || 60;
    const hpRatio = hp / expected;

    if (hpRatio < 0.5) {
      const deficit = 0.5 - hpRatio;
      return Math.min(5, Math.floor(deficit * 10));
    }

    return 0;
  }

  private calculateEvolutionPenalty(card: Card): number {
    const stage = card.stage;
    if (stage === EvolutionStage.STAGE_2) {
      return 8;
    } else if (stage === EvolutionStage.STAGE_1) {
      return 3;
    }
    return 0;
  }

  // ========================================
  // Bonus Calculations
  // ========================================

  private calculateRetreatCostBonus(card: Card): number {
    const retreatCost = card.retreatCost || 0;

    if (retreatCost === 0) {
      return 5;
    } else if (retreatCost === 1) {
      return 2;
    } else if (retreatCost >= 3) {
      return -2;
    }

    return 0;
  }

  private calculateBasicPokemonBonus(card: Card): number {
    if (card.stage === EvolutionStage.BASIC) {
      return 5;
    }
    return 0;
  }
}
