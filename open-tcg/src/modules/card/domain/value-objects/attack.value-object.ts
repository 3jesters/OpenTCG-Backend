import { EnergyType } from '../enums';
import { PreconditionType } from '../enums/precondition-type.enum';
import { AttackPrecondition } from './attack-precondition.value-object';
import { AttackPreconditionValidator } from '../services/attack-precondition.validator';

/**
 * Attack Effect (Placeholder)
 * Will be expanded later to handle structured attack effects
 */
export interface AttackEffect {
  effectType: string; // Placeholder for effect types
  value?: any; // Effect parameters (to be defined)
  condition?: string; // When effect applies
}

/**
 * Attack Value Object
 * Represents a Pokémon's attack with energy cost, damage, and effects
 */
export class Attack {
  constructor(
    public readonly name: string,
    public readonly energyCost: EnergyType[], // Array of energy types required
    public readonly damage: string, // e.g., "90", "30+", "20×", "" (for non-damage)
    public readonly text: string, // Human-readable effect description
    public readonly preconditions?: AttackPrecondition[], // Conditions before attack (e.g., coin flips)
    public readonly effects?: AttackEffect[], // Structured effects (placeholder)
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('Attack name is required');
    }
    if (!Array.isArray(this.energyCost)) {
      throw new Error('Energy cost must be an array');
    }
    if (!this.text || this.text.trim() === '') {
      throw new Error('Attack text is required');
    }
    
    // Validate preconditions if present
    if (this.preconditions && this.preconditions.length > 0) {
      try {
        AttackPreconditionValidator.validateAll(this.preconditions);
      } catch (error) {
        throw new Error(`Attack "${this.name}" has invalid preconditions: ${error.message}`);
      }
    }
  }

  /**
   * Get total energy cost count
   */
  getTotalEnergyCost(): number {
    return this.energyCost.length;
  }

  /**
   * Get count of specific energy type in cost
   */
  getEnergyCountByType(type: EnergyType): number {
    return this.energyCost.filter((e) => e === type).length;
  }

  /**
   * Check if attack deals damage
   */
  dealsDamage(): boolean {
    return this.damage !== null && this.damage !== '';
  }

  /**
   * Check if attack has preconditions
   */
  hasPreconditions(): boolean {
    return !!this.preconditions && this.preconditions.length > 0;
  }

  /**
   * Get preconditions of a specific type
   */
  getPreconditionsByType(type: PreconditionType): AttackPrecondition[] {
    if (!this.preconditions) {
      return [];
    }
    return this.preconditions.filter((p) => p.type === type);
  }

  equals(other: Attack): boolean {
    return (
      this.name === other.name &&
      JSON.stringify(this.energyCost) === JSON.stringify(other.energyCost) &&
      this.damage === other.damage &&
      this.text === other.text
    );
  }
}

