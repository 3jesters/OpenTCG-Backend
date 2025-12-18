import { Ability } from '../../domain/value-objects/ability.value-object';
import { AbilityActivationType } from '../../domain/enums/ability-activation-type.enum';
import { LegacyAbilityType } from '../../domain/enums/legacy-ability-type.enum';
import { UsageLimit } from '../../domain/enums/usage-limit.enum';
import { GameEventType } from '../../domain/enums/game-event-type.enum';
import type { AbilityEffect } from '../../domain/value-objects/ability-effect.value-object';

/**
 * Legacy Ability Data
 * Represents ability data from legacy Pokémon cards
 */
export interface LegacyAbilityData {
  name: string;
  text: string;
  legacyType: LegacyAbilityType;
  effects?: AbilityEffect[];
  triggerEvent?: GameEventType;
}

/**
 * Legacy Ability Adapter
 * Converts legacy Pokémon Power, Poké-Body, and Poké-Power to modern Ability format
 *
 * This adapter enables:
 * - Importing historical Pokémon cards
 * - Converting legacy mechanics to modern game engine
 * - Preserving original mechanic names for display
 */
export class LegacyAbilityAdapter {
  /**
   * Convert legacy ability data to modern Ability
   */
  static toAbility(legacyData: LegacyAbilityData): Ability {
    const { activationType, usageLimit, triggerEvent } = this.mapLegacyToModern(
      legacyData.legacyType,
      legacyData.triggerEvent,
    );

    return new Ability(
      legacyData.name,
      legacyData.text,
      activationType,
      legacyData.effects || [],
      triggerEvent,
      usageLimit,
    );
  }

  /**
   * Map legacy ability type to modern activation type and usage limit
   */
  private static mapLegacyToModern(
    legacyType: LegacyAbilityType,
    triggerEvent?: GameEventType,
  ): {
    activationType: AbilityActivationType;
    usageLimit?: UsageLimit;
    triggerEvent?: GameEventType;
  } {
    switch (legacyType) {
      case LegacyAbilityType.POKE_BODY:
        // Poké-Body: Always-on passive effects
        return {
          activationType: AbilityActivationType.PASSIVE,
        };

      case LegacyAbilityType.POKE_POWER:
        // Poké-Power: Activated effects, usually once per turn
        return {
          activationType: AbilityActivationType.ACTIVATED,
          usageLimit: UsageLimit.ONCE_PER_TURN,
        };

      case LegacyAbilityType.POKEMON_POWER:
        // Pokémon Power: Could be passive, triggered, or activated
        // Use trigger event if provided, otherwise default to activated
        if (triggerEvent) {
          return {
            activationType: AbilityActivationType.TRIGGERED,
            triggerEvent,
          };
        }
        // Most Pokémon Powers were activated once per turn
        return {
          activationType: AbilityActivationType.ACTIVATED,
          usageLimit: UsageLimit.ONCE_PER_TURN,
        };

      default:
        throw new Error(`Unknown legacy ability type: ${legacyType}`);
    }
  }

  /**
   * Detect legacy ability type from text patterns
   * Useful for automated card imports
   */
  static detectLegacyType(text: string): LegacyAbilityType | null {
    const lowerText = text.toLowerCase();

    // Check for common Poké-Power patterns
    if (
      lowerText.includes('once during your turn') ||
      lowerText.includes('once during each of your turns')
    ) {
      return LegacyAbilityType.POKE_POWER;
    }

    // Check for common Poké-Body patterns
    if (
      lowerText.includes('as long as') ||
      lowerText.includes('all your') ||
      lowerText.includes('this pokémon has') ||
      lowerText.includes('prevent all')
    ) {
      return LegacyAbilityType.POKE_BODY;
    }

    // Default to Pokémon Power for unknown patterns
    // Manual classification may be needed
    return LegacyAbilityType.POKEMON_POWER;
  }

  /**
   * Create ability from legacy card text
   * Attempts to auto-detect legacy type and create appropriate Ability
   */
  static fromLegacyText(
    name: string,
    text: string,
    effects: AbilityEffect[] = [],
    triggerEvent?: GameEventType,
  ): Ability {
    const detectedType = this.detectLegacyType(text);

    if (!detectedType) {
      throw new Error('Could not detect legacy ability type from text');
    }

    return this.toAbility({
      name,
      text,
      legacyType: detectedType,
      effects,
      triggerEvent,
    });
  }

  /**
   * Get human-readable description of legacy type
   */
  static getLegacyTypeDescription(legacyType: LegacyAbilityType): string {
    const descriptions: Record<LegacyAbilityType, string> = {
      [LegacyAbilityType.POKEMON_POWER]:
        'Pokémon Power (Base Set - Neo era, 1999-2003)',
      [LegacyAbilityType.POKE_BODY]:
        'Poké-Body - Always active (EX era, 2003-2010)',
      [LegacyAbilityType.POKE_POWER]:
        'Poké-Power - Activated ability (EX era, 2003-2010)',
    };

    return descriptions[legacyType];
  }
}
