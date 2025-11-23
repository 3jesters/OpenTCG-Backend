import {
  MatchState,
  MatchResult,
  PlayerIdentifier,
  WinCondition,
} from '../enums';
import { GameState } from '../value-objects';

/**
 * Match Domain Entity
 * Represents a match between two players in a tournament
 * Framework-agnostic with business logic and state machine
 */
export class Match {
  // Identity
  private readonly _id: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  // Tournament & Players
  private _tournamentId: string;
  private _player1Id: string | null;
  private _player2Id: string | null;
  private _player1DeckId: string | null;
  private _player2DeckId: string | null;

  // State Machine
  private _state: MatchState;
  private _currentPlayer: PlayerIdentifier | null;
  private _firstPlayer: PlayerIdentifier | null;

  // Match Result
  private _startedAt: Date | null;
  private _endedAt: Date | null;
  private _winnerId: string | null;
  private _result: MatchResult | null;
  private _winCondition: WinCondition | null;
  private _cancellationReason: string | null;

  // Game State
  private _gameState: GameState | null;

  constructor(
    id: string,
    tournamentId: string,
    createdAt?: Date,
  ) {
    this._id = id;
    this._tournamentId = tournamentId;
    this._createdAt = createdAt || new Date();
    this._updatedAt = new Date();
    this._state = MatchState.CREATED;
    this._player1Id = null;
    this._player2Id = null;
    this._player1DeckId = null;
    this._player2DeckId = null;
    this._currentPlayer = null;
    this._firstPlayer = null;
    this._startedAt = null;
    this._endedAt = null;
    this._winnerId = null;
    this._result = null;
    this._winCondition = null;
    this._cancellationReason = null;
    this._gameState = null;

    this.validate();
  }

  // ========================================
  // Getters
  // ========================================

  get id(): string {
    return this._id;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get tournamentId(): string {
    return this._tournamentId;
  }

  get player1Id(): string | null {
    return this._player1Id;
  }

  get player2Id(): string | null {
    return this._player2Id;
  }

  get player1DeckId(): string | null {
    return this._player1DeckId;
  }

  get player2DeckId(): string | null {
    return this._player2DeckId;
  }

  get state(): MatchState {
    return this._state;
  }

  get currentPlayer(): PlayerIdentifier | null {
    return this._currentPlayer;
  }

  get firstPlayer(): PlayerIdentifier | null {
    return this._firstPlayer;
  }

  get startedAt(): Date | null {
    return this._startedAt;
  }

  get endedAt(): Date | null {
    return this._endedAt;
  }

  get winnerId(): string | null {
    return this._winnerId;
  }

  get result(): MatchResult | null {
    return this._result;
  }

  get winCondition(): WinCondition | null {
    return this._winCondition;
  }

  get cancellationReason(): string | null {
    return this._cancellationReason;
  }

  get gameState(): GameState | null {
    return this._gameState;
  }

  // ========================================
  // Validation
  // ========================================

  private validate(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new Error('Match ID is required');
    }
    if (!this._tournamentId || this._tournamentId.trim().length === 0) {
      throw new Error('Tournament ID is required');
    }
  }

  // ========================================
  // State Machine Methods
  // ========================================

  /**
   * Assign a player to the match
   * Valid states: CREATED, WAITING_FOR_PLAYERS
   */
  assignPlayer(
    playerId: string,
    deckId: string,
    playerIdentifier: PlayerIdentifier,
  ): void {
    if (this._state !== MatchState.CREATED && this._state !== MatchState.WAITING_FOR_PLAYERS) {
      throw new Error(
        `Cannot assign player in state ${this._state}. Must be CREATED or WAITING_FOR_PLAYERS`,
      );
    }

    if (playerIdentifier === PlayerIdentifier.PLAYER1) {
      if (this._player1Id !== null) {
        throw new Error('Player 1 is already assigned');
      }
      this._player1Id = playerId;
      this._player1DeckId = deckId;
    } else {
      if (this._player2Id !== null) {
        throw new Error('Player 2 is already assigned');
      }
      this._player2Id = playerId;
      this._player2DeckId = deckId;
    }

    // Transition to WAITING_FOR_PLAYERS if first player assigned
    if (this._state === MatchState.CREATED) {
      this._state = MatchState.WAITING_FOR_PLAYERS;
    }

    // Transition to DECK_VALIDATION if both players assigned
    if (this._player1Id !== null && this._player2Id !== null) {
      this._state = MatchState.DECK_VALIDATION;
    }

    this._updatedAt = new Date();
  }

  /**
   * Mark deck validation as complete
   * Valid states: DECK_VALIDATION
   */
  markDeckValidationComplete(isValid: boolean): void {
    if (this._state !== MatchState.DECK_VALIDATION) {
      throw new Error(
        `Cannot mark deck validation complete in state ${this._state}. Must be DECK_VALIDATION`,
      );
    }

    if (!isValid) {
      this.cancelMatch('Deck validation failed');
      return;
    }

    this._state = MatchState.PRE_GAME_SETUP;
    this._updatedAt = new Date();
  }

