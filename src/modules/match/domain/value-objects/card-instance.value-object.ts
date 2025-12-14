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
    public readonly statusEffect: StatusEffect, // Current status condition
    public readonly evolutionChain: string[] = [], // Array of card IDs that this Pokemon evolved from (for reference)
    public readonly poisonDamageAmount?: number, // Poison damage amount (10 or 20), only set if POISONED
    public readonly evolvedAt?: number, // Turn number when this Pokemon was evolved (undefined if never evolved or evolved in previous turn)
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
    if (this.poisonDamageAmount !== undefined) {
      if (this.poisonDamageAmount !== 10 && this.poisonDamageAmount !== 20) {
        throw new Error('Poison damage amount must be 10 or 20');
      }
      // If poisonDamageAmount is set, statusEffect should be POISONED
      if (this.statusEffect !== StatusEffect.POISONED) {
        throw new Error('poisonDamageAmount can only be set when statusEffect is POISONED');
      }
    }
    // If statusEffect is POISONED, poisonDamageAmount should be set (but we allow undefined for backward compatibility)
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
    return [
      this.cardId,
      ...this.evolutionChain,
      ...this.attachedEnergy,
    ];
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
      this.statusEffect,
      this.evolutionChain,
      this.poisonDamageAmount,
      this.evolvedAt,
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
      this.statusEffect,
      this.evolutionChain,
      this.poisonDamageAmount,
      this.evolvedAt,
    );
  }

  /**
   * Create a new CardInstance with updated status effect
   */
  withStatusEffect(status: StatusEffect, poisonDamageAmount?: number): CardInstance {
    return new CardInstance(
      this.instanceId,
      this.cardId,
      this.position,
      this.currentHp,
      this.maxHp,
      this.attachedEnergy,
      status,
      this.evolutionChain,
      poisonDamageAmount, // Set poison damage amount when applying POISONED status
      this.evolvedAt,
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
      this.statusEffect,
      this.evolutionChain,
      this.poisonDamageAmount,
      this.evolvedAt,
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
      this.statusEffect,
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

