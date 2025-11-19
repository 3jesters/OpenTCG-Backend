/**
 * Ability Activation Type Enum
 * Defines how an ability is activated during gameplay
 */
export enum AbilityActivationType {
  /**
   * PASSIVE: Always active, no player action required
   * Example: "All your Fire Pokémon do 10 more damage"
   */
  PASSIVE = 'PASSIVE',

  /**
   * TRIGGERED: Automatically activates when a specific game event occurs
   * Example: "When this Pokémon takes damage, draw a card"
   */
  TRIGGERED = 'TRIGGERED',

  /**
   * ACTIVATED: Player chooses to use it, often with usage limits
   * Example: "Once during your turn, you may heal 30 damage from this Pokémon"
   */
  ACTIVATED = 'ACTIVATED',
}

