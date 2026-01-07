// calculate-card-strengths.js
const fs = require('fs');
const path = require('path');

// Card Balance Assessment Algorithm Implementation
class CardBalanceCalculator {
  getEvolutionValue(stage) {
    switch (stage) {
      case 'BASIC':
        return 1.0;
      case 'STAGE_1':
        return 0.5;
      case 'STAGE_2':
        return 0.33;
      default:
        return 1.0;
    }
  }

  normalizeValue(rawValue, maxValue) {
    const normalized = (rawValue / maxValue) * 100;
    return Math.min(100, Math.max(0, normalized));
  }

  parseDamageString(damage, energyBonusCap = 0) {
    if (!damage || damage === '0' || damage === '') return 0;
    
    // Handle coin flip damage (e.g., "20×")
    if (damage.includes('×')) {
      const baseDamage = parseInt(damage.replace('×', '')) || 0;
      return baseDamage / 2; // 50% chance
    }
    
    // Handle energy bonus (e.g., "40+" with energyBonusCap)
    if (damage.includes('+')) {
      const baseDamage = parseInt(damage.replace('+', '')) || 0;
      if (energyBonusCap > 0) {
        const maxDamage = baseDamage + (energyBonusCap * 10);
        return (baseDamage + maxDamage) / 2; // Average of min and max
      }
      return baseDamage; // If no cap, assume base damage
    }
    
    // Handle combined damage (e.g., "30+20")
    if (damage.includes('+') && !damage.endsWith('+')) {
      const parts = damage.split('+');
      return parts.reduce((sum, part) => sum + (parseInt(part) || 0), 0);
    }
    
    // Regular damage
    return parseInt(damage) || 0;
  }

  hasCoinFlip(text) {
    if (!text) return false;
    return text.toLowerCase().includes('flip a coin') || 
           text.toLowerCase().includes('coin flip');
  }

  hasPoisonEffect(attack) {
    if (!attack.effects || !Array.isArray(attack.effects)) {
      // Check text for poison
      if (attack.text && attack.text.toLowerCase().includes('poisoned')) {
        return true;
      }
      return false;
    }
    return attack.effects.some(effect => 
      effect.effectType === 'POISON' || 
      (effect.effectType === 'STATUS_CONDITION' && effect.statusCondition === 'POISONED') ||
      (attack.text && attack.text.toLowerCase().includes('poisoned'))
    );
  }

  getPoisonValue(attack) {
    if (!attack) return 0;
    
    const text = (attack.text || '').toLowerCase();
    const hasEffects = attack.effects && Array.isArray(attack.effects) && attack.effects.length > 0;
    
    // Check for 20 HP poison (explicit mention)
    if (text.includes('20 poison') || 
        text.includes('takes 20 poison') ||
        text.includes('20 poison damage instead of 10')) {
      return 4; // 20 HP poison = +4
    }
    
    // Check for 10 HP poison (default)
    if (text.includes('poisoned') || 
        (hasEffects && attack.effects.some(e => 
          e.effectType === 'STATUS_CONDITION' && 
          e.statusCondition === 'POISONED'))) {
      return 3; // 10 HP poison = +3
    }
    
    return 0;
  }

  hasEffects(attack) {
    if (!attack) return false;
    return (attack.effects && Array.isArray(attack.effects) && attack.effects.length > 0) ||
           (attack.text && (
             attack.text.toLowerCase().includes('confused') ||
             attack.text.toLowerCase().includes('paralyzed') ||
             attack.text.toLowerCase().includes('asleep') ||
             attack.text.toLowerCase().includes('poison') ||
             attack.text.toLowerCase().includes('burn')
           ));
  }

  parseSelfDamage(attack, pokemonHp) {
    if (!attack.text || !pokemonHp) return 0;
    
    const text = attack.text.toLowerCase();
    
    // Check for self-damage patterns
    if (text.includes('damage to itself') || 
        text.includes('damage to this') ||
        (text.includes('does') && text.includes('damage') && 
         (text.includes('itself') || text.includes('this')))) {
      
      // Extract damage amount - look for patterns like:
      // "does 80 damage to itself"
      // "does 40 damage to this Pokémon"
      const patterns = [
        /does\s+(\d+)\s+damage\s+to\s+(itself|this)/i,
        /(\d+)\s+damage\s+to\s+(itself|this)/i,
        /does\s+(\d+)\s+damage\s+to\s+itself/i
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          return parseInt(match[1]) || 0;
        }
      }
    }
    
