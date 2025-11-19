import { TrainerEffectType } from '../enums/trainer-effect-type.enum';
import { TargetType } from '../enums/target-type.enum';

/**
 * Trainer Effect Value Object
 * Represents a structured effect of a Trainer card
 */
export class TrainerEffect {
  constructor(
    public readonly effectType: TrainerEffectType,
    public readonly target: TargetType,
    public readonly value?: number | string, // Amount (e.g., "2" for draw 2 cards, "20" for heal 20 HP)
    public readonly cardType?: string, // Type of card to search/retrieve (e.g., "Energy", "Pokemon")
    public readonly condition?: string, // Any conditions or restrictions
    public readonly description?: string, // Human-readable description
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.effectType) {
      throw new Error('Effect type is required');
    }

    if (!Object.values(TrainerEffectType).includes(this.effectType)) {
      throw new Error(`Invalid effect type: ${this.effectType}`);
    }

    if (!this.target) {
      throw new Error('Target is required');
    }

    if (!Object.values(TargetType).includes(this.target)) {
      throw new Error(`Invalid target: ${this.target}`);
    }

    // Validate specific effect type requirements
    this.validateEffectRequirements();
  }

  private validateEffectRequirements(): void {
    switch (this.effectType) {
      case TrainerEffectType.DRAW_CARDS:
      case TrainerEffectType.HEAL:
      case TrainerEffectType.INCREASE_DAMAGE:
      case TrainerEffectType.REDUCE_DAMAGE:
      case TrainerEffectType.LOOK_AT_DECK:
        if (this.value === undefined) {
          throw new Error(`${this.effectType} requires a value`);
        }
        break;

      case TrainerEffectType.SEARCH_DECK:
      case TrainerEffectType.RETRIEVE_FROM_DISCARD:
      case TrainerEffectType.RETRIEVE_ENERGY:
        if (!this.cardType) {
          throw new Error(`${this.effectType} requires a cardType`);
        }
        break;
    }
  }

  /**
   * Get human-readable description of the effect
   */
  getDescription(): string {
    if (this.description) {
      return this.description;
    }

    // Generate description based on effect type
    switch (this.effectType) {
      case TrainerEffectType.DRAW_CARDS:
        return `Draw ${this.value} card(s)`;
      case TrainerEffectType.HEAL:
        return `Remove up to ${this.value} damage counter(s)`;
      case TrainerEffectType.SEARCH_DECK:
        return `Search your deck for a ${this.cardType} card`;
      case TrainerEffectType.SWITCH_ACTIVE:
        return `Switch your Active Pokémon`;
      case TrainerEffectType.CURE_STATUS:
        return `Remove all status conditions`;
      default:
        return this.effectType;
    }
  }

  /**
   * Check if effect has a numeric value
   */
  hasValue(): boolean {
    return this.value !== undefined && this.value !== null;
  }

  /**
   * Get numeric value (if applicable)
   */
  getNumericValue(): number {
    if (typeof this.value === 'number') {
      return this.value;
    }
    if (typeof this.value === 'string') {
      const parsed = parseInt(this.value, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return 0;
  }

  /**
   * Check if effect requires a cost
   */
  requiresCost(): boolean {
    const effectsWithCost = [
      TrainerEffectType.DISCARD_HAND,
      TrainerEffectType.DISCARD_ENERGY,
      TrainerEffectType.TRADE_CARDS,
    ];
    return effectsWithCost.includes(this.effectType);
  }

  equals(other: TrainerEffect): boolean {
    return (
      this.effectType === other.effectType &&
      this.target === other.target &&
      this.value === other.value &&
      this.cardType === other.cardType
    );
  }
}

