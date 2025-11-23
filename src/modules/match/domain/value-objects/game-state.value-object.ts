import { TurnPhase, PlayerIdentifier } from '../enums';
import { PlayerGameState } from './player-game-state.value-object';
import { ActionSummary } from './action-summary.value-object';

/**
 * Game State Value Object
 * Represents the complete game state of a match
 * Immutable value object
 */
export class GameState {
  constructor(
    public readonly player1State: PlayerGameState, // Player 1's game state
    public readonly player2State: PlayerGameState, // Player 2's game state
    public readonly turnNumber: number, // Current turn number (starts at 1)
    public readonly phase: TurnPhase, // Current phase of the turn
    public readonly currentPlayer: PlayerIdentifier, // Whose turn it is
    public readonly lastAction: ActionSummary | null, // Last action taken
    public readonly actionHistory: ActionSummary[], // Complete history of actions
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.turnNumber < 1) {
      throw new Error('Turn number must be at least 1');
    }
    if (this.actionHistory.length > 0 && !this.lastAction) {
      throw new Error('If action history exists, last action must be set');
    }
  }

  /**
   * Create a new GameState with updated player 1 state
   */
  withPlayer1State(player1State: PlayerGameState): GameState {
    return new GameState(
      player1State,
      this.player2State,
      this.turnNumber,
      this.phase,
      this.currentPlayer,
      this.lastAction,
      this.actionHistory,
    );
  }

  /**
   * Create a new GameState with updated player 2 state
   */
  withPlayer2State(player2State: PlayerGameState): GameState {
    return new GameState(
      this.player1State,
      player2State,
      this.turnNumber,
      this.phase,
      this.currentPlayer,
      this.lastAction,
      this.actionHistory,
    );
  }

  /**
   * Create a new GameState with updated turn number
   */
  withTurnNumber(turnNumber: number): GameState {
    return new GameState(
      this.player1State,
      this.player2State,
      turnNumber,
      this.phase,
      this.currentPlayer,
      this.lastAction,
      this.actionHistory,
    );
  }

  /**
   * Create a new GameState with updated phase
   */
  withPhase(phase: TurnPhase): GameState {
    return new GameState(
      this.player1State,
      this.player2State,
      this.turnNumber,
      phase,
      this.currentPlayer,
      this.lastAction,
      this.actionHistory,
    );
  }

  /**
   * Create a new GameState with updated current player
   */
  withCurrentPlayer(currentPlayer: PlayerIdentifier): GameState {
    return new GameState(
      this.player1State,
      this.player2State,
      this.turnNumber,
      this.phase,
      currentPlayer,
      this.lastAction,
      this.actionHistory,
    );
  }

  /**
   * Create a new GameState with a new action added
   */
  withAction(action: ActionSummary): GameState {
    return new GameState(
      this.player1State,
      this.player2State,
      this.turnNumber,
      this.phase,
      this.currentPlayer,
      action,
      [...this.actionHistory, action],
    );
  }

  /**
   * Get the game state for a specific player
   */
  getPlayerState(playerId: PlayerIdentifier): PlayerGameState {
    return playerId === PlayerIdentifier.PLAYER1
      ? this.player1State
      : this.player2State;
  }

  /**
   * Get the opponent's game state for a specific player
   */
  getOpponentState(playerId: PlayerIdentifier): PlayerGameState {
    return playerId === PlayerIdentifier.PLAYER1
      ? this.player2State
      : this.player1State;
  }
}

