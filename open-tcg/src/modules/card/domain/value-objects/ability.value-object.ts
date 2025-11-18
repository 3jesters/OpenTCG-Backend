import { AbilityActivationType } from '../enums/ability-activation-type.enum';
import { GameEventType } from '../enums/game-event-type.enum';
import { AbilityEffectType } from '../enums/ability-effect-type.enum';
import { UsageLimit } from '../enums/usage-limit.enum';
import { AbilityEffectValidator } from '../services/ability-effect.validator';
import type { AbilityEffect } from './ability-effect.value-object';

/**
 * Ability Value Object
 * Represents a Pokémon's passive, triggered, or activated ability
 */
export class Ability {
  constructor(
    public readonly name: string,
    public readonly text: string,
    public readonly activationType: AbilityActivationType,
    public readonly effects: AbilityEffect[],
    public readonly triggerEvent?: GameEventType,
    public readonly usageLimit?: UsageLimit,
  ) {
    this.validate();
  }

  private validate(): void {
    // Basic validation
    if (!this.name || this.name.trim() === '') {
      throw new Error('Ability name is required');
    }
    if (!this.text || this.text.trim() === '') {
      throw new Error('Ability text is required');
    }
    if (!this.activationType) {
      throw new Error('Activation type is required');
    }

    // Validate activation type
    if (
      !Object.values(AbilityActivationType).includes(this.activationType)
    ) {
      throw new Error(`Invalid activation type: ${this.activationType}`);
    }

    // Triggered abilities must have a trigger event
    if (
      this.activationType === AbilityActivationType.TRIGGERED &&
      !this.triggerEvent
    ) {
      throw new Error('Triggered abilities must specify a trigger event');
    }

    // Validate trigger event if present
    if (this.triggerEvent) {
      if (!Object.values(GameEventType).includes(this.triggerEvent)) {
        throw new Error(`Invalid trigger event: ${this.triggerEvent}`);
      }

      // Only triggered abilities should have trigger events
      if (this.activationType !== AbilityActivationType.TRIGGERED) {
        throw new Error(
          'Only TRIGGERED abilities can have a trigger event',
        );
      }
    }

    // Validate usage limit if present
    if (this.usageLimit) {
      if (!Object.values(UsageLimit).includes(this.usageLimit)) {
        throw new Error(`Invalid usage limit: ${this.usageLimit}`);
      }

      // Usage limits are most common for ACTIVATED abilities
      if (this.activationType === AbilityActivationType.PASSIVE) {
        throw new Error('PASSIVE abilities should not have usage limits');
      }
    }

    // Validate effects
    if (!this.effects || this.effects.length === 0) {
      throw new Error('Ability must have at least one effect');
    }

    try {
      AbilityEffectValidator.validateAll(this.effects);
    } catch (error) {
      throw new Error(
        `Ability "${this.name}" has invalid effects: ${error.message}`,
      );
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Check if ability is passive (always active)
   */
  isPassive(): boolean {
    return this.activationType === AbilityActivationType.PASSIVE;
  }

  /**
   * Check if ability is triggered (activates on game events)
   */
  isTriggered(): boolean {
    return this.activationType === AbilityActivationType.TRIGGERED;
  }

  /**
   * Check if ability is activated (player chooses to use)
   */
  isActivated(): boolean {
    return this.activationType === AbilityActivationType.ACTIVATED;
  }

  /**
   * Check if ability has effects
   */
  hasEffects(): boolean {
    return !!this.effects && this.effects.length > 0;
  }

  /**
   * Get effects of a specific type
   */
  getEffectsByType(type: AbilityEffectType): AbilityEffect[] {
    if (!this.effects) {
      return [];
    }
    return this.effects.filter((e) => e.effectType === type);
  }

  /**
   * Check if ability can be used (considering usage limits)
   * Note: This is a simple check. Full implementation would need game state.
   */
  canBeUsed(): boolean {
    // Passive abilities are always "active"
    if (this.isPassive()) {
      return true;
    }

    // Triggered abilities depend on game events (would need game state)
    if (this.isTriggered()) {
      return true; // Placeholder - would check if trigger event occurred
    }

    // Activated abilities depend on usage limits (would need game state)
    if (this.isActivated()) {
      // Would check:
      // - If once_per_turn: has it been used this turn?
      // - If unlimited: always return true
      return true; // Placeholder
    }

    return false;
  }

  /**
   * Get a human-readable description of when this ability activates
   */
  getActivationDescription(): string {
    switch (this.activationType) {
      case AbilityActivationType.PASSIVE:
        return 'Always active';
      case AbilityActivationType.TRIGGERED:
        return `Activates ${this.getTriggerDescription()}`;
      case AbilityActivationType.ACTIVATED:
        const limit = this.usageLimit === UsageLimit.ONCE_PER_TURN ? 'Once per turn' : '';
        return limit ? `${limit} - Player activates` : 'Player activates';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get human-readable trigger description
   */
  private getTriggerDescription(): string {
    if (!this.triggerEvent) {
      return '';
    }

    const descriptions: Record<GameEventType, string> = {
      [GameEventType.WHEN_PLAYED]: 'when played',
      [GameEventType.WHEN_DAMAGED]: 'when damaged',
      [GameEventType.WHEN_ATTACKING]: 'when attacking',
      [GameEventType.WHEN_DEFENDING]: 'when defending',
      [GameEventType.BETWEEN_TURNS]: 'between turns',
      [GameEventType.WHEN_KNOCKED_OUT]: 'when knocked out',
      [GameEventType.START_OF_TURN]: 'at the start of your turn',
      [GameEventType.END_OF_TURN]: 'at the end of your turn',
    };

    return descriptions[this.triggerEvent] || 'unknown';
  }

  /**
   * Check equality with another ability
   */
  equals(other: Ability): boolean {
    return (
      this.name === other.name &&
      this.text === other.text &&
      this.activationType === other.activationType &&
      this.triggerEvent === other.triggerEvent
    );
  }
}
