import { EnergyType } from '../enums';

/**
 * Resistance Value Object
 * Represents a Pokémon's resistance to a specific energy type
 */
export class Resistance {
  constructor(
    public readonly type: EnergyType,
    public readonly modifier: string, // e.g., "-20", "-30"
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.type) {
      throw new Error('Resistance type is required');
    }
    if (!this.modifier || this.modifier.trim() === '') {
      throw new Error('Resistance modifier is required');
    }
    // Validate modifier format (-20, -30, etc.)
    if (!this.modifier.match(/^-\d+$/)) {
      throw new Error('Resistance modifier must be in format -20, -30, etc.');
    }
  }

  equals(other: Resistance): boolean {
    return this.type === other.type && this.modifier === other.modifier;
  }
}