  /**
   * Set the first player (after coin flip)
   * Valid states: PRE_GAME_SETUP
   */
  setFirstPlayer(playerIdentifier: PlayerIdentifier): void {
    if (this._state !== MatchState.PRE_GAME_SETUP) {
      throw new Error(
        `Cannot set first player in state ${this._state}. Must be PRE_GAME_SETUP`,
      );
    }

    if (playerIdentifier !== PlayerIdentifier.PLAYER1 && playerIdentifier !== PlayerIdentifier.PLAYER2) {
      throw new Error('Invalid player identifier');
    }

    this._firstPlayer = playerIdentifier;
    this._currentPlayer = playerIdentifier;
    this._state = MatchState.INITIAL_SETUP;
    this._updatedAt = new Date();
  }

  /**
   * Start initial setup
   * Valid states: INITIAL_SETUP
   */
  startInitialSetup(gameState: GameState): void {
    if (this._state !== MatchState.INITIAL_SETUP) {
      throw new Error(
        `Cannot start initial setup in state ${this._state}. Must be INITIAL_SETUP`,
      );
    }

    if (this._firstPlayer === null) {
      throw new Error('First player must be set before initial setup');
    }

    this._gameState = gameState;
    this._startedAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Complete initial setup and start first turn
   * Valid states: INITIAL_SETUP
   */
  completeInitialSetup(): void {
    if (this._state !== MatchState.INITIAL_SETUP) {
      throw new Error(
        `Cannot complete initial setup in state ${this._state}. Must be INITIAL_SETUP`,
      );
    }

    if (this._gameState === null) {
      throw new Error('Game state must be initialized before completing setup');
    }

    this._state = MatchState.PLAYER_TURN;
    this._updatedAt = new Date();
  }

  /**
   * Update game state (for turn actions)
   * Valid states: PLAYER_TURN, BETWEEN_TURNS
   */
  updateGameState(gameState: GameState): void {
    if (this._state !== MatchState.PLAYER_TURN && this._state !== MatchState.BETWEEN_TURNS) {
      throw new Error(
        `Cannot update game state in state ${this._state}. Must be PLAYER_TURN or BETWEEN_TURNS`,
      );
    }

    this._gameState = gameState;
    this._currentPlayer = gameState.currentPlayer;
    this._updatedAt = new Date();
  }

  /**
   * End current turn
   * Valid states: PLAYER_TURN
   */
  endTurn(): void {
    if (this._state !== MatchState.PLAYER_TURN) {
      throw new Error(
        `Cannot end turn in state ${this._state}. Must be PLAYER_TURN`,
      );
    }

    this._state = MatchState.BETWEEN_TURNS;
    this._updatedAt = new Date();
  }

  /**
   * Process between turns effects
   * Valid states: BETWEEN_TURNS
   */
  processBetweenTurns(gameState: GameState): void {
    if (this._state !== MatchState.BETWEEN_TURNS) {
      throw new Error(
        `Cannot process between turns in state ${this._state}. Must be BETWEEN_TURNS`,
      );
    }

    this._gameState = gameState;
    this._state = MatchState.PLAYER_TURN;
    this._currentPlayer = gameState.currentPlayer;
    this._updatedAt = new Date();
  }

  /**
   * End the match with a winner
   * Valid states: Any (except MATCH_ENDED, CANCELLED)
   */
  endMatch(
    winnerId: string,
    result: MatchResult,
    winCondition: WinCondition,
  ): void {
    if (this._state === MatchState.MATCH_ENDED || this._state === MatchState.CANCELLED) {
      throw new Error(`Cannot end match in state ${this._state}`);
    }

    if (winnerId !== this._player1Id && winnerId !== this._player2Id) {
      throw new Error('Winner ID must be one of the players');
    }

    this._winnerId = winnerId;
    this._result = result;
    this._winCondition = winCondition;
    this._endedAt = new Date();
    this._state = MatchState.MATCH_ENDED;
    this._updatedAt = new Date();
  }

  /**
   * Cancel the match
   * Valid states: Any (except MATCH_ENDED)
   */
  cancelMatch(reason: string): void {
    if (this._state === MatchState.MATCH_ENDED) {
      throw new Error('Cannot cancel a match that has already ended');
    }

    this._cancellationReason = reason;
    this._result = MatchResult.CANCELLED;
    this._endedAt = new Date();
    this._state = MatchState.CANCELLED;
    this._updatedAt = new Date();
  }

  // ========================================
  // Business Logic Methods
  // ========================================

  /**
   * Check if match is in a terminal state
   */
  isTerminal(): boolean {
    return (
      this._state === MatchState.MATCH_ENDED ||
      this._state === MatchState.CANCELLED
    );
  }

  /**
   * Check if both players are assigned
   */
  hasBothPlayers(): boolean {
    return this._player1Id !== null && this._player2Id !== null;
  }

  /**
   * Get player identifier for a given player ID
   */
  getPlayerIdentifier(playerId: string): PlayerIdentifier | null {
    if (playerId === this._player1Id) {
      return PlayerIdentifier.PLAYER1;
    }
    if (playerId === this._player2Id) {
      return PlayerIdentifier.PLAYER2;
    }
    return null;
  }

  /**
   * Check if it's a specific player's turn
   */
  isPlayerTurn(playerId: string): boolean {
    if (this._state !== MatchState.PLAYER_TURN) {
      return false;
    }

    const playerIdentifier = this.getPlayerIdentifier(playerId);
    return playerIdentifier === this._currentPlayer;
  }

  /**
   * Get the opponent's player ID
   */
  getOpponentId(playerId: string): string | null {
    if (playerId === this._player1Id) {
      return this._player2Id;
    }
    if (playerId === this._player2Id) {
      return this._player1Id;
    }
    return null;
  }
}

