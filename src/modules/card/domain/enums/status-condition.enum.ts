/**
 * Status Condition Enum
 * Represents status conditions that can be applied via abilities
 * Note: This is separate from StatusEffect enum in match domain
 * to maintain domain separation
 */
export enum StatusCondition {
  PARALYZED = 'PARALYZED',
  POISONED = 'POISONED',
  BURNED = 'BURNED',
  ASLEEP = 'ASLEEP',
  CONFUSED = 'CONFUSED',
}
