import { CardRuleType } from '../enums/card-rule-type.enum';
import { RulePriority } from '../enums/rule-priority.enum';
import { ConditionValidator } from './condition.validator';
import type {
  CardRule,
  RuleMetadata,
  MovementRuleMetadata,
  AttackRuleMetadata,
  DamageRuleMetadata,
  StatusRuleMetadata,
  PrizeRuleMetadata,
  EvolutionRuleMetadata,
  PlayRuleMetadata,
  EnergyRuleMetadata,
} from '../value-objects/card-rule.value-object';

/**
 * Validator for Card Rules
 * Provides comprehensive validation for all card rule types
 */
export class CardRuleValidator {
  /**
   * Validate a single card rule
   */
  static validate(rule: CardRule): void {
    // General validation
    if (!rule.ruleType) {
      throw new Error('Rule type is required');
    }

    if (!Object.values(CardRuleType).includes(rule.ruleType)) {
      throw new Error(`Invalid rule type: ${rule.ruleType}`);
    }

    if (!rule.text || rule.text.trim() === '') {
      throw new Error('Rule text is required');
    }

    if (!Object.values(RulePriority).includes(rule.priority)) {
      throw new Error(`Invalid rule priority: ${rule.priority}`);
    }

    // Validate conditions if present
    if (rule.conditions && rule.conditions.length > 0) {
      try {
        ConditionValidator.validateAll(rule.conditions);
      } catch (error) {
        throw new Error(`Invalid conditions: ${error.message}`);
      }
    }

    // Validate metadata if present
    if (rule.metadata) {
      this.validateMetadata(rule.ruleType, rule.metadata);
    }
  }

  /**
   * Validate an array of card rules
   */
  static validateAll(rules: CardRule[]): void {
    if (!Array.isArray(rules)) {
      throw new Error('Rules must be an array');
    }

    rules.forEach((rule, index) => {
      try {
        this.validate(rule);
      } catch (error) {
        throw new Error(`Rule at index ${index}: ${error.message}`);
      }
    });
  }

  /**
   * Validate metadata based on rule type
   */
  private static validateMetadata(
    ruleType: CardRuleType,
    metadata: RuleMetadata,
  ): void {
    if (!metadata.category) {
      throw new Error('Metadata must have a category');
    }

    // Validate based on category
    switch (metadata.category) {
      case 'movement':
        this.validateMovementMetadata(metadata);
        break;
      case 'attack':
        this.validateAttackMetadata(metadata);
        break;
      case 'damage':
        this.validateDamageMetadata(metadata);
        break;
      case 'status':
        this.validateStatusMetadata(metadata);
        break;
      case 'prize':
        this.validatePrizeMetadata(metadata);
        break;
      case 'evolution':
        this.validateEvolutionMetadata(metadata);
        break;
      case 'play':
        this.validatePlayMetadata(metadata);
        break;
      case 'energy':
        this.validateEnergyMetadata(metadata);
        break;
      default:
        throw new Error(
          `Unknown metadata category: ${(metadata as any).category}`,
        );
    }
  }

  // ========================================
  // CATEGORY-SPECIFIC VALIDATORS
  // ========================================

  private static validateMovementMetadata(
    metadata: MovementRuleMetadata,
  ): void {
    if (
      metadata.switchTarget &&
      metadata.switchTarget !== 'benched' &&
      metadata.switchTarget !== 'random'
    ) {
      throw new Error('Switch target must be "benched" or "random"');
    }

    if (metadata.allowedActions && !Array.isArray(metadata.allowedActions)) {
      throw new Error('Allowed actions must be an array');
    }
  }

  private static validateAttackMetadata(metadata: AttackRuleMetadata): void {
    if (metadata.costReduction !== undefined && metadata.costReduction < 0) {
      throw new Error('Cost reduction cannot be negative');
    }

    if (metadata.costIncrease !== undefined && metadata.costIncrease < 0) {
      throw new Error('Cost increase cannot be negative');
    }

    if (metadata.affectedAttacks && !Array.isArray(metadata.affectedAttacks)) {
      throw new Error('Affected attacks must be an array');
    }
  }

  private static validateDamageMetadata(metadata: DamageRuleMetadata): void {
    if (
      metadata.reductionAmount !== undefined &&
      metadata.reductionAmount < 0
    ) {
      throw new Error('Reduction amount cannot be negative');
    }

    if (metadata.increaseAmount !== undefined && metadata.increaseAmount < 0) {
      throw new Error('Increase amount cannot be negative');
    }

    if (metadata.immuneFrom && !Array.isArray(metadata.immuneFrom)) {
      throw new Error('Immune from must be an array');
    }
  }

  private static validateStatusMetadata(metadata: StatusRuleMetadata): void {
    if (metadata.immuneStatus && !Array.isArray(metadata.immuneStatus)) {
      throw new Error('Immune status must be an array');
    }

    if (metadata.effectTypes && !Array.isArray(metadata.effectTypes)) {
      throw new Error('Effect types must be an array');
    }
  }

  private static validatePrizeMetadata(metadata: PrizeRuleMetadata): void {
    if (
      metadata.prizeCount !== undefined &&
      typeof metadata.prizeCount !== 'number'
    ) {
      throw new Error('Prize count must be a number');
    }

    if (metadata.prizeCount !== undefined && metadata.prizeCount < 0) {
      throw new Error('Prize count cannot be negative');
    }
  }

  private static validateEvolutionMetadata(
    metadata: EvolutionRuleMetadata,
  ): void {
    if (
      metadata.allowFirstTurn !== undefined &&
      typeof metadata.allowFirstTurn !== 'boolean'
    ) {
      throw new Error('Allow first turn must be a boolean');
    }

    if (
      metadata.skipStages !== undefined &&
      (typeof metadata.skipStages !== 'number' || metadata.skipStages < 1)
    ) {
      throw new Error('Skip stages must be a positive number');
    }

    if (
      metadata.allowedEvolutions &&
      !Array.isArray(metadata.allowedEvolutions)
    ) {
      throw new Error('Allowed evolutions must be an array');
    }
  }

  private static validatePlayMetadata(metadata: PlayRuleMetadata): void {
    if (
      metadata.usageLimit &&
      metadata.usageLimit !== 'once_per_game' &&
      metadata.usageLimit !== 'once_per_turn'
    ) {
      throw new Error('Usage limit must be "once_per_game" or "once_per_turn"');
    }

    if (
      metadata.discardTiming &&
      metadata.discardTiming !== 'after_use' &&
      metadata.discardTiming !== 'end_of_turn'
    ) {
      throw new Error('Discard timing must be "after_use" or "end_of_turn"');
    }
  }

  private static validateEnergyMetadata(metadata: EnergyRuleMetadata): void {
    if (metadata.costReduction !== undefined && metadata.costReduction < 0) {
      throw new Error('Cost reduction cannot be negative');
    }

    if (
      metadata.extraAttachments !== undefined &&
      metadata.extraAttachments < 1
    ) {
      throw new Error('Extra attachments must be at least 1');
    }
  }
}
