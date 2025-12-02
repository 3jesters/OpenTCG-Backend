import {
  MatchState,
  MatchResult,
  PlayerIdentifier,
  WinCondition,
  TurnPhase,
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
  private _coinTossResult: PlayerIdentifier | null;

  // Setup Progress Tracking
  private _player1HasDrawnValidHand: boolean;
  private _player2HasDrawnValidHand: boolean;
  private _player1ReadyToStart: boolean;
  private _player2ReadyToStart: boolean;
  private _player1Approved: boolean;
  private _player2Approved: boolean;

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
    this._coinTossResult = null;
    this._player1HasDrawnValidHand = false;
    this._player2HasDrawnValidHand = false;
    this._player1ReadyToStart = false;
    this._player2ReadyToStart = false;
    this._player1Approved = false;
    this._player2Approved = false;
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

  get coinTossResult(): PlayerIdentifier | null {
    return this._coinTossResult;
  }

  get player1HasDrawnValidHand(): boolean {
    return this._player1HasDrawnValidHand;
  }

  get player2HasDrawnValidHand(): boolean {
    return this._player2HasDrawnValidHand;
  }

  get player1ReadyToStart(): boolean {
    return this._player1ReadyToStart;
  }

  get player2ReadyToStart(): boolean {
    return this._player2ReadyToStart;
  }

  get player1Approved(): boolean {
    return this._player1Approved;
  }

  get player2Approved(): boolean {
    return this._player2Approved;
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

    this._state = MatchState.MATCH_APPROVAL;
    this._updatedAt = new Date();
  }

  /**
   * Approve match (player confirms they want to proceed)
   * Valid states: MATCH_APPROVAL
   */
  approveMatch(playerIdentifier: PlayerIdentifier): void {
    if (this._state !== MatchState.MATCH_APPROVAL) {
      throw new Error(
        `Cannot approve match in state ${this._state}. Must be MATCH_APPROVAL`,
      );
    }

    if (playerIdentifier === PlayerIdentifier.PLAYER1) {
      if (this._player1Approved) {
        throw new Error('Player 1 has already approved');
      }
      this._player1Approved = true;
    } else {
      if (this._player2Approved) {
        throw new Error('Player 2 has already approved');
      }
      this._player2Approved = true;
    }

    // If both players have approved, transition directly to DRAWING_CARDS
    // and perform coin toss automatically
    if (this._player1Approved && this._player2Approved) {
      this._state = MatchState.DRAWING_CARDS;
      // Perform coin toss automatically when both players approve
      if (this._coinTossResult === null) {
        this.performCoinToss();
      }
    }

    this._updatedAt = new Date();
  }

  /**
   * Check if both players have approved the match
   */
  hasBothApprovals(): boolean {
    return this._player1Approved && this._player2Approved;
  }

  /**
   * Perform coin toss to determine first player
   * Valid states: DRAWING_CARDS, SELECT_BENCH_POKEMON
   */
  performCoinToss(): void {
    if (this._state !== MatchState.DRAWING_CARDS && this._state !== MatchState.SELECT_BENCH_POKEMON) {
      throw new Error(
        `Cannot perform coin toss in state ${this._state}. Must be DRAWING_CARDS or SELECT_BENCH_POKEMON`,
      );
    }

    // Use deterministic random based on match ID for consistency
    const seed = this._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (seed * 9301 + 49297) % 233280;
    const result = random / 233280 < 0.5 
      ? PlayerIdentifier.PLAYER1 
      : PlayerIdentifier.PLAYER2;

    this._coinTossResult = result;
    this._firstPlayer = result;
    this._currentPlayer = result;
    // State remains unchanged - will transition to PLAYER_TURN in completeInitialSetup
    this._updatedAt = new Date();
  }

  /**
   * Set the first player (after coin flip)
   * Valid states: PRE_GAME_SETUP
   * @deprecated Use performCoinToss() instead
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

    this._coinTossResult = playerIdentifier;
    this._firstPlayer = playerIdentifier;
    this._currentPlayer = playerIdentifier;
    this._state = MatchState.DRAWING_CARDS;
    this._updatedAt = new Date();
  }

  /**
   * Mark player's initial hand as valid (after drawing valid initial cards with at least one Basic Pokemon)
   * Valid states: DRAWING_CARDS
   */
  markPlayerDeckValid(playerIdentifier: PlayerIdentifier): void {
    if (this._state !== MatchState.DRAWING_CARDS) {
      throw new Error(
        `Cannot mark deck valid in state ${this._state}. Must be DRAWING_CARDS`,
      );
    }

    if (playerIdentifier === PlayerIdentifier.PLAYER1) {
      this._player1HasDrawnValidHand = true;
    } else {
      this._player2HasDrawnValidHand = true;
    }

    // If both players have valid initial hands, transition to SELECT_ACTIVE_POKEMON
    if (this._player1HasDrawnValidHand && this._player2HasDrawnValidHand) {
      this._state = MatchState.SELECT_ACTIVE_POKEMON;
    }

    this._updatedAt = new Date();
  }

  /**
   * Transition to SELECT_BENCH_POKEMON after both players set active Pokemon
   * Valid states: SELECT_ACTIVE_POKEMON
   */
  transitionToSelectBenchPokemon(gameState: GameState): void {
    if (this._state !== MatchState.SELECT_ACTIVE_POKEMON) {
      throw new Error(
        `Cannot transition to SELECT_BENCH_POKEMON in state ${this._state}. Must be SELECT_ACTIVE_POKEMON`,
      );
    }

    if (!gameState.player1State.activePokemon || !gameState.player2State.activePokemon) {
      throw new Error('Both players must have set active Pokemon');
    }

    this._gameState = gameState;
    this._state = MatchState.SELECT_BENCH_POKEMON;
    this._updatedAt = new Date();
  }

  /**
   * Mark player as ready to start (after selecting bench Pokemon)
   * Valid states: SELECT_BENCH_POKEMON
   */
  markPlayerReadyToStart(playerIdentifier: PlayerIdentifier): void {
    if (this._state !== MatchState.SELECT_BENCH_POKEMON) {
      throw new Error(
        `Cannot mark ready to start in state ${this._state}. Must be SELECT_BENCH_POKEMON`,
      );
    }

    if (playerIdentifier === PlayerIdentifier.PLAYER1) {
      this._player1ReadyToStart = true;
    } else {
      this._player2ReadyToStart = true;
    }

    this._updatedAt = new Date();
  }

  /**
   * Update game state during DRAWING_CARDS
   * Valid states: DRAWING_CARDS
   */
  updateGameStateDuringDrawing(gameState: GameState): void {
    if (this._state !== MatchState.DRAWING_CARDS) {
      throw new Error(
        `Cannot update game state during drawing in state ${this._state}. Must be DRAWING_CARDS`,
      );
    }

    this._gameState = gameState;
    this._updatedAt = new Date();
  }

  /**
   * Update game state during setup phases (SELECT_ACTIVE_POKEMON, SELECT_BENCH_POKEMON)
   * Valid states: SELECT_ACTIVE_POKEMON, SELECT_BENCH_POKEMON
   */
  updateGameStateDuringSetup(gameState: GameState): void {
    if (
      this._state !== MatchState.SELECT_ACTIVE_POKEMON &&
      this._state !== MatchState.SELECT_BENCH_POKEMON
    ) {
      throw new Error(
        `Cannot update game state during setup in state ${this._state}. Must be SELECT_ACTIVE_POKEMON or SELECT_BENCH_POKEMON`,
      );
    }

    this._gameState = gameState;
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
   * Valid states: SELECT_BENCH_POKEMON
   */
  completeInitialSetup(): void {
    if (this._state !== MatchState.SELECT_BENCH_POKEMON) {
      throw new Error(
        `Cannot complete initial setup in state ${this._state}. Must be SELECT_BENCH_POKEMON`,
      );
    }

    if (this._gameState === null) {
      throw new Error('Game state must be initialized before completing setup');
    }

    if (!this._player1ReadyToStart || !this._player2ReadyToStart) {
      throw new Error('Both players must be ready to start');
    }

    // Perform coin toss if not already done
    if (this._coinTossResult === null) {
      this.performCoinToss();
    }

    // Update game state to DRAW phase for first turn
    // Set currentPlayer in game state to first player
    this._gameState = this._gameState
      .withPhase(TurnPhase.DRAW)
      .withCurrentPlayer(this._firstPlayer!);
    this._currentPlayer = this._firstPlayer;
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

  // ========================================
  // Factory Methods
  // ========================================

  /**
   * Private method to restore match state from persisted data
   * Bypasses state machine validation - only for repository use
   */
  private restoreState(
    updatedAt: Date,
    player1Id: string | null,
    player2Id: string | null,
    player1DeckId: string | null,
    player2DeckId: string | null,
    state: MatchState,
    currentPlayer: PlayerIdentifier | null,
    firstPlayer: PlayerIdentifier | null,
    coinTossResult: PlayerIdentifier | null,
    player1HasDrawnValidHand: boolean,
    player2HasDrawnValidHand: boolean,
    player1ReadyToStart: boolean,
    player2ReadyToStart: boolean,
    startedAt: Date | null,
    endedAt: Date | null,
    winnerId: string | null,
    result: MatchResult | null,
    winCondition: WinCondition | null,
    cancellationReason: string | null,
    gameState: GameState | null,
    player1Approved?: boolean,
    player2Approved?: boolean,
  ): void {
    this._updatedAt = updatedAt;
    this._player1Id = player1Id;
    this._player2Id = player2Id;
    this._player1DeckId = player1DeckId;
    this._player2DeckId = player2DeckId;
    this._state = state;
    this._currentPlayer = currentPlayer;
    this._firstPlayer = firstPlayer;
    this._coinTossResult = coinTossResult ?? null;
    this._player1HasDrawnValidHand = player1HasDrawnValidHand ?? false;
    this._player2HasDrawnValidHand = player2HasDrawnValidHand ?? false;
    this._player1ReadyToStart = player1ReadyToStart ?? false;
    this._player2ReadyToStart = player2ReadyToStart ?? false;
    this._player1Approved = player1Approved ?? false;
    this._player2Approved = player2Approved ?? false;
    this._startedAt = startedAt;
    this._endedAt = endedAt;
    this._winnerId = winnerId;
    this._result = result;
    this._winCondition = winCondition;
    this._cancellationReason = cancellationReason;
    this._gameState = gameState;
  }

  /**
   * Restore a match from persisted data
   * This method bypasses state machine validation to restore a match from storage
   * Should only be used by repository implementations
   */
  static restore(
    id: string,
    tournamentId: string,
    createdAt: Date,
    updatedAt: Date,
    player1Id: string | null,
    player2Id: string | null,
    player1DeckId: string | null,
    player2DeckId: string | null,
    state: MatchState,
    currentPlayer: PlayerIdentifier | null,
    firstPlayer: PlayerIdentifier | null,
    coinTossResult: PlayerIdentifier | null,
    player1HasDrawnValidHand: boolean,
    player2HasDrawnValidHand: boolean,
    player1ReadyToStart: boolean,
    player2ReadyToStart: boolean,
    startedAt: Date | null,
    endedAt: Date | null,
    winnerId: string | null,
    result: MatchResult | null,
    winCondition: WinCondition | null,
    cancellationReason: string | null,
    gameState: GameState | null,
    player1Approved?: boolean,
    player2Approved?: boolean,
  ): Match {
    const match = new Match(id, tournamentId, createdAt);
    match.restoreState(
      updatedAt,
      player1Id,
      player2Id,
      player1DeckId,
      player2DeckId,
      state,
      currentPlayer,
      firstPlayer,
      coinTossResult,
      player1HasDrawnValidHand,
      player2HasDrawnValidHand,
      player1ReadyToStart,
      player2ReadyToStart,
      startedAt,
      endedAt,
      winnerId,
      result,
      winCondition,
      cancellationReason,
      gameState,
      player1Approved,
      player2Approved,
    );
    return match;
  }
}