    return 0;
  }

  // Enhanced Coin Flip Penalty - scales with energy cost, but less harsh for efficient attacks
  calculateCoinFlipPenalty(attack, energyCost, avgDamage) {
    if (!this.hasCoinFlip(attack.text)) return 0;
    
    const basePenalty = 1;
    // Scale penalty by energy cost - high-energy coin flips are much worse
    // 1-2 energy: 1x penalty, 3 energy: 1.5x, 4+ energy: 2x+
    const energyMultiplier = energyCost >= 4 ? 2.5 : (energyCost >= 3 ? 1.5 : 1);
    
    // Reduce penalty if attack is still efficient even with coin flip
    const damagePerEnergy = energyCost > 0 ? avgDamage / energyCost : 0;
    const efficiencyReduction = damagePerEnergy >= 15 ? 0.5 : 1; // 50% reduction if efficient
    
    return basePenalty * energyMultiplier * efficiencyReduction;
  }

  // Retreat Cost Bonus/Penalty
  calculateRetreatCostBonus(card) {
    const retreatCost = card.retreatCost || 0;
    
    if (retreatCost === 0) {
      return 5; // Free retreat = huge advantage (+5 points)
    } else if (retreatCost === 1) {
      return 2; // Low retreat cost = good (+2 points)
    } else if (retreatCost >= 3) {
      return -2; // High retreat cost = penalty (-2 points)
    }
    
    return 0;
  }

  // Attack Efficiency Bonus - rewards extremely efficient attacks
  calculateAttackEfficiencyBonus(attack, avgDamage, energyCost) {
    if (energyCost === 0) return 0;
    
    const damagePerEnergy = avgDamage / energyCost;
    
    // Reward extremely efficient attacks (higher values since this affects raw efficiency)
    if (damagePerEnergy >= 20) {
      return 10; // 20+ damage/energy = exceptional (+10 points to raw efficiency)
    } else if (damagePerEnergy >= 15) {
      return 6; // 15-19 damage/energy = excellent (+6 points to raw efficiency)
    } else if (damagePerEnergy >= 12) {
      return 3; // 12-14 damage/energy = good (+3 points to raw efficiency)
    }
    
    return 0;
  }

  // Basic Pokémon Format Bonus - in Base-Fossil format, Basics had huge advantages
  calculateBasicPokemonBonus(card) {
    if (card.stage === 'BASIC') {
      return 5; // +5 points for being Basic (huge format advantage)
    }
    
    return 0;
  }

  // Evolution Penalty - stronger penalty for Stage 2
  calculateEvolutionPenalty(card) {
    if (card.stage === 'STAGE_2') {
      return 8; // -8 points for Stage 2 (was 0.33x multiplier, now explicit penalty)
    } else if (card.stage === 'STAGE_1') {
      return 3; // -3 points for Stage 1
    }
    
    return 0;
  }

  // Evolution Dependency Penalty - for cards requiring 2 evolutions
  calculateEvolutionDependencyPenalty(card) {
    // Cards that are part of 3-stage evolution lines (require 2 evolutions)
    const threeStageFirstForms = ['Caterpie', 'Weedle'];
    const threeStageSecondForms = ['Metapod', 'Kakuna'];
    
    if (threeStageFirstForms.includes(card.name)) {
      // First form: requires 2 evolutions to be useful
      return 5; // -5 points
    }
    
    if (threeStageSecondForms.includes(card.name)) {
      // Second form: still requires 1 more evolution
      return 3; // -3 points
    }
    
    return 0;
  }

  // Energy Efficiency Penalty - penalizes inefficient high-cost attacks
  calculateEnergyEfficiencyPenalty(attack, avgDamage, energyCost) {
    if (energyCost < 3) return 0; // Only penalize 3+ energy attacks
    
    const damagePerEnergy = avgDamage / energyCost;
    
    // Penalize if damage/energy is below threshold
    // 4+ energy attacks should do at least 10 damage/energy to be efficient
    // 3 energy attacks should do at least 8 damage/energy
    const threshold = energyCost >= 4 ? 10 : 8;
    
    if (damagePerEnergy < threshold) {
      const inefficiency = threshold - damagePerEnergy;
      // Scale penalty: 1 point per 2 points of inefficiency, max 5 points
      return Math.min(5, Math.floor(inefficiency / 2));
    }
    
    return 0;
  }

  // Prize Liability Penalty - low-HP cards that give easy prizes
  calculatePrizeLiabilityPenalty(card) {
    const hp = card.hp || 0;
    const stage = card.stage || 'BASIC';
    
    // Expected HP for stage
    const expectedHp = {
      'BASIC': 60,
      'STAGE_1': 80,
      'STAGE_2': 100
    };
    const expected = expectedHp[stage] || 60;
    
    // Penalize if HP is significantly below expected
    // Cards with <50% of expected HP are major prize liabilities
    const hpRatio = hp / expected;
    
    if (hpRatio < 0.5) {
      // Very low HP relative to stage = easy prize
      const deficit = 0.5 - hpRatio;
      // Scale penalty: 1 point per 0.1 deficit, max 5 points
      return Math.min(5, Math.floor(deficit * 10));
    }
    
    return 0;
  }

  calculateAttackDrawbackPenalty(attack, card) {
    let penalty = 0;
    if (!attack.text) return penalty;
    
    const text = attack.text.toLowerCase();
    const energyCost = (attack.energyCost && Array.isArray(attack.energyCost)) 
      ? attack.energyCost.length 
      : 1;
    
    // 1. Self-damage penalty (scaled by HP percentage)
    const selfDamage = this.parseSelfDamage(attack, card.hp);
    if (selfDamage > 0) {
      const hpPercentage = (selfDamage / card.hp) * 100;
      if (hpPercentage >= 50) {
        penalty += 5; // Severe: loses >50% HP
      } else if (hpPercentage >= 25) {
        penalty += 3; // Moderate: loses 25-50% HP
      } else {
        penalty += 1; // Small: loses <25% HP
      }
    }
    
    // 2. Self-status condition penalties
    if (text.includes('this pokémon is now asleep') ||
        text.includes('this pokemon is now asleep') ||
        (text.includes('asleep') && text.includes('this'))) {
      penalty += 2; // Cannot attack next turn (50% chance to wake)
    }
    
    if (text.includes('this pokémon is now confused') ||
        text.includes('this pokemon is now confused') ||
        (text.includes('confused') && text.includes('this'))) {
      penalty += 2; // 50% chance to fail attack + 30 self-damage
    }
    
    if (text.includes('this pokémon is now paralyzed') ||
        text.includes('this pokemon is now paralyzed') ||
        (text.includes('paralyzed') && text.includes('this'))) {
      penalty += 3; // Cannot attack or retreat
    }
    
    // 3. Energy discard penalty
    const energyDiscardMatch = text.match(/discard\s+(\d+)\s+energy/i) ||
                                 text.match(/discard\s+(\w+)\s+energy/i);
    if (energyDiscardMatch || (text.includes('discard') && text.includes('energy'))) {
      let amount = 0;
      if (energyDiscardMatch) {
        const amountStr = energyDiscardMatch[1];
        if (amountStr === 'all' || text.includes('all energy')) {
          amount = 10; // "all" = severe
        } else {
          amount = parseInt(amountStr) || 2;
        }
      } else if (text.includes('all energy')) {
        amount = 10;
      } else {
        amount = 2; // Default if not specified
      }
      
      if (amount >= 3 || text.includes('all')) {
        penalty += 3; // Severe: discards 3+ or all energy
      } else if (amount === 2) {
        penalty += 2; // Moderate: discards 2 energy
      } else {
        penalty += 1; // Small: discards 1 energy
      }
    }
    
    // 4. Card discard penalty (from hand/deck)
    if (text.includes('discard') && 
        (text.includes('hand') || text.includes('deck'))) {
      const cardDiscardMatch = text.match(/discard\s+(\d+)\s+card/i);
      if (cardDiscardMatch) {
        const amount = parseInt(cardDiscardMatch[1]) || 1;
        penalty += Math.min(amount, 2); // Cap at 2 for card discard
      }
    }
    
    // 5. Enhanced Coin Flip Penalty (scales with energy cost, less harsh for efficient attacks)
    // Note: avgDamage will be calculated in calculateAttackStrength and passed here
    // For now, we'll calculate it here for the penalty
    const energyBonusCap = attack.energyBonusCap || 0;
    const avgDamage = this.parseDamageString(attack.damage, energyBonusCap);
    const coinFlipPenalty = this.calculateCoinFlipPenalty(attack, energyCost, avgDamage);
    penalty += coinFlipPenalty;
    
    // 6. Cannot attack next turn
    if (text.includes('cannot attack') && 
        (text.includes('next turn') || text.includes('during your next turn'))) {
      penalty += 3; // Severe: loses entire next turn
    }
    
    // 7. Cannot retreat
    if (text.includes('cannot retreat') && 
        (text.includes('next turn') || text.includes('during your next turn'))) {
      penalty += 1; // Moderate: reduces flexibility
    }
    
    return penalty;
  }

  calculateBaseSustainabilityPenalty(selfDamage, hp) {
    const hpPercentage = (selfDamage / hp) * 100;
    
    if (hpPercentage >= 80) {
      return 30; // Lethal: Can only use once, then KO
    } else if (hpPercentage >= 66) {
      return 20; // Near-lethal: Can use once, then very vulnerable (Chansey's case)
    } else if (hpPercentage >= 50) {
      return 12; // High risk: Can use twice at most
    } else if (hpPercentage >= 33) {
      return 6;  // Moderate risk: Can use 2-3 times
    } else if (hpPercentage >= 25) {
      return 3;   // Low-moderate risk: Can use 3-4 times
    } else {
      return 1; // Low risk: Can use many times
    }
  }

  calculateSustainabilityPenalty(card) {
    if (!card.attacks || card.attacks.length === 0) return 0;
    
    let maxSelfDamage = 0;
    let hasSustainableAttack = false;
    
    // Check all attacks for self-damage and sustainable alternatives
    card.attacks.forEach(attack => {
      const selfDamage = this.parseSelfDamage(attack, card.hp);
      if (selfDamage === 0) {
        hasSustainableAttack = true; // Has at least one attack without self-damage
      }
      maxSelfDamage = Math.max(maxSelfDamage, selfDamage);
    });
    
    // If there's a sustainable attack, reduce penalty
    // (Card can still be useful even if one attack is risky)
    if (hasSustainableAttack && maxSelfDamage > 0) {
      // Reduce penalty by 50% if there's an alternative
      const basePenalty = this.calculateBaseSustainabilityPenalty(maxSelfDamage, card.hp);
      return basePenalty * 0.5;
    }
    
    // If all attacks have self-damage, full penalty
    if (maxSelfDamage > 0) {
      return this.calculateBaseSustainabilityPenalty(maxSelfDamage, card.hp);
    }
    
    return 0;
  }

  calculateHpEfficiencyScore(card) {
    const hp = card.hp || 0;
    
    // Expected HP for stage (Base Set norms)
    const expectedHp = {
      'BASIC': 60,
      'STAGE_1': 80,
      'STAGE_2': 100
    };
    
    const stage = card.stage || 'BASIC';
    const expected = expectedHp[stage] || 60;
    
    // Base HP efficiency ratio
    let hpEfficiency = hp / expected;
    
    // Weakness penalty: Strong impact
    // ×2 weakness means you take DOUBLE damage from that type
    if (card.weakness) {
      const modifier = card.weakness.modifier;
      if (modifier === '×2') {
        const basePenalty = 0.25;        // Base -0.25 points
        const proportionalPenalty = hpEfficiency * 0.12; // Additional 12% of HPES
        hpEfficiency -= (basePenalty + proportionalPenalty);
      }
    }
    
    // Resistance bonus: VERY STRONG impact (especially -30)
    // -30 resistance can completely negate weak attacks
    // -20 resistance provides significant protection
    if (card.resistance) {
      const modifier = card.resistance.modifier;
      const reduction = Math.abs(parseInt(modifier, 10)) || 0;
      
      if (reduction >= 30) {
        // -30 resistance is extremely valuable
        const baseBonus = 0.30;           // Base +0.30 points
        const proportionalBonus = hpEfficiency * 0.18; // Additional 18% of HPES
        hpEfficiency += (baseBonus + proportionalBonus);
      } else if (reduction >= 20) {
        // -20 resistance is strong protection
        const baseBonus = 0.18;           // Base +0.18 points
        const proportionalBonus = hpEfficiency * 0.12; // Additional 12% of HPES
        hpEfficiency += (baseBonus + proportionalBonus);
      }
    }
    
    return hpEfficiency;
  }

  calculateHpStrength(card) {
    const evolveValue = this.getEvolutionValue(card.stage || 'BASIC');
    const hp = card.hp || 0;
    
    // Calculate HP efficiency with weakness/resistance bonuses
    const hpEfficiency = this.calculateHpEfficiencyScore(card);
    
    // Convert HPES back to raw strength for normalization
    // HPES is used as a multiplier on the base HP strength
    const rawStrength = evolveValue * hp * hpEfficiency;
    
    // Normalize: 0-200 raw → 0-100 normalized
    return {
      raw: rawStrength,
      normalized: this.normalizeValue(rawStrength, 200),
      hpEfficiency: hpEfficiency
    };
  }

  calculateAttackStrength(card) {
    if (!card.attacks || card.attacks.length === 0) {
      return { raw: 0, normalized: 0 };
    }

    const attackStrengths = card.attacks.map(attack => {
      // Parse average damage
      const energyBonusCap = attack.energyBonusCap || 0;
      let averageDamage = this.parseDamageString(attack.damage, energyBonusCap);
      
      // Check for coin flip
      const hasCoinFlip = this.hasCoinFlip(attack.text);
      if (hasCoinFlip && !attack.damage.includes('×')) {
        // If coin flip affects damage (not just status), divide by 2
        // Check if coin flip affects damage output
        if (attack.text.toLowerCase().includes('heads') && 
            (attack.text.toLowerCase().includes('plus') || 
             attack.text.toLowerCase().includes('more damage'))) {
          // Coin flip affects damage, so average it
          const baseDamage = averageDamage;
          const bonusMatch = attack.text.match(/plus (\d+)/i) || attack.text.match(/(\d+) more/i);
          if (bonusMatch) {
            const bonus = parseInt(bonusMatch[1]) || 0;
            averageDamage = (baseDamage + (baseDamage + bonus)) / 2;
          } else {
            averageDamage = averageDamage / 2;
          }
        }
      }
      
      // Calculate energy cost
      const energyCost = (attack.energyCost && Array.isArray(attack.energyCost)) 
        ? attack.energyCost.length 
        : 1;
      
      // Calculate attack efficiency
      let attackEfficiency = energyCost > 0 ? averageDamage / energyCost : 0;
      
      // Calculate drawback penalties (includes coin flip penalty)
      const drawbackPenalty = this.calculateAttackDrawbackPenalty(attack, card);
      attackEfficiency -= drawbackPenalty;
      
      // Calculate energy efficiency penalty (for inefficient high-cost attacks)
      const energyEfficiencyPenalty = this.calculateEnergyEfficiencyPenalty(attack, averageDamage, energyCost);
      attackEfficiency -= energyEfficiencyPenalty;
      
      // Add attack efficiency bonus (for extremely efficient attacks)
      const efficiencyBonus = this.calculateAttackEfficiencyBonus(attack, averageDamage, energyCost);
      attackEfficiency += efficiencyBonus;
      
      // Ensure efficiency doesn't go negative
      attackEfficiency = Math.max(0, attackEfficiency);
      
      // Add effect bonuses (only for opponent-targeting effects, not self-targeting)
      const text = (attack.text || '').toLowerCase();
      const targetsSelf = text.includes('this pokémon') || 
                         text.includes('this pokemon') ||
                         text.includes('itself') ||
                         text.includes('this attack');
      
      // Only add bonuses if effect targets opponent, not self
      if (!targetsSelf) {
        const poisonValue = this.getPoisonValue(attack);
        if (poisonValue > 0) {
          attackEfficiency += poisonValue; // +3 for 10 HP poison, +4 for 20 HP poison
        } else if (this.hasEffects(attack)) {
          // Other effects (paralysis, confusion, sleep, burn) on opponent
          if (text.includes('paralyzed') && !text.includes('this')) {
            attackEfficiency += 2; // Paralysis
          } else if (text.includes('confused') && !text.includes('this')) {
            attackEfficiency += 2; // Confusion
          } else if ((text.includes('asleep') || text.includes('sleep')) && !text.includes('this')) {
            attackEfficiency += 1.5; // Sleep
          } else if ((text.includes('burned') || text.includes('burn')) && !text.includes('this')) {
            attackEfficiency += 1; // Burn
          } else if (text.includes('prevent') || text.includes('heal')) {
            attackEfficiency += 1; // Generic defensive/utility effect
          }
        }
      }
      // If targets self, we already penalized it above, don't add bonus
      
      return attackEfficiency;
    });

    // Average all attacks
    const totalStrength = attackStrengths.reduce((sum, str) => sum + str, 0);
    const avgStrength = attackStrengths.length > 0 ? totalStrength / attackStrengths.length : 0;
    
    // Normalize: 0-50 raw → 0-100 normalized
    return {
      raw: avgStrength,
      normalized: this.normalizeValue(avgStrength, 50)
    };
  }

  calculateAbilityStrength(card) {
    if (!card.ability) {
      return { raw: 0, normalized: 0 };
    }

    const evolveValue = this.getEvolutionValue(card.stage || 'BASIC');
    const baseAbilityValue = 50;
    
    // Lower evolution stages get higher ability strength
    const rawStrength = (1 / evolveValue) * baseAbilityValue;
    
    // Normalize: 0-150 raw → 0-100 normalized
    return {
      raw: rawStrength,
      normalized: this.normalizeValue(rawStrength, 150)
    };
  }

  assessBalance(card) {
    const hpStrength = this.calculateHpStrength(card);
    const attackStrength = this.calculateAttackStrength(card);
    const abilityStrength = this.calculateAbilityStrength(card);
    
    const rawTotal = hpStrength.raw + attackStrength.raw + abilityStrength.raw;
    
    // Adjust normalization max based on whether ability exists
    // If no ability: max is 250 (HP 200 + Attack 50)
    // If ability exists: max is 300 (HP 200 + Attack 50 + Ability 150)
    const normalizationMax = card.ability ? 300 : 250;
    let normalizedTotal = this.normalizeValue(rawTotal, normalizationMax);
    
    // Calculate sustainability penalty (affects total score)
    // This penalizes cards that can only use their attacks once or very few times
    const sustainabilityPenalty = this.calculateSustainabilityPenalty(card);
    
    // Calculate evolution dependency penalty (for 3-stage evolution lines)
    const evolutionDependencyPenalty = this.calculateEvolutionDependencyPenalty(card);
    
    // Calculate prize liability penalty (for low-HP cards that give easy prizes)
    const prizeLiabilityPenalty = this.calculatePrizeLiabilityPenalty(card);
    
    // Calculate evolution penalty (stronger penalty for Stage 2)
    const evolutionPenalty = this.calculateEvolutionPenalty(card);
    
    // Calculate bonuses
    const retreatCostBonus = this.calculateRetreatCostBonus(card);
    const basicPokemonBonus = this.calculateBasicPokemonBonus(card);
    
    // Apply all penalties to normalized total
    normalizedTotal -= sustainabilityPenalty;
    normalizedTotal -= evolutionDependencyPenalty;
    normalizedTotal -= prizeLiabilityPenalty;
    normalizedTotal -= evolutionPenalty;
    
    // Apply all bonuses to normalized total
    normalizedTotal += retreatCostBonus;
    normalizedTotal += basicPokemonBonus;
    
    normalizedTotal = Math.max(0, normalizedTotal);
    
    let balanceCategory;
    if (normalizedTotal <= 30) {
      balanceCategory = 'very_weak';
    } else if (normalizedTotal <= 45) {
      balanceCategory = 'weak';
    } else if (normalizedTotal <= 54) {
      balanceCategory = 'balanced';
    } else if (normalizedTotal <= 70) {
      balanceCategory = 'strong';
    } else {
      balanceCategory = 'too_strong';
    }
    
    return {
      hpStrength,
      attackStrength,
      abilityStrength,
      totalStrength: {
        raw: rawTotal,
        normalized: normalizedTotal
      },
      balanceScore: normalizedTotal,
      balanceCategory,
      sustainabilityPenalty,
      evolutionDependencyPenalty,
      prizeLiabilityPenalty
    };
  }
}

