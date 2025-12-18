/**
 * Game Event Type Enum
 *
 * **REUSABLE GAME MECHANIC ENUM**
 * This enum represents game events that can trigger various mechanics throughout the system.
 *
 * Can be used for:
 * - Ability triggers (when does an ability activate?)
 * - Card rule triggers (when does a rule apply?)
 * - Trainer card timing (when can a trainer be played?)
 * - Effect activation (when does an effect occur?)
 * - Game engine event tracking
 *
 * Similar to the Condition system, this is designed to be reusable across the entire codebase.
 */
export enum GameEventType {
  /**
   * WHEN_PLAYED: When this card is played from hand to the field
   * Example: "When you play this Pokémon from your hand..."
   */
  WHEN_PLAYED = 'WHEN_PLAYED',

  /**
   * WHEN_DAMAGED: When this Pokémon takes damage
   * Example: "Whenever this Pokémon is damaged by an attack..."
   */
  WHEN_DAMAGED = 'WHEN_DAMAGED',

  /**
   * WHEN_ATTACKING: When this Pokémon declares or executes an attack
   * Example: "When this Pokémon attacks..."
   */
  WHEN_ATTACKING = 'WHEN_ATTACKING',

  /**
   * WHEN_DEFENDING: When this Pokémon is the target of an attack
   * Example: "Whenever this Pokémon is attacked..."
   */
  WHEN_DEFENDING = 'WHEN_DEFENDING',

  /**
   * BETWEEN_TURNS: Between the active player's turns
   * Example: "Between turns, this Pokémon is Poisoned..."
   */
  BETWEEN_TURNS = 'BETWEEN_TURNS',

  /**
   * WHEN_KNOCKED_OUT: When this Pokémon is knocked out
   * Example: "When this Pokémon is Knocked Out..."
   */
  WHEN_KNOCKED_OUT = 'WHEN_KNOCKED_OUT',

  /**
   * START_OF_TURN: At the beginning of your turn
   * Example: "At the start of your turn, draw a card..."
   */
  START_OF_TURN = 'START_OF_TURN',

  /**
   * END_OF_TURN: At the end of your turn
   * Example: "At the end of your turn, remove all damage..."
   */
  END_OF_TURN = 'END_OF_TURN',
}
