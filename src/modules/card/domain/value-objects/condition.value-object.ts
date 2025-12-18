import { ConditionType } from '../enums/condition-type.enum';
import { EnergyType } from '../enums/energy-type.enum';

/**
 * Condition Value for specific condition types
 */
export interface ConditionValue {
  statusCondition?: 'PARALYZED' | 'POISONED' | 'BURNED' | 'ASLEEP' | 'CONFUSED';
  energyType?: EnergyType;
  minimumAmount?: number;
  stadiumName?: string;
}

/**
 * Condition
 * Represents a condition that must be met for an effect or ability to trigger
 * Reusable across attack effects, ability effects, and card rules
 */
export interface Condition {
  type: ConditionType;
  value?: ConditionValue;
  description?: string; // Optional human-readable description
}

/**
 * Condition Factory
 * Helper methods for creating common conditions with proper typing
 */
export class ConditionFactory {
  /**
   * Create an "always" condition (no requirements)
   */
  static always(): Condition {
    return {
      type: ConditionType.ALWAYS,
    };
  }

  /**
   * Create a coin flip success condition
   */
  static coinFlipSuccess(description?: string): Condition {
    return {
      type: ConditionType.COIN_FLIP_SUCCESS,
      description,
    };
  }

  /**
   * Create a coin flip failure condition
   */
  static coinFlipFailure(description?: string): Condition {
    return {
      type: ConditionType.COIN_FLIP_FAILURE,
      description,
    };
  }

  /**
   * Create a self has damage condition
   */
  static selfHasDamage(description?: string): Condition {
    return {
      type: ConditionType.SELF_HAS_DAMAGE,
      description,
    };
  }

  /**
   * Create a self has minimum damage condition
   */
  static selfMinimumDamage(
    minimumAmount: number,
    description?: string,
  ): Condition {
    return {
      type: ConditionType.SELF_MINIMUM_DAMAGE,
      value: { minimumAmount },
      description,
    };
  }

  /**
   * Create a self has no damage condition
   */
  static selfNoDamage(description?: string): Condition {
    return {
      type: ConditionType.SELF_NO_DAMAGE,
      description,
    };
  }

  /**
   * Create a self has specific status condition
   */
  static selfHasStatus(
    statusCondition:
      | 'PARALYZED'
      | 'POISONED'
      | 'BURNED'
      | 'ASLEEP'
      | 'CONFUSED',
    description?: string,
  ): Condition {
    return {
      type: ConditionType.SELF_HAS_STATUS,
      value: { statusCondition },
      description,
    };
  }

  /**
   * Create an opponent has damage condition
   */
  static opponentHasDamage(description?: string): Condition {
    return {
      type: ConditionType.OPPONENT_HAS_DAMAGE,
      description,
    };
  }

  /**
   * Create an opponent has specific status condition
   */
  static opponentHasStatus(
    statusCondition:
      | 'PARALYZED'
      | 'POISONED'
      | 'BURNED'
      | 'ASLEEP'
      | 'CONFUSED',
    description?: string,
  ): Condition {
    return {
      type: ConditionType.OPPONENT_HAS_STATUS,
      value: { statusCondition },
      description,
    };
  }

  /**
   * Create an opponent is confused condition
   */
  static opponentConfused(description?: string): Condition {
    return {
      type: ConditionType.OPPONENT_CONFUSED,
      description,
    };
  }

  /**
   * Create an opponent is paralyzed condition
   */
  static opponentParalyzed(description?: string): Condition {
    return {
      type: ConditionType.OPPONENT_PARALYZED,
      description,
    };
  }

  /**
   * Create an opponent is poisoned condition
   */
  static opponentPoisoned(description?: string): Condition {
    return {
      type: ConditionType.OPPONENT_POISONED,
      description,
    };
  }

  /**
   * Create an opponent is burned condition
   */
  static opponentBurned(description?: string): Condition {
    return {
      type: ConditionType.OPPONENT_BURNED,
      description,
    };
  }

  /**
   * Create an opponent is asleep condition
   */
  static opponentAsleep(description?: string): Condition {
    return {
      type: ConditionType.OPPONENT_ASLEEP,
      description,
    };
  }

  /**
   * Create a self has energy type condition
   */
  static selfHasEnergyType(
    energyType: EnergyType,
    minimumAmount: number,
    description?: string,
  ): Condition {
    return {
      type: ConditionType.SELF_HAS_ENERGY_TYPE,
      value: { energyType, minimumAmount },
      description,
    };
  }

  /**
   * Create a self has minimum energy condition
   */
  static selfMinimumEnergy(
    minimumAmount: number,
    description?: string,
  ): Condition {
    return {
      type: ConditionType.SELF_MINIMUM_ENERGY,
      value: { minimumAmount },
      description,
    };
  }

  /**
   * Create an opponent has benched Pokémon condition
   */
  static opponentHasBenched(description?: string): Condition {
    return {
      type: ConditionType.OPPONENT_HAS_BENCHED,
      description,
    };
  }

  /**
   * Create a self has benched Pokémon condition
   */
  static selfHasBenched(description?: string): Condition {
    return {
      type: ConditionType.SELF_HAS_BENCHED,
      description,
    };
  }

  /**
   * Create a stadium in play condition
   */
  static stadiumInPlay(stadiumName?: string, description?: string): Condition {
    return {
      type: ConditionType.STADIUM_IN_PLAY,
      value: stadiumName ? { stadiumName } : undefined,
      description,
    };
  }
}

/**
 * Condition Helper Methods
 */
export class ConditionHelper {
  /**
   * Check if condition is always true (no requirements)
   */
  static isAlways(condition: Condition): boolean {
    return condition.type === ConditionType.ALWAYS;
  }

  /**
   * Check if condition requires game state to evaluate
   */
  static requiresGameState(condition: Condition): boolean {
    return condition.type !== ConditionType.ALWAYS;
  }

  /**
   * Check if condition is coin flip based
   */
  static isCoinFlipBased(condition: Condition): boolean {
    return (
      condition.type === ConditionType.COIN_FLIP_SUCCESS ||
      condition.type === ConditionType.COIN_FLIP_FAILURE
    );
  }

  /**
   * Check if condition relates to self (this Pokémon)
   */
  static isSelfCondition(condition: Condition): boolean {
    return condition.type.startsWith('SELF_');
  }

  /**
   * Check if condition relates to opponent
   */
  static isOpponentCondition(condition: Condition): boolean {
    return condition.type.startsWith('OPPONENT_');
  }

  /**
   * Check if condition requires a value
   */
  static requiresValue(conditionType: ConditionType): boolean {
    const typesRequiringValue = [
      ConditionType.SELF_HAS_STATUS,
      ConditionType.SELF_MINIMUM_DAMAGE,
      ConditionType.OPPONENT_HAS_STATUS,
      ConditionType.SELF_HAS_ENERGY_TYPE,
      ConditionType.SELF_MINIMUM_ENERGY,
    ];
    return typesRequiringValue.includes(conditionType);
  }
}
