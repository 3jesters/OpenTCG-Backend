import { EnergyType } from '../enums/energy-type.enum';

/**
 * Energy Provision Value Object
 * Represents how much and what type of energy a card provides
 */
export class EnergyProvision {
  constructor(
    public readonly energyTypes: EnergyType[], // Types of energy provided
    public readonly amount: number, // Amount of energy provided (usually 1, but 2 for DCE)
    public readonly isSpecial: boolean, // Is this a special energy card?
    public readonly restrictions?: string[], // Restrictions on use (e.g., "Can't be used for Pokémon Powers")
    public readonly additionalEffects?: string, // Any additional effects
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.energyTypes || this.energyTypes.length === 0) {
      throw new Error('At least one energy type is required');
    }

    for (const type of this.energyTypes) {
      if (!Object.values(EnergyType).includes(type)) {
        throw new Error(`Invalid energy type: ${type}`);
      }
    }

    if (this.amount === undefined || this.amount < 1) {
      throw new Error('Energy amount must be at least 1');
    }

    // Special energy cards that provide more than 1 energy or have restrictions/effects
    if (
      this.amount > 1 ||
      (this.restrictions && this.restrictions.length > 0) ||
      this.additionalEffects
    ) {
      if (!this.isSpecial) {
        throw new Error(
          'Energy cards with multiple energy, restrictions, or effects must be marked as special',
        );
      }
    }
  }

  /**
   * Check if this is a basic energy card
   */
  isBasicEnergy(): boolean {
    return (
      !this.isSpecial &&
      this.amount === 1 &&
      this.energyTypes.length === 1 &&
      !this.restrictions &&
      !this.additionalEffects
    );
  }

  /**
   * Get the primary energy type
   */
  getPrimaryType(): EnergyType {
    return this.energyTypes[0];
  }

  /**
   * Check if provides a specific energy type
   */
  providesType(type: EnergyType): boolean {
    return this.energyTypes.includes(type);
  }

  /**
   * Check if provides colorless energy
   */
  providesColorless(): boolean {
    return this.energyTypes.includes(EnergyType.COLORLESS);
  }

  /**
   * Get total energy provided
   */
  getTotalEnergy(): number {
    return this.amount;
  }

  /**
   * Check if has restrictions
   */
  hasRestrictions(): boolean {
    return !!this.restrictions && this.restrictions.length > 0;
  }

  /**
   * Check if has additional effects
   */
  hasAdditionalEffects(): boolean {
    return !!this.additionalEffects && this.additionalEffects.trim() !== '';
  }

  /**
   * Get human-readable description
   */
  getDescription(): string {
    const typeStr = this.energyTypes.join(' or ');
    const amountStr = this.amount > 1 ? `${this.amount} ${typeStr}` : typeStr;

    let desc = `Provides ${amountStr} Energy`;

    if (this.restrictions && this.restrictions.length > 0) {
      desc += `. Restrictions: ${this.restrictions.join(', ')}`;
    }

    if (this.additionalEffects) {
      desc += `. ${this.additionalEffects}`;
    }

    return desc;
  }

  equals(other: EnergyProvision): boolean {
    return (
      JSON.stringify(this.energyTypes) === JSON.stringify(other.energyTypes) &&
      this.amount === other.amount &&
      this.isSpecial === other.isSpecial
    );
  }
}

