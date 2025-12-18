import { PlayerActionType, PlayerIdentifier } from '../enums';

/**
 * Action Summary Value Object
 * Represents a summary of an action taken during a match
 * Immutable value object
 */
export class ActionSummary {
  constructor(
    public readonly actionId: string, // Unique action ID (UUID)
    public readonly playerId: PlayerIdentifier, // Who took the action
    public readonly actionType: PlayerActionType, // Type of action
    public readonly timestamp: Date, // When the action occurred
    public readonly actionData: Record<string, unknown>, // Action-specific data
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.actionId || this.actionId.trim().length === 0) {
      throw new Error('Action ID is required');
    }
  }

  /**
   * Check equality with another ActionSummary
   */
  equals(other: ActionSummary): boolean {
    return this.actionId === other.actionId;
  }
}
