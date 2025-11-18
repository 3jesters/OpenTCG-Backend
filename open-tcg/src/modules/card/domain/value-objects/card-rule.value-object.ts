/**
 * Card Rule (Placeholder)
 * Represents special rules that apply to a card
 * Will be expanded later to handle structured rule execution for game engine
 */
export interface CardRule {
  ruleType: string; // Placeholder: e.g., "CANNOT_RETREAT", "DAMAGE_PREVENTION"
  condition?: string; // When this rule applies
  effect: any; // Structured effect data (to be defined)
  priority?: number; // For rule execution order
}

