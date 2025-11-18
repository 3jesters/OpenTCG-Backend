import { EnergyType } from '../enums';

/**
 * Weakness Value Object
 * Represents a Pokémon's weakness to a specific energy type
 */
export class Weakness {
  constructor(
    public readonly type: EnergyType,
    public readonly modifier: string, // e.g., "×2", "+20", "+30"
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.type) {
      throw new Error('Weakness type is required');
    }
    if (!this.modifier || this.modifier.trim() === '') {
      throw new Error('Weakness modifier is required');
    }
    // Validate modifier format (×2, +20, etc.)
    if (!this.modifier.match(/^[×+]\d+$/)) {
      throw new Error('Weakness modifier must be in format ×2, +20, etc.');
    }
  }

  equals(other: Weakness): boolean {
    return this.type === other.type && this.modifier === other.modifier;
  }
}

