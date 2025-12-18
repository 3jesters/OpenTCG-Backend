import { EnergyType } from '../enums/energy-type.enum';
import { PreconditionType } from '../enums/precondition-type.enum';

/**
 * Coin Flip Precondition Value
 * Represents a coin flip requirement for an attack
 */
export interface CoinFlipValue {
  numberOfCoins: number; // Number of coins to flip (typically 1-10)
}

/**
 * Damage Check Precondition Value
 * Represents a damage counter requirement for using an attack
 */
export interface DamageCheckValue {
  condition: 'has_damage' | 'no_damage' | 'minimum_damage';
  minimumDamage?: number; // Required if condition is 'minimum_damage'
}

/**
 * Energy Check Precondition Value
 * Represents an energy requirement beyond the attack cost
 */
export interface EnergyCheckValue {
  energyType: EnergyType;
  minimum: number; // Minimum number of that energy type required
}

/**
 * Attack Precondition
 * Represents conditions that must be met/checked before attack executes
 */
export interface AttackPrecondition {
  type: PreconditionType;
  value?: CoinFlipValue | DamageCheckValue | EnergyCheckValue;
  description: string; // Human-readable description
}

/**
 * Type-safe precondition creators
 * Helper functions to create preconditions with proper typing
 */
export class AttackPreconditionFactory {
  static coinFlip(
    numberOfCoins: number,
    description: string,
  ): AttackPrecondition {
    return {
      type: PreconditionType.COIN_FLIP,
      value: { numberOfCoins },
      description,
    };
  }

  static damageCheck(
    condition: 'has_damage' | 'no_damage' | 'minimum_damage',
    description: string,
    minimumDamage?: number,
  ): AttackPrecondition {
    return {
      type: PreconditionType.DAMAGE_CHECK,
      value: { condition, minimumDamage },
      description,
    };
  }

  static energyCheck(
    energyType: EnergyType,
    minimum: number,
    description: string,
  ): AttackPrecondition {
    return {
      type: PreconditionType.ENERGY_CHECK,
      value: { energyType, minimum },
      description,
    };
  }
}
