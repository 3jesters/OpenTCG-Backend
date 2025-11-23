/**
 * Player Action Type Enum
 * Represents all possible actions a player can take during a match
 */
export enum PlayerActionType {
  DRAW_CARD = 'DRAW_CARD',
  PLAY_POKEMON = 'PLAY_POKEMON',
  SET_ACTIVE_POKEMON = 'SET_ACTIVE_POKEMON',
  ATTACH_ENERGY = 'ATTACH_ENERGY',
  PLAY_TRAINER = 'PLAY_TRAINER',
  EVOLVE_POKEMON = 'EVOLVE_POKEMON',
  RETREAT = 'RETREAT',
  ATTACK = 'ATTACK',
  USE_ABILITY = 'USE_ABILITY',
  END_TURN = 'END_TURN',
  CONCEDE = 'CONCEDE',
}

