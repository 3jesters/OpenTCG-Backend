/**
 * Ability Effect (Placeholder)
 * Will be expanded later to handle structured ability effects
 */
export interface AbilityEffect {
  effectType: string; // Placeholder for effect types
  value?: any; // Effect parameters (to be defined)
  condition?: string; // When effect triggers
}

/**
 * Ability Value Object
 * Represents a Pokémon's passive or triggered ability
 * (Placeholder - will be expanded with game mechanics)
 */
export class Ability {
  constructor(
    public readonly name: string,
    public readonly text: string, // Human-readable ability description
    public readonly effects?: AbilityEffect[], // Structured effects (placeholder)
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.name || this.name.trim() === '') {
      throw new Error('Ability name is required');
    }
    if (!this.text || this.text.trim() === '') {
      throw new Error('Ability text is required');
    }
  }

  equals(other: Ability): boolean {
    return this.name === other.name && this.text === other.text;
  }
}

