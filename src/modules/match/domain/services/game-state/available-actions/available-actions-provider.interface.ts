import {
  MatchState,
  TurnPhase,
  PlayerIdentifier,
  PlayerActionType,
} from '../../../enums';

/**
 * Game State Context for available actions calculation
 */
export interface GameStateContext {
  lastAction: {
    actionType: PlayerActionType;
    playerId: PlayerIdentifier;
    actionData?: any;
    actionId?: string;
  } | null;
  actionHistory: Array<{
    actionType: PlayerActionType;
    playerId: PlayerIdentifier;
    actionId?: string;
  }>;
  player1State?: any;
  player2State?: any;
}

/**
 * Available Actions Provider Interface
 * Defines the contract for providers that determine available actions based on match state and phase
 */
export interface AvailableActionsProvider {
  /**
   * Check if this provider can handle the given state and phase
   */
  canHandle(state: MatchState, phase: TurnPhase | null): boolean;

  /**
   * Get available actions for the given state, phase, and game context
   */
  getActions(
    state: MatchState,
    phase: TurnPhase | null,
    gameState?: GameStateContext,
    currentPlayer?: PlayerIdentifier,
  ): PlayerActionType[];
}
