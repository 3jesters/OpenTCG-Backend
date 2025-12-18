/**
 * Usage Limit Enum
 * Defines how often an ability or effect can be used
 */
export enum UsageLimit {
  /**
   * ONCE_PER_TURN: Can be used once per turn
   * Example: "Once during your turn, you may..."
   */
  ONCE_PER_TURN = 'ONCE_PER_TURN',

  /**
   * UNLIMITED: Can be used multiple times
   * Example: "As often as you like during your turn..."
   */
  UNLIMITED = 'UNLIMITED',
}
