import {
  CoinFlipConfiguration,
  CoinFlipCountType,
  DamageCalculationType,
} from '../../../value-objects/coin-flip-configuration.value-object';

/**
 * Attack Coin Flip Parser Service
 * Parses attack text to detect coin flip patterns and create configurations
 */
export class AttackCoinFlipParserService {
  /**
   * Parse attack text and damage to create coin flip configuration
   * Returns null if no coin flip is detected
   */
  parseCoinFlipFromAttack(
    attackText: string,
    damage: string,
  ): CoinFlipConfiguration | null {
    if (!attackText || !attackText.toLowerCase().includes('flip')) {
      return null;
    }

    const text = attackText.toLowerCase();

    // Pattern 1: "Flip a coin. If tails, this attack does nothing."
    if (
      text.includes('flip a coin') &&
      text.includes('if tails') &&
      text.includes('does nothing')
    ) {
      const baseDamage = this.parseBaseDamage(damage);
      return new CoinFlipConfiguration(
        CoinFlipCountType.FIXED,
        1,
        undefined,
        undefined,
        DamageCalculationType.BASE_DAMAGE,
        baseDamage,
      );
    }

    // Pattern 2: "Flip X coins. This attack does Y damage times the number of heads."
    const multiplyMatch = text.match(
      /flip (\d+) coins?.*does (\d+) damage times the number of heads/i,
    );
    if (multiplyMatch) {
      const coinCount = parseInt(multiplyMatch[1], 10);
      const damagePerHead = parseInt(multiplyMatch[2], 10);
      return new CoinFlipConfiguration(
        CoinFlipCountType.FIXED,
        coinCount,
        undefined,
        undefined,
        DamageCalculationType.MULTIPLY_BY_HEADS,
        0,
        damagePerHead,
      );
    }

    // Pattern 3: "Flip a coin until you get tails. This attack does Y damage times the number of heads."
    if (text.includes('flip a coin until you get tails')) {
      const untilTailsMatch = text.match(
        /does (\d+) damage times the number of heads/i,
      );
      if (untilTailsMatch) {
        const damagePerHead = parseInt(untilTailsMatch[1], 10);
        return new CoinFlipConfiguration(
          CoinFlipCountType.UNTIL_TAILS,
          undefined,
          undefined,
          undefined,
          DamageCalculationType.MULTIPLY_BY_HEADS,
          0,
          damagePerHead,
        );
      }
    }

    // Pattern 4: "Flip a coin. If heads, this attack does X damage plus Y more damage; if tails, this attack does X damage and [Pokemon] does Z damage to itself."
    const conditionalMatch = text.match(
      /if heads.*does (\d+) damage plus (\d+) more damage/i,
    );
    if (conditionalMatch) {
      const baseDamage = parseInt(conditionalMatch[1], 10);
      const bonus = parseInt(conditionalMatch[2], 10);
      const selfDamageMatch = text.match(/does (\d+) damage to itself/i);
      const selfDamage = selfDamageMatch
        ? parseInt(selfDamageMatch[1], 10)
        : undefined;
      return new CoinFlipConfiguration(
        CoinFlipCountType.FIXED,
        1,
        undefined,
        undefined,
        DamageCalculationType.CONDITIONAL_BONUS,
        baseDamage,
        undefined,
        bonus,
        selfDamage,
      );
    }

    // Pattern 5: "Flip a coin. If heads, [effect]. If tails, [effect]." (status effects)
    // These may still have damage, but coin flip determines status effect
    // We still need to create a coin flip configuration so both players can see it
    // Note: text is already lowercase from line 17
    if (
      text.includes('flip a coin') &&
      (text.includes('if heads') || text.includes('if tails'))
    ) {
      // Check if it's status effects (damage may still apply)
      if (
        text.includes('now') &&
        (text.includes('paralyzed') ||
          text.includes('confused') ||
          text.includes('asleep') ||
          text.includes('poisoned'))
      ) {
        // Status effect coin flip - damage always applies, coin flip only determines status
        // Use STATUS_EFFECT_ONLY type (damage always applies, coin flip is for status effect)
        const baseDamage = this.parseBaseDamage(damage);
        return new CoinFlipConfiguration(
          CoinFlipCountType.FIXED,
          1,
          undefined,
          undefined,
          DamageCalculationType.STATUS_EFFECT_ONLY,
          baseDamage,
        );
      }
    }

    // Default: if we detect "flip" but don't match patterns, assume simple coin flip
    if (text.includes('flip a coin')) {
      const baseDamage = this.parseBaseDamage(damage);
      return new CoinFlipConfiguration(
        CoinFlipCountType.FIXED,
        1,
        undefined,
        undefined,
        DamageCalculationType.BASE_DAMAGE,
        baseDamage,
      );
    }

    return null;
  }

  /**
   * Parse base damage from damage string (e.g., "30", "30+", "30×")
   */
  private parseBaseDamage(damage: string): number {
    if (!damage) return 0;
    // Extract numeric part (remove +, ×, etc.)
    const match = damage.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
