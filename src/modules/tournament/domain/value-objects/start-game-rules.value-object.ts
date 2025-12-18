/**
 * Start Game Rule Type
 * Defines the type of rule that must be satisfied in the initial hand
 */
export enum StartGameRuleType {
  HAS_BASIC_POKEMON = 'HAS_BASIC_POKEMON',
  HAS_ENERGY_CARD = 'HAS_ENERGY_CARD',
  // Future: HAS_TRAINER_CARD, HAS_SPECIFIC_CARD, etc.
}

/**
 * Start Game Rule
 * Represents a single rule that must be satisfied in the initial hand
 */
export interface StartGameRule {
  type: StartGameRuleType;
  minCount: number;
}

/**
 * Start Game Rules Value Object
 * Encapsulates all start game rules that must be satisfied in the initial hand
 * All rules must be satisfied for the hand to be valid
 */
export class StartGameRules {
  constructor(public readonly rules: StartGameRule[]) {
    this.validate();
  }

  private validate(): void {
    if (!Array.isArray(this.rules)) {
      throw new Error('Rules must be an array');
    }

    for (const rule of this.rules) {
      if (!rule.type || !Object.values(StartGameRuleType).includes(rule.type)) {
        throw new Error(`Invalid rule type: ${rule.type}`);
      }
      if (typeof rule.minCount !== 'number' || rule.minCount < 1) {
        throw new Error(
          `Min count must be a positive number, got: ${rule.minCount}`,
        );
      }
    }
  }

  /**
   * Check if rules are empty (no rules to satisfy)
   */
  isEmpty(): boolean {
    return this.rules.length === 0;
  }

  /**
   * Get all rules of a specific type
   */
  getRulesByType(type: StartGameRuleType): StartGameRule[] {
    return this.rules.filter((rule) => rule.type === type);
  }

  /**
   * Check if a specific rule type exists
   */
  hasRuleType(type: StartGameRuleType): boolean {
    return this.rules.some((rule) => rule.type === type);
  }

  equals(other: StartGameRules): boolean {
    if (this.rules.length !== other.rules.length) {
      return false;
    }

    // Sort rules by type for comparison
    const sortedThis = [...this.rules].sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.minCount - b.minCount;
    });
    const sortedOther = [...other.rules].sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.minCount - b.minCount;
    });

    return sortedThis.every(
      (rule, idx) =>
        rule.type === sortedOther[idx].type &&
        rule.minCount === sortedOther[idx].minCount,
    );
  }

  /**
   * Factory method for default rules (has at least 1 Basic Pokemon)
   */
  static createDefault(): StartGameRules {
    return new StartGameRules([
      {
        type: StartGameRuleType.HAS_BASIC_POKEMON,
        minCount: 1,
      },
    ]);
  }

  /**
   * Factory method for empty rules (no requirements)
   */
  static createEmpty(): StartGameRules {
    return new StartGameRules([]);
  }
}
