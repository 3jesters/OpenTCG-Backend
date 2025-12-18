/**
 * Turn Phase Enum
 * Represents the current phase within a player's turn
 */
export enum TurnPhase {
  DRAW = 'DRAW',
  MAIN_PHASE = 'MAIN_PHASE',
  ATTACK = 'ATTACK',
  END = 'END',
  SELECT_ACTIVE_POKEMON = 'SELECT_ACTIVE_POKEMON', // Active Pokemon selection required after knockout
}
