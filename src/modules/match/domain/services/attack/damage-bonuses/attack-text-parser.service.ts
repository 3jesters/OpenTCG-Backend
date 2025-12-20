import { Injectable } from '@nestjs/common';
import type {
  StatusConditionEffect,
} from '../../../../../card/domain/value-objects/attack-effect.value-object';
import { AttackEffectFactory } from '../../../../../card/domain/value-objects/attack-effect.value-object';
import { ConditionFactory } from '../../../../../card/domain/value-objects/condition.value-object';

/**
 * Attack Text Parser Service
 * Parses attack text to extract status effects, damage patterns, and other attack properties
 */
@Injectable()
export class AttackTextParserService {
  /**
   * Parse status effect from attack text
   * Returns a StatusConditionEffect if the attack text mentions a status condition
   */
  parseStatusEffectFromAttackText(
    attackText: string,
    isStatusEffectOnly: boolean,
  ): StatusConditionEffect | null {
    if (!attackText) {
      return null;
    }

    const text = attackText.toLowerCase();

    // Check for status conditions in the text
    let statusCondition:
      | 'PARALYZED'
      | 'POISONED'
      | 'BURNED'
      | 'ASLEEP'
      | 'CONFUSED'
      | null = null;

    if (text.includes('confused')) {
      statusCondition = 'CONFUSED';
    } else if (text.includes('poisoned')) {
      statusCondition = 'POISONED';
    } else if (text.includes('paralyzed')) {
      statusCondition = 'PARALYZED';
    } else if (text.includes('asleep') || text.includes('sleep')) {
      statusCondition = 'ASLEEP';
    } else if (text.includes('burned') || text.includes('burn')) {
      statusCondition = 'BURNED';
    }

    if (!statusCondition) {
      return null;
    }

    // For STATUS_EFFECT_ONLY attacks, check if coin flip is required
    // Pattern: "Flip a coin. If heads, the Defending Pokémon is now [Status]."
    if (
      isStatusEffectOnly &&
      (text.includes('if heads') || text.includes('if tails'))
    ) {
      const condition = text.includes('if heads')
        ? ConditionFactory.coinFlipSuccess()
        : ConditionFactory.coinFlipFailure();

      return AttackEffectFactory.statusCondition(statusCondition, [condition]);
    }

    // For attacks without coin flip requirement, apply always
    return AttackEffectFactory.statusCondition(statusCondition);
  }

  /**
   * Parse self-damage from attack text
   * Example: "Magnemite does 40 damage to itself"
   */
  parseSelfDamage(attackText: string, pokemonName: string): number {
    const text = attackText.toLowerCase();
    const nameLower = pokemonName.toLowerCase();

    // Pattern: "[Pokemon] does X damage to itself"
    const selfDamageMatch = text.match(
      new RegExp(
        `${nameLower}\\s+does\\s+(\\d+)\\s+damage\\s+to\\s+itself`,
        'i',
      ),
    );
    if (selfDamageMatch) {
      return parseInt(selfDamageMatch[1], 10);
    }

    // Alternative pattern: "does X damage to itself" (without Pokemon name)
    const genericMatch = text.match(/does\s+(\d+)\s+damage\s+to\s+itself/i);
    if (genericMatch) {
      return parseInt(genericMatch[1], 10);
    }

    return 0;
  }

  /**
   * Parse bench damage from attack text
   * Example: "Does 10 damage to each Pokémon on each player's Bench"
   */
  parseBenchDamage(attackText: string): number {
    const text = attackText.toLowerCase();

    // Pattern: "Does X damage to each Pokémon on each player's Bench"
    const eachPlayerMatch = text.match(
      /does\s+(\d+)\s+damage\s+to\s+each\s+pokémon\s+on\s+each\s+player'?s?\s+bench/i,
    );
    if (eachPlayerMatch) {
      return parseInt(eachPlayerMatch[1], 10);
    }

    // Pattern: "Does X damage to each of your opponent's Benched Pokémon"
    const opponentBenchMatch = text.match(
      /does\s+(\d+)\s+damage\s+to\s+each\s+of\s+your\s+opponent'?s?\s+benched\s+pokémon/i,
    );
    if (opponentBenchMatch) {
      return parseInt(opponentBenchMatch[1], 10);
    }

    // Pattern: "Does X damage to each Pokémon on [player]'s Bench"
    const benchMatch = text.match(
      /does\s+(\d+)\s+damage\s+to\s+each\s+pokémon\s+on\s+.*bench/i,
    );
    if (benchMatch) {
      return parseInt(benchMatch[1], 10);
    }

    return 0;
  }

  /**
   * Parse minus damage reduction from attack text
   * Example: "Does 50 damage minus 10 damage for each damage counter on Machoke"
   * Returns: { reductionPerCounter: number, target: 'self' | 'defending' } | null
   */
  parseMinusDamageReduction(
    attackText: string,
    attackerName: string,
  ): { reductionPerCounter: number; target: 'self' | 'defending' } | null {
    const text = attackText.toLowerCase();
    const attackerNameLower = attackerName.toLowerCase();

    // Pattern: "minus X damage for each damage counter on [Pokemon]"
    const minusMatch = text.match(
      /minus\s+(\d+)\s+damage\s+for\s+each\s+damage\s+counter\s+on\s+(\w+)/i,
    );
    if (minusMatch) {
      const reductionPerCounter = parseInt(minusMatch[1], 10);
      const targetPokemonName = minusMatch[2].toLowerCase();

      // Determine if target is self (attacker) or defending
      const target =
        targetPokemonName === attackerNameLower ? 'self' : 'defending';

      return {
        reductionPerCounter,
        target,
      };
    }

    return null;
  }
}

