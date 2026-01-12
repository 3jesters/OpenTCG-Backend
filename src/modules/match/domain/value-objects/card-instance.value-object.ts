import { StatusEffect, PokemonPosition } from '../enums';

/**
 * Card Instance Value Object
 * Represents a card that is in play (on the field) during a match
 * Immutable value object
 */
export class CardInstance {
  constructor(
    public readonly instanceId: string, // Unique instance ID (UUID)
    public readonly cardId: string, // Card identifier
    public readonly position: PokemonPosition, // Where the card is (active or bench)
    public readonly currentHp: number, // Current HP (can be less than max)
    public readonly maxHp: number, // Maximum HP from card
    public readonly attachedEnergy: string[], // Array of energy card IDs attached
    public readonly statusEffects: StatusEffect[] = [], // Array of status conditions (can have multiple: CONFUSED + POISONED, etc.)
    public readonly evolutionChain: string[] = [], // Array of card IDs that this Pokemon evolved from (for reference)
    public readonly poisonDamageAmount?: number, // Poison damage amount (10 or 20), only set if POISONED
    public readonly evolvedAt?: number, // Turn number when this Pokemon was evolved (undefined if never evolved or evolved in previous turn)
    public readonly paralysisClearsAtTurn?: number, // Turn number when PARALYZED status should be cleared (undefined if not paralyzed)
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.instanceId || this.instanceId.trim().length === 0) {
      throw new Error('Instance ID is required');
    }
    if (!this.cardId || this.cardId.trim().length === 0) {
      throw new Error('Card ID is required');
    }
    if (this.currentHp < 0) {
      throw new Error('Current HP cannot be negative');
    }
    if (this.maxHp <= 0) {
      throw new Error('Max HP must be greater than 0');
    }
    if (this.currentHp > this.maxHp) {
      throw new Error('Current HP cannot exceed max HP');
    }
    // Validate statusEffects array
    if (!Array.isArray(this.statusEffects)) {
      throw new Error('statusEffects must be an array');
    }
    // Remove NONE from statusEffects array (NONE is not a real status)
    if (this.statusEffects.includes(StatusEffect.NONE)) {
      throw new Error('NONE cannot be in statusEffects array');
    }
    // Ensure no duplicates
    const uniqueStatuses = new Set(this.statusEffects);
    if (uniqueStatuses.size !== this.statusEffects.length) {
      throw new Error('statusEffects array cannot contain duplicates');
    }
    // Validate poisonDamageAmount
    if (this.poisonDamageAmount !== undefined) {
      if (this.poisonDamageAmount !== 10 && this.poisonDamageAmount !== 20) {
        throw new Error('Poison damage amount must be 10 or 20');
      }
      // If poisonDamageAmount is set, statusEffects should include POISONED
      if (!this.statusEffects.includes(StatusEffect.POISONED)) {
        throw new Error(
          'poisonDamageAmount can only be set when POISONED is in statusEffects',
        );
      }
    }
  }

  /**
   * Check if Pokemon has a specific status effect
   */
  hasStatusEffect(status: StatusEffect): boolean {
    return this.statusEffects.includes(status);
  }

  /**
   * Get primary status effect (for backward compatibility)
   * Returns the first status effect, or NONE if no status effects
   * Priority: ASLEEP > PARALYZED > CONFUSED > POISONED > BURNED
   */
  getPrimaryStatusEffect(): StatusEffect {
    if (this.statusEffects.length === 0) {
      return StatusEffect.NONE;
    }
    // Return highest priority status effect
    const priority = [
      StatusEffect.ASLEEP,
      StatusEffect.PARALYZED,
      StatusEffect.CONFUSED,
      StatusEffect.POISONED,
      StatusEffect.BURNED,
    ];
    for (const status of priority) {
      if (this.statusEffects.includes(status)) {
        return status;
      }
    }
    return this.statusEffects[0]; // Fallback to first status
  }

  /**
   * Get damage counters (computed from HP)
   * Damage counters = maxHp - currentHp
   */
  getDamageCounters(): number {
    return this.maxHp - this.currentHp;
  }

  /**
   * Check if this Pokemon is knocked out
   */
  isKnockedOut(): boolean {
    return this.currentHp <= 0 || this.getDamageCounters() >= this.maxHp;
  }

  /**
   * Get all cards to discard when this Pokemon is knocked out
   * Returns: current card + all evolution chain cards + attached energy cards
   */
  getAllCardsToDiscard(): string[] {
    return [this.cardId, ...this.evolutionChain, ...this.attachedEnergy];
  }

  /**
   * Create a new CardInstance with updated HP
   */
  withHp(newHp: number): CardInstance {
    return new CardInstance(
      this.instanceId,
      this.cardId,
      this.position,
      newHp,
      this.maxHp,
      this.attachedEnergy,
      this.statusEffects,
      this.evolutionChain,
      this.poisonDamageAmount,
      this.evolvedAt,
      this.paralysisClearsAtTurn,
    );
  }

  /**
   * Create a new CardInstance with attached energy
   */
  withAttachedEnergy(energyCardIds: string[]): CardInstance {
    return new CardInstance(
      this.instanceId,
      this.cardId,
      this.position,
      this.currentHp,
      this.maxHp,
      energyCardIds,
      this.statusEffects,
      this.evolutionChain,
      this.poisonDamageAmount,
      this.evolvedAt,
      this.paralysisClearsAtTurn,
    );
  }

  /**
   * Create a new CardInstance with added status effect
   * Adds the status effect to the existing array (does not replace)
   */
  withStatusEffectAdded(
    status: StatusEffect,
    poisonDamageAmount?: number,
    paralysisClearsAtTurn?: number,
  ): CardInstance {
    if (status === StatusEffect.NONE) {
      return this; // Cannot add NONE
    }
    // If status already exists, don't add duplicate
    if (this.statusEffects.includes(status)) {
      return this;
    }
    const newStatusEffects = [...this.statusEffects, status];
    // Update poisonDamageAmount if adding POISONED and amount is provided
    const newPoisonDamageAmount =
      status === StatusEffect.POISONED && poisonDamageAmount !== undefined
        ? poisonDamageAmount
        : this.poisonDamageAmount;
    // Update paralysisClearsAtTurn if adding PARALYZED and turn is provided
    const newParalysisClearsAtTurn =
      status === StatusEffect.PARALYZED && paralysisClearsAtTurn !== undefined
        ? paralysisClearsAtTurn
        : this.paralysisClearsAtTurn;
    return new CardInstance(
      this.instanceId,
      this.cardId,
      this.position,
      this.currentHp,
      this.maxHp,
      this.attachedEnergy,
      newStatusEffects,
      this.evolutionChain,
      newPoisonDamageAmount,
      this.evolvedAt,
      newParalysisClearsAtTurn,
    );
  }

  /**
   * Create a new CardInstance with removed status effect
   */
  withStatusEffectRemoved(status: StatusEffect): CardInstance {
    if (!this.statusEffects.includes(status)) {
      return this; // Status not present, no change
    }
    const newStatusEffects = this.statusEffects.filter((s) => s !== status);
    // Clear poisonDamageAmount if removing POISONED
    const newPoisonDamageAmount =
      status === StatusEffect.POISONED ? undefined : this.poisonDamageAmount;
    // Clear paralysisClearsAtTurn if removing PARALYZED
    const newParalysisClearsAtTurn =
      status === StatusEffect.PARALYZED
        ? undefined
        : this.paralysisClearsAtTurn;
    return new CardInstance(
      this.instanceId,
      this.cardId,
      this.position,
      this.currentHp,
      this.maxHp,
      this.attachedEnergy,
      newStatusEffects,
      this.evolutionChain,
      newPoisonDamageAmount,
      this.evolvedAt,
      newParalysisClearsAtTurn,
    );
  }

  /**
   * Create a new CardInstance with all status effects cleared
   */
  withStatusEffectsCleared(): CardInstance {
    return new CardInstance(
      this.instanceId,
      this.cardId,
      this.position,
      this.currentHp,
      this.maxHp,
      this.attachedEnergy,
      [], // Clear all status effects
      this.evolutionChain,
      undefined, // Clear poison damage amount
      this.evolvedAt,
      undefined, // Clear paralysis clear turn
    );
  }

  /**
   * Create a new CardInstance with updated status effect (backward compatibility)
   * Replaces all status effects with a single status effect
   * @deprecated Use withStatusEffectAdded/Removed instead
   */
  withStatusEffect(
    status: StatusEffect,
    poisonDamageAmount?: number,
  ): CardInstance {
    if (status === StatusEffect.NONE) {
      return this.withStatusEffectsCleared();
    }
    const newStatusEffects = [status];
    return new CardInstance(
      this.instanceId,
      this.cardId,
      this.position,
      this.currentHp,
      this.maxHp,
      this.attachedEnergy,
      newStatusEffects,
      this.evolutionChain,
      poisonDamageAmount,
      this.evolvedAt,
      undefined, // Clear paralysis clear turn when using deprecated method
    );
  }

  /**
   * Create a new CardInstance with updated paralysis clear turn
   */
  withParalysisClearsAtTurn(turnNumber: number | undefined): CardInstance {
    return new CardInstance(
      this.instanceId,
      this.cardId,
      this.position,
      this.currentHp,
      this.maxHp,
      this.attachedEnergy,
      this.statusEffects,
      this.evolutionChain,
      this.poisonDamageAmount,
      this.evolvedAt,
      turnNumber,
    );
  }

  /**
   * Create a new CardInstance with updated position
   */
  withPosition(position: PokemonPosition): CardInstance {
    return new CardInstance(
      this.instanceId,
      this.cardId,
      position,
      this.currentHp,
      this.maxHp,
      this.attachedEnergy,
      this.statusEffects,
      this.evolutionChain,
      this.poisonDamageAmount,
      this.evolvedAt,
      this.paralysisClearsAtTurn,
    );
  }

  /**
   * Create a new CardInstance with updated evolvedAt turn number
   */
  withEvolvedAt(turnNumber: number): CardInstance {
    return new CardInstance(
      this.instanceId,
      this.cardId,
      this.position,
      this.currentHp,
      this.maxHp,
      this.attachedEnergy,
      this.statusEffects,
      this.evolutionChain,
      this.poisonDamageAmount,
      turnNumber,
    );
  }

  /**
   * Check equality with another CardInstance
   */
  equals(other: CardInstance): boolean {
    return this.instanceId === other.instanceId;
  }
}
