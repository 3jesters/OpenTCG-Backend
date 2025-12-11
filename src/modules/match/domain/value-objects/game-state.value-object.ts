import { TurnPhase, PlayerIdentifier } from '../enums';
import { PlayerGameState } from './player-game-state.value-object';
import { ActionSummary } from './action-summary.value-object';
import { CoinFlipState } from './coin-flip-state.value-object';

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
    public readonly coinFlipState: CoinFlipState | null = null, // Current coin flip state
    public readonly abilityUsageThisTurn: Map<PlayerIdentifier, Set<string>> = new Map(), // Track abilities used this turn (playerId -> Set of cardIds)
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
      this.coinFlipState,
      this.abilityUsageThisTurn,
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
      this.coinFlipState,
      this.abilityUsageThisTurn,
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
      this.coinFlipState,
      this.abilityUsageThisTurn,
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
      this.coinFlipState,
      this.abilityUsageThisTurn,
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
      this.coinFlipState,
      this.abilityUsageThisTurn,
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
      this.coinFlipState,
      this.abilityUsageThisTurn,
    );
  }

  /**
   * Create a new GameState with updated coin flip state
   */
  withCoinFlipState(coinFlipState: CoinFlipState | null): GameState {
    return new GameState(
      this.player1State,
      this.player2State,
      this.turnNumber,
      this.phase,
      this.currentPlayer,
      this.lastAction,
      this.actionHistory,
      coinFlipState,
      this.abilityUsageThisTurn,
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

  /**
   * Mark an ability as used this turn
   */
  markAbilityUsed(playerId: PlayerIdentifier, cardId: string): GameState {
    const newUsageMap = new Map(this.abilityUsageThisTurn);
    const playerUsage = newUsageMap.get(playerId) || new Set<string>();
    const updatedPlayerUsage = new Set(playerUsage);
    updatedPlayerUsage.add(cardId);
    newUsageMap.set(playerId, updatedPlayerUsage);

    return new GameState(
      this.player1State,
      this.player2State,
      this.turnNumber,
      this.phase,
      this.currentPlayer,
      this.lastAction,
      this.actionHistory,
      this.coinFlipState,
      newUsageMap,
    );
  }

  /**
   * Check if an ability has been used this turn
   */
  hasAbilityBeenUsed(playerId: PlayerIdentifier, cardId: string): boolean {
    const playerUsage = this.abilityUsageThisTurn.get(playerId);
    return playerUsage ? playerUsage.has(cardId) : false;
  }

  /**
   * Reset ability usage for a specific player (called on turn end)
   */
  resetAbilityUsage(playerId: PlayerIdentifier): GameState {
    const newUsageMap = new Map(this.abilityUsageThisTurn);
    newUsageMap.set(playerId, new Set<string>());

    return new GameState(
      this.player1State,
      this.player2State,
      this.turnNumber,
      this.phase,
      this.currentPlayer,
      this.lastAction,
      this.actionHistory,
      this.coinFlipState,
      newUsageMap,
    );
  }
}

