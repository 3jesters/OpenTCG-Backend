import { PreconditionType } from '../enums/precondition-type.enum';
import {
  AttackPrecondition,
  CoinFlipValue,
  DamageCheckValue,
  EnergyCheckValue,
} from '../value-objects/attack-precondition.value-object';

/**
 * Attack Precondition Validator
 * Validates that preconditions are well-formed and contain valid data
 */
export class AttackPreconditionValidator {
  /**
   * Validate a precondition
   * @param precondition The precondition to validate
   * @returns true if valid, false otherwise
   * @throws Error with descriptive message if validation fails
   */
  static validate(precondition: AttackPrecondition): boolean {
    if (!precondition) {
      throw new Error('Precondition is required');
    }

    if (!precondition.type) {
      throw new Error('Precondition type is required');
    }

    if (!precondition.description || precondition.description.trim() === '') {
      throw new Error('Precondition description is required');
    }

    switch (precondition.type) {
      case PreconditionType.COIN_FLIP:
        return this.validateCoinFlip(precondition.value as CoinFlipValue);
      case PreconditionType.DAMAGE_CHECK:
        return this.validateDamageCheck(precondition.value as DamageCheckValue);
      case PreconditionType.ENERGY_CHECK:
        return this.validateEnergyCheck(precondition.value as EnergyCheckValue);
      default:
        throw new Error(`Unknown precondition type: ${precondition.type}`);
    }
  }

  /**
   * Validate coin flip precondition
   */
  private static validateCoinFlip(value?: CoinFlipValue): boolean {
    if (!value) {
      throw new Error('Coin flip value is required');
    }

    if (!value.numberOfCoins || typeof value.numberOfCoins !== 'number') {
      throw new Error('Number of coins is required and must be a number');
    }

    if (value.numberOfCoins < 1) {
      throw new Error('Number of coins must be at least 1');
    }

    if (value.numberOfCoins > 10) {
      throw new Error('Number of coins cannot exceed 10');
    }

    if (!Number.isInteger(value.numberOfCoins)) {
      throw new Error('Number of coins must be an integer');
    }

    return true;
  }

  /**
   * Validate damage check precondition
   */
  private static validateDamageCheck(value?: DamageCheckValue): boolean {
    if (!value) {
      throw new Error('Damage check value is required');
    }

    if (!value.condition) {
      throw new Error('Damage check condition is required');
    }

    const validConditions = ['has_damage', 'no_damage', 'minimum_damage'];
    if (!validConditions.includes(value.condition)) {
      throw new Error(
        `Invalid damage check condition: ${value.condition}. Must be one of: ${validConditions.join(', ')}`,
      );
    }

    if (value.condition === 'minimum_damage') {
      if (value.minimumDamage === undefined || value.minimumDamage === null) {
        throw new Error(
          'Minimum damage is required when condition is "minimum_damage"',
        );
      }

      if (typeof value.minimumDamage !== 'number') {
        throw new Error('Minimum damage must be a number');
      }

      if (value.minimumDamage < 1) {
        throw new Error('Minimum damage must be at least 1');
      }

      if (!Number.isInteger(value.minimumDamage)) {
        throw new Error('Minimum damage must be an integer');
      }
    }

    return true;
  }

  /**
   * Validate energy check precondition
   */
  private static validateEnergyCheck(value?: EnergyCheckValue): boolean {
    if (!value) {
      throw new Error('Energy check value is required');
    }

    if (!value.energyType) {
      throw new Error('Energy type is required');
    }

    if (value.minimum === undefined || value.minimum === null) {
      throw new Error('Minimum energy count is required');
    }

    if (typeof value.minimum !== 'number') {
      throw new Error('Minimum energy count must be a number');
    }

    if (value.minimum < 1) {
      throw new Error('Minimum energy count must be at least 1');
    }

    if (!Number.isInteger(value.minimum)) {
      throw new Error('Minimum energy count must be an integer');
    }

    return true;
  }

  /**
   * Validate multiple preconditions
   * @param preconditions Array of preconditions to validate
   * @returns true if all are valid
   * @throws Error if any validation fails
   */
  static validateAll(preconditions: AttackPrecondition[]): boolean {
    if (!Array.isArray(preconditions)) {
      throw new Error('Preconditions must be an array');
    }

    preconditions.forEach((precondition, index) => {
      try {
        this.validate(precondition);
      } catch (error) {
        throw new Error(
          `Precondition at index ${index} is invalid: ${error.message}`,
        );
      }
    });

    return true;
  }
}

