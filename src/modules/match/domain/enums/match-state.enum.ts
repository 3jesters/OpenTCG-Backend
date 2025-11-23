/**
 * Match State Enum
 * Represents the current state of a match in the state machine
 */
export enum MatchState {
  CREATED = 'CREATED',
  WAITING_FOR_PLAYERS = 'WAITING_FOR_PLAYERS',
  DECK_VALIDATION = 'DECK_VALIDATION',
  PRE_GAME_SETUP = 'PRE_GAME_SETUP',
  INITIAL_SETUP = 'INITIAL_SETUP',
  PLAYER_TURN = 'PLAYER_TURN',
  BETWEEN_TURNS = 'BETWEEN_TURNS',
  MATCH_ENDED = 'MATCH_ENDED',
  CANCELLED = 'CANCELLED',
}

