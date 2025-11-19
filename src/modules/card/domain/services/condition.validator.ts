import { ConditionType } from '../enums/condition-type.enum';
import { Condition, ConditionValue, ConditionHelper } from '../value-objects/condition.value-object';

/**
 * Condition Validator
 * Validates that conditions are well-formed and contain valid data
 */
export class ConditionValidator {
  /**
   * Validate a condition
   * @param condition The condition to validate
   * @returns true if valid
   * @throws Error with descriptive message if validation fails
   */
  static validate(condition: Condition): boolean {
    if (!condition) {
      throw new Error('Condition is required');
    }

    if (!condition.type) {
      throw new Error('Condition type is required');
    }

    // Validate that type is a valid ConditionType
    if (!Object.values(ConditionType).includes(condition.type)) {
      throw new Error(`Invalid condition type: ${condition.type}`);
    }

    // Check if this condition type requires a value
    if (ConditionHelper.requiresValue(condition.type)) {
      if (!condition.value) {
        throw new Error(`Condition type ${condition.type} requires a value`);
      }
      this.validateValue(condition.type, condition.value);
    }

    return true;
  }

  /**
   * Validate condition value based on type
   */
  private static validateValue(type: ConditionType, value: ConditionValue): void {
    switch (type) {
      case ConditionType.SELF_HAS_STATUS:
      case ConditionType.OPPONENT_HAS_STATUS:
        this.validateStatusCondition(value);
        break;

      case ConditionType.SELF_MINIMUM_DAMAGE:
      case ConditionType.SELF_MINIMUM_ENERGY:
        this.validateMinimumAmount(value);
        break;

      case ConditionType.SELF_HAS_ENERGY_TYPE:
        this.validateEnergyTypeCondition(value);
        break;

      default:
        // Other condition types don't require value validation
        break;
    }
  }

  /**
   * Validate status condition value
   */
  private static validateStatusCondition(value: ConditionValue): void {
    if (!value.statusCondition) {
      throw new Error('Status condition is required');
    }

    const validStatuses = ['PARALYZED', 'POISONED', 'BURNED', 'ASLEEP', 'CONFUSED'];
    if (!validStatuses.includes(value.statusCondition)) {
      throw new Error(
        `Invalid status condition: ${value.statusCondition}. Must be one of: ${validStatuses.join(', ')}`,
      );
    }
  }

  /**
   * Validate minimum amount value
   */
  private static validateMinimumAmount(value: ConditionValue): void {
    if (value.minimumAmount === undefined || value.minimumAmount === null) {
      throw new Error('Minimum amount is required');
    }

    if (typeof value.minimumAmount !== 'number') {
      throw new Error('Minimum amount must be a number');
    }

    if (value.minimumAmount < 1) {
      throw new Error('Minimum amount must be at least 1');
    }

    if (!Number.isInteger(value.minimumAmount)) {
      throw new Error('Minimum amount must be an integer');
    }
  }

  /**
   * Validate energy type condition value
   */
  private static validateEnergyTypeCondition(value: ConditionValue): void {
    if (!value.energyType) {
      throw new Error('Energy type is required');
    }

    this.validateMinimumAmount(value);
  }

  /**
   * Validate multiple conditions
   * @param conditions Array of conditions to validate
   * @returns true if all are valid
   * @throws Error if any validation fails
   */
  static validateAll(conditions: Condition[]): boolean {
    if (!Array.isArray(conditions)) {
      throw new Error('Conditions must be an array');
    }

    conditions.forEach((condition, index) => {
      try {
        this.validate(condition);
      } catch (error) {
        throw new Error(
          `Condition at index ${index} is invalid: ${error.message}`,
        );
      }
    });

    return true;
  }

  /**
   * Check if conditions array is valid and not empty
   */
  static hasValidConditions(conditions?: Condition[]): boolean {
    if (!conditions || conditions.length === 0) {
      return false;
    }

    try {
      this.validateAll(conditions);
      return true;
    } catch {
      return false;
    }
  }
}

