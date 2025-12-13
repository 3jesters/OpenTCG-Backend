import { EnergyType } from '../../../card/domain/enums';

/**
 * Coin Flip Count Type
 * Determines how many coins to flip
 */
export enum CoinFlipCountType {
  FIXED = 'FIXED', // Fixed number of coins
  UNTIL_TAILS = 'UNTIL_TAILS', // Flip until tails appears
  VARIABLE = 'VARIABLE', // Variable based on game state
}

/**
 * Variable Coin Count Source
 * What to count for variable coin flips
 */
export enum VariableCoinCountSource {
  ENERGY_ATTACHED = 'ENERGY_ATTACHED', // Count energy cards attached
  ENERGY_TYPE_ATTACHED = 'ENERGY_TYPE_ATTACHED', // Count specific energy type attached
  BENCH_POKEMON = 'BENCH_POKEMON', // Count bench Pokemon
  DAMAGE_COUNTERS = 'DAMAGE_COUNTERS', // Count damage counters
  HAND_SIZE = 'HAND_SIZE', // Count cards in hand
}

/**
 * Damage Calculation Type
 * How to calculate damage based on coin flip results
 */
export enum DamageCalculationType {
  BASE_DAMAGE = 'BASE_DAMAGE', // Use base damage if heads, 0 if tails
  MULTIPLY_BY_HEADS = 'MULTIPLY_BY_HEADS', // Base damage × number of heads
  CONDITIONAL_BONUS = 'CONDITIONAL_BONUS', // Base damage + bonus if condition met
  CONDITIONAL_SELF_DAMAGE = 'CONDITIONAL_SELF_DAMAGE', // Self damage on tails
  STATUS_EFFECT_ONLY = 'STATUS_EFFECT_ONLY', // Damage always applies, coin flip only affects status effect
}

/**
 * Coin Flip Configuration Value Object
 * Defines how coin flips should be executed and how results affect damage
 */
export class CoinFlipConfiguration {
  constructor(
    public readonly countType: CoinFlipCountType,
    public readonly fixedCount?: number, // Required if countType is FIXED
    public readonly variableSource?: VariableCoinCountSource, // Required if countType is VARIABLE
    public readonly energyType?: EnergyType, // Required if variableSource is ENERGY_TYPE_ATTACHED
    public readonly damageCalculationType: DamageCalculationType = DamageCalculationType.BASE_DAMAGE,
    public readonly baseDamage: number = 0, // Base damage value
    public readonly damagePerHead?: number, // Required if MULTIPLY_BY_HEADS
    public readonly conditionalBonus?: number, // Bonus damage if condition met
    public readonly selfDamageOnTails?: number, // Self damage if tails
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.countType === CoinFlipCountType.FIXED && this.fixedCount === undefined) {
      throw new Error('Fixed count is required when countType is FIXED');
    }
    if (this.countType === CoinFlipCountType.FIXED && (this.fixedCount! < 1 || this.fixedCount! > 10)) {
      throw new Error('Fixed count must be between 1 and 10');
    }
    if (this.countType === CoinFlipCountType.VARIABLE && this.variableSource === undefined) {
      throw new Error('Variable source is required when countType is VARIABLE');
    }
    if (
      this.variableSource === VariableCoinCountSource.ENERGY_TYPE_ATTACHED &&
      this.energyType === undefined
    ) {
      throw new Error('Energy type is required when variableSource is ENERGY_TYPE_ATTACHED');
    }
    if (
      this.damageCalculationType === DamageCalculationType.MULTIPLY_BY_HEADS &&
      this.damagePerHead === undefined
    ) {
      throw new Error('Damage per head is required when damageCalculationType is MULTIPLY_BY_HEADS');
    }
  }
}