// Main execution
function main() {
  const calculator = new CardBalanceCalculator();
  const dataDir = path.join(__dirname, 'data', 'cards');
  
  const files = [
    'pokemon-base-set-v1.0.json',
    'pokemon-fossil-v1.0.json',
    'pokemon-jungle-v1.0.json'
  ];
  
  const allCards = [];
  
  // Read and parse all card files
  files.forEach(file => {
    const filePath = path.join(dataDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Filter for Pokemon cards only (those with hp field)
    const pokemonCards = data.cards.filter(card => card.hp !== undefined);
    
    pokemonCards.forEach(card => {
      const assessment = calculator.assessBalance(card);
      allCards.push({
        name: card.name,
        cardNumber: card.cardNumber,
        pokemonNumber: card.pokemonNumber,
        setName: data.metadata.setName,
        stage: card.stage || 'BASIC',
        hp: card.hp,
        attacks: card.attacks ? card.attacks.length : 0,
        hasAbility: !!card.ability,
        assessment: assessment
      });
    });
  });
  
  // Sort by total strength
  allCards.sort((a, b) => b.assessment.balanceScore - a.assessment.balanceScore);
  
  // Generate report
  let report = '='.repeat(80) + '\n';
  report += 'POKEMON CARD STRENGTH ANALYSIS\n';
  report += '='.repeat(80) + '\n\n';
  report += `Total Pokemon Cards Analyzed: ${allCards.length}\n\n`;
  
  // Top 5 Strongest
  report += 'TOP 5 STRONGEST CARDS\n';
  report += '-'.repeat(80) + '\n';
  for (let i = 0; i < Math.min(5, allCards.length); i++) {
    const card = allCards[i];
    report += `${i + 1}. ${card.name} (${card.setName} #${card.cardNumber})\n`;
    report += `   Pokemon #${card.pokemonNumber} | Stage: ${card.stage} | HP: ${card.hp}\n`;
    report += `   Attacks: ${card.attacks} | Ability: ${card.hasAbility ? 'Yes' : 'No'}\n`;
    report += `   Total Strength: ${card.assessment.balanceScore.toFixed(2)}/100\n`;
    report += `   Category: ${card.assessment.balanceCategory}\n`;
    report += `   Breakdown: HP=${card.assessment.hpStrength.normalized.toFixed(2)}, `;
    report += `Attack=${card.assessment.attackStrength.normalized.toFixed(2)}, `;
    report += `Ability=${card.assessment.abilityStrength.normalized.toFixed(2)}\n\n`;
  }
  
  // Top 5 Weakest
  report += '\nTOP 5 WEAKEST CARDS\n';
  report += '-'.repeat(80) + '\n';
  for (let i = allCards.length - 1; i >= Math.max(0, allCards.length - 5); i--) {
    const card = allCards[i];
    report += `${allCards.length - i}. ${card.name} (${card.setName} #${card.cardNumber})\n`;
    report += `   Pokemon #${card.pokemonNumber} | Stage: ${card.stage} | HP: ${card.hp}\n`;
    report += `   Attacks: ${card.attacks} | Ability: ${card.hasAbility ? 'Yes' : 'No'}\n`;
    report += `   Total Strength: ${card.assessment.balanceScore.toFixed(2)}/100\n`;
    report += `   Category: ${card.assessment.balanceCategory}\n`;
    report += `   Breakdown: HP=${card.assessment.hpStrength.normalized.toFixed(2)}, `;
    report += `Attack=${card.assessment.attackStrength.normalized.toFixed(2)}, `;
    report += `Ability=${card.assessment.abilityStrength.normalized.toFixed(2)}\n\n`;
  }
  
  // Full list
  report += '\n' + '='.repeat(80) + '\n';
  report += 'COMPLETE CARD STRENGTH LIST (Sorted by Strength)\n';
  report += '='.repeat(80) + '\n\n';
  
  allCards.forEach((card, index) => {
    report += `${(index + 1).toString().padStart(3)}. ${card.name.padEnd(20)} `;
    report += `[${card.setName.padEnd(10)} #${card.cardNumber.padStart(3)}] `;
    report += `HP:${card.hp.toString().padStart(3)} `;
    report += `Stage:${card.stage.padEnd(8)} `;
    report += `Str:${card.assessment.balanceScore.toFixed(2).padStart(6)} `;
    report += `(${card.assessment.balanceCategory})\n`;
  });
  
  // Write to file
  const outputPath = path.join(__dirname, 'data', 'cards', 'card-strength-analysis.txt');
  fs.writeFileSync(outputPath, report, 'utf8');
  
  console.log(`Analysis complete! Results written to: ${outputPath}`);
  console.log(`\nTop 5 Strongest:`);
  allCards.slice(0, 5).forEach((card, i) => {
    console.log(`  ${i + 1}. ${card.name} - ${card.assessment.balanceScore.toFixed(2)}/100`);
  });
  console.log(`\nTop 5 Weakest:`);
  allCards.slice(-5).reverse().forEach((card, i) => {
    console.log(`  ${i + 1}. ${card.name} - ${card.assessment.balanceScore.toFixed(2)}/100`);
  });
}

main();

