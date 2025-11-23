/**
 * Action Validation Error Enum
 * Represents types of validation errors for player actions
 */
export enum ActionValidationError {
  INVALID_STATE = 'INVALID_STATE',
  INVALID_PHASE = 'INVALID_PHASE',
  NOT_PLAYER_TURN = 'NOT_PLAYER_TURN',
  INSUFFICIENT_RESOURCES = 'INSUFFICIENT_RESOURCES',
  INVALID_TARGET = 'INVALID_TARGET',
  RULE_VIOLATION = 'RULE_VIOLATION',
  INVALID_ACTION = 'INVALID_ACTION',
}

