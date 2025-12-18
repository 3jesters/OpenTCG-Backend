import {
  CoinFlipConfiguration,
  CoinFlipCountType,
  VariableCoinCountSource,
  DamageCalculationType,
} from '../value-objects/coin-flip-configuration.value-object';
import { CoinFlipResult } from '../value-objects/coin-flip-result.value-object';
import { PlayerGameState } from '../value-objects/player-game-state.value-object';
import { EnergyType } from '../../../card/domain/enums';

/**
 * Coin Flip Resolver Service
 * Handles coin flip resolution with deterministic pseudo-random results
 */
export class CoinFlipResolverService {
  /**
   * Calculate the number of coins to flip based on configuration
   */
  calculateCoinCount(
    configuration: CoinFlipConfiguration,
    playerState: PlayerGameState,
    activePokemon?: {
      attachedEnergy: string[];
      currentHp: number;
      maxHp: number;
    } | null,
  ): number {
    switch (configuration.countType) {
      case CoinFlipCountType.FIXED:
        return configuration.fixedCount || 1;

      case CoinFlipCountType.UNTIL_TAILS:
        // We'll flip until tails, but need a max limit (e.g., 10)
        return 10; // Maximum flips before forcing tails

      case CoinFlipCountType.VARIABLE:
        return this.calculateVariableCount(
          configuration.variableSource!,
          configuration.energyType,
          playerState,
          activePokemon,
        );

      default:
        return 1;
    }
  }

  /**
   * Calculate variable coin count based on source
   */
  private calculateVariableCount(
    source: VariableCoinCountSource,
    energyType: EnergyType | undefined,
    playerState: PlayerGameState,
    activePokemon?: {
      attachedEnergy: string[];
      currentHp: number;
      maxHp: number;
    } | null,
  ): number {
    switch (source) {
      case VariableCoinCountSource.ENERGY_ATTACHED:
        return activePokemon?.attachedEnergy.length || 0;

      case VariableCoinCountSource.ENERGY_TYPE_ATTACHED:
        if (!energyType || !activePokemon) return 0;
        // Count energy cards of specific type
        // For now, simplified - would need to check card types
        return activePokemon.attachedEnergy.length; // TODO: Filter by energy type

      case VariableCoinCountSource.BENCH_POKEMON:
        return playerState.bench.length;

      case VariableCoinCountSource.DAMAGE_COUNTERS:
        if (!activePokemon) return 0;
        const damage = activePokemon.maxHp - activePokemon.currentHp;
        return Math.floor(damage / 10); // Each 10 HP = 1 damage counter

      case VariableCoinCountSource.HAND_SIZE:
        return playerState.hand.length;

      default:
        return 1;
    }
  }

  /**
   * Generate a deterministic coin flip result
   * Uses a seeded PRNG based on match ID, turn number, action ID, and flip index
   */
  generateCoinFlip(
    matchId: string,
    turnNumber: number,
    actionId: string,
    flipIndex: number,
  ): CoinFlipResult {
    // Create a deterministic seed from match ID, turn, action, and flip index
    const seed = this.generateSeed(matchId, turnNumber, actionId, flipIndex);

    // Use a simple linear congruential generator for deterministic randomness
    const random = this.seededRandom(seed);

    // Generate heads (true) or tails (false)
    const result = random() >= 0.5 ? 'heads' : 'tails';

    return new CoinFlipResult(flipIndex, result, seed);
  }

  /**
   * Generate a seed from match context
   */
  private generateSeed(
    matchId: string,
    turnNumber: number,
    actionId: string,
    flipIndex: number,
  ): number {
    // Combine all factors into a seed
    const seedString = `${matchId}-${turnNumber}-${actionId}-${flipIndex}`;
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
      const char = seedString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Seeded random number generator (Linear Congruential Generator)
   * Returns a function that generates pseudo-random numbers between 0 and 1
   */
  private seededRandom(seed: number): () => number {
    // LCG parameters (same as used in many PRNG implementations)
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    let state = seed % m;

    return () => {
      state = (a * state + c) % m;
      return state / m;
    };
  }

  /**
   * Calculate damage based on coin flip results and configuration
   */
  calculateDamage(
    configuration: CoinFlipConfiguration,
    results: CoinFlipResult[],
    baseDamage: number,
  ): number {
    const headsCount = results.filter((r) => r.isHeads()).length;
    const hasTails = results.some((r) => r.isTails());

    switch (configuration.damageCalculationType) {
      case DamageCalculationType.BASE_DAMAGE:
        // If tails, attack does nothing (0 damage)
        // If heads, use base damage
        return hasTails ? 0 : baseDamage;

      case DamageCalculationType.MULTIPLY_BY_HEADS:
        // Damage = damagePerHead × number of heads
        return (configuration.damagePerHead || 0) * headsCount;

      case DamageCalculationType.CONDITIONAL_BONUS:
        // Base damage + bonus if condition met (e.g., if heads)
        if (hasTails) {
          return baseDamage; // Base damage even on tails
        }
        return baseDamage + (configuration.conditionalBonus || 0);

      case DamageCalculationType.CONDITIONAL_SELF_DAMAGE:
        // Base damage, but self-damage on tails (handled separately)
        return baseDamage;

      case DamageCalculationType.STATUS_EFFECT_ONLY:
        // Damage always applies, coin flip only affects status effect
        return baseDamage;

      default:
        return baseDamage;
    }
  }

  /**
   * Check if attack should proceed based on coin flip results
   * Some attacks do nothing on tails
   */
  shouldAttackProceed(
    configuration: CoinFlipConfiguration,
    results: CoinFlipResult[],
  ): boolean {
    // If we have a BASE_DAMAGE type and tails appeared, attack does nothing
    if (
      configuration.damageCalculationType ===
        DamageCalculationType.BASE_DAMAGE &&
      results.some((r) => r.isTails())
    ) {
      return false;
    }
    // STATUS_EFFECT_ONLY always proceeds (damage always applies)
    if (
      configuration.damageCalculationType ===
      DamageCalculationType.STATUS_EFFECT_ONLY
    ) {
      return true;
    }
    return true;
  }
}
