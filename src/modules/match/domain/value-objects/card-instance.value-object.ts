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
    public readonly damageCounters: number, // Number of damage counters
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
    if (this.damageCounters < 0) {
      throw new Error('Damage counters cannot be negative');
    }
  }

  /**
   * Check if this Pokemon is knocked out
   */
  isKnockedOut(): boolean {
    return this.currentHp <= 0 || this.damageCounters >= this.maxHp;
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
      this.damageCounters,
    );
  }

  /**
   * Create a new CardInstance with updated damage counters
   */
  withDamageCounters(damage: number): CardInstance {
    return new CardInstance(
      this.instanceId,
      this.cardId,
      this.position,
      this.currentHp,
      this.maxHp,
      this.attachedEnergy,
      this.statusEffect,
      damage,
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
      this.damageCounters,
    );
  }

  /**
   * Create a new CardInstance with updated status effect
   */
  withStatusEffect(status: StatusEffect): CardInstance {
    return new CardInstance(
      this.instanceId,
      this.cardId,
      this.position,
      this.currentHp,
      this.maxHp,
      this.attachedEnergy,
      status,
      this.damageCounters,
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
      this.damageCounters,
    );
  }

  /**
   * Check equality with another CardInstance
   */
  equals(other: CardInstance): boolean {
    return this.instanceId === other.instanceId;
  }
}

