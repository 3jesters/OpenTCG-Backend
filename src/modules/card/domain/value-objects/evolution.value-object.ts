import { EvolutionStage } from '../enums';

/**
 * Evolution Value Object
 * Represents an evolution relationship with optional condition
 */
export class Evolution {
  constructor(
    public readonly pokemonNumber: string, // e.g., "025" (Pikachu's Pokédex number)
    public readonly stage: EvolutionStage,
    public readonly name?: string, // Name of the Pokémon (e.g., "Pikachu")
    public readonly condition?: string, // e.g., "Dark", "Light", "Water Stone", etc.
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.pokemonNumber || this.pokemonNumber.trim() === '') {
      throw new Error('Pokemon number is required for evolution');
    }
    if (!this.stage) {
      throw new Error('Evolution stage is required');
    }
  }

  hasCondition(): boolean {
    return !!this.condition;
  }

  equals(other: Evolution): boolean {
    return (
      this.pokemonNumber === other.pokemonNumber &&
      this.stage === other.stage &&
      this.name === other.name &&
      this.condition === other.condition
    );
  }
}

