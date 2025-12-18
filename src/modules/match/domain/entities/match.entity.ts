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

  // Setup Progress Tracking
  private _player1HasDrawnValidHand: boolean;
  private _player2HasDrawnValidHand: boolean;
  private _player1HasSetPrizeCards: boolean;
  private _player2HasSetPrizeCards: boolean;
  private _player1ReadyToStart: boolean;
  private _player2ReadyToStart: boolean;
  private _player1HasConfirmedFirstPlayer: boolean;
  private _player2HasConfirmedFirstPlayer: boolean;
  private _player1HasApprovedMatch: boolean;
  private _player2HasApprovedMatch: boolean;

  // Match Result
  private _startedAt: Date | null;
  private _endedAt: Date | null;
  private _winnerId: string | null;
  private _result: MatchResult | null;
  private _winCondition: WinCondition | null;
  private _cancellationReason: string | null;

  // Game State
  private _gameState: GameState | null;

  constructor(id: string, tournamentId: string, createdAt?: Date) {
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
    this._player1HasDrawnValidHand = false;
    this._player2HasDrawnValidHand = false;
    this._player1HasSetPrizeCards = false;
    this._player2HasSetPrizeCards = false;
    this._player1ReadyToStart = false;
    this._player2ReadyToStart = false;
    this._player1HasConfirmedFirstPlayer = false;
    this._player2HasConfirmedFirstPlayer = false;
    this._player1HasApprovedMatch = false;
    this._player2HasApprovedMatch = false;
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

  get player1HasDrawnValidHand(): boolean {
    return this._player1HasDrawnValidHand;
  }

  get player2HasDrawnValidHand(): boolean {
    return this._player2HasDrawnValidHand;
  }

  get player1HasSetPrizeCards(): boolean {
    return this._player1HasSetPrizeCards;
  }

  get player2HasSetPrizeCards(): boolean {
    return this._player2HasSetPrizeCards;
  }

  get player1ReadyToStart(): boolean {
    return this._player1ReadyToStart;
  }

  get player2ReadyToStart(): boolean {
    return this._player2ReadyToStart;
  }

  get player1HasConfirmedFirstPlayer(): boolean {
    return this._player1HasConfirmedFirstPlayer;
  }

  get player2HasConfirmedFirstPlayer(): boolean {
    return this._player2HasConfirmedFirstPlayer;
  }

  get player1HasApprovedMatch(): boolean {
    return this._player1HasApprovedMatch;
  }

  get player2HasApprovedMatch(): boolean {
    return this._player2HasApprovedMatch;
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
    if (
      this._state !== MatchState.CREATED &&
      this._state !== MatchState.WAITING_FOR_PLAYERS
    ) {
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
      this.cancelMatchSystem('Deck validation failed');
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
      if (this._player1HasApprovedMatch) {
        throw new Error('Player 1 has already approved');
      }
      this._player1HasApprovedMatch = true;
    } else {
      if (this._player2HasApprovedMatch) {
        throw new Error('Player 2 has already approved');
      }
      this._player2HasApprovedMatch = true;
    }

    // If both players have approved, transition directly to DRAWING_CARDS
    // Note: Coin toss will happen later in completeInitialSetup after both players
    // have set active and bench Pokemon
    if (this._player1HasApprovedMatch && this._player2HasApprovedMatch) {
      this._state = MatchState.DRAWING_CARDS;
    }

    this._updatedAt = new Date();
  }

  /**
   * Check if both players have approved the match
   */
  hasBothApprovals(): boolean {
    return this._player1HasApprovedMatch && this._player2HasApprovedMatch;
  }

  /**
   * Perform coin toss to determine first player
   * Valid states: SELECT_BENCH_POKEMON, FIRST_PLAYER_SELECTION
   * Coin toss happens after both players have set active and bench Pokemon
   * currentPlayer must be null before coin toss
   */
  performCoinToss(): void {
    if (
      this._state !== MatchState.SELECT_BENCH_POKEMON &&
      this._state !== MatchState.FIRST_PLAYER_SELECTION
    ) {
      throw new Error(
        `Cannot perform coin toss in state ${this._state}. Must be SELECT_BENCH_POKEMON or FIRST_PLAYER_SELECTION`,
      );
    }

    // Ensure currentPlayer is unknown (null) before coin toss
    if (this._currentPlayer !== null) {
      throw new Error('currentPlayer must be null before coin toss');
    }

    // Use deterministic random based on match ID for consistency
    const seed = this._id
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (seed * 9301 + 49297) % 233280;
    const result =
      random / 233280 < 0.5
        ? PlayerIdentifier.PLAYER1
        : PlayerIdentifier.PLAYER2;

    this._firstPlayer = result;
    this._currentPlayer = result; // Set currentPlayer after coin toss determines first player
    // State remains unchanged - will transition to PLAYER_TURN after both players confirm
    this._updatedAt = new Date();
  }

  /**
   * Confirm first player selection (after coin toss)
   * Valid states: FIRST_PLAYER_SELECTION
   * When both players confirm, transitions to PLAYER_TURN
   */
  confirmFirstPlayer(playerIdentifier: PlayerIdentifier): void {
    if (this._state !== MatchState.FIRST_PLAYER_SELECTION) {
      throw new Error(
        `Cannot confirm first player in state ${this._state}. Must be FIRST_PLAYER_SELECTION`,
      );
    }

    // Mark player as having confirmed
    if (playerIdentifier === PlayerIdentifier.PLAYER1) {
      if (this._player1HasConfirmedFirstPlayer) {
        throw new Error('Player 1 has already confirmed first player');
      }
      this._player1HasConfirmedFirstPlayer = true;
    } else {
      if (this._player2HasConfirmedFirstPlayer) {
        throw new Error('Player 2 has already confirmed first player');
      }
      this._player2HasConfirmedFirstPlayer = true;
    }

    // Perform coin toss on first confirmation (so first player can see the result)
    if (this._firstPlayer === null) {
      // Ensure currentPlayer is null before coin toss
      if (this._currentPlayer !== null) {
        throw new Error('currentPlayer must be null before coin toss');
      }
      this.performCoinToss();
    }

    // Only transition to PLAYER_TURN when BOTH players have confirmed
    if (
      this._player1HasConfirmedFirstPlayer &&
      this._player2HasConfirmedFirstPlayer
    ) {
      // Transition to PLAYER_TURN
      this.completeInitialSetup();
    }

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

    if (
      playerIdentifier !== PlayerIdentifier.PLAYER1 &&
      playerIdentifier !== PlayerIdentifier.PLAYER2
    ) {
      throw new Error('Invalid player identifier');
    }

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

    // If both players have valid initial hands, transition to SET_PRIZE_CARDS
    if (this._player1HasDrawnValidHand && this._player2HasDrawnValidHand) {
      this._state = MatchState.SET_PRIZE_CARDS;
    }

    this._updatedAt = new Date();
  }

  /**
   * Mark player's prize cards as set
   * Valid states: SET_PRIZE_CARDS
   */
  markPlayerPrizeCardsSet(playerIdentifier: PlayerIdentifier): void {
    if (this._state !== MatchState.SET_PRIZE_CARDS) {
      throw new Error(
        `Cannot mark prize cards set in state ${this._state}. Must be SET_PRIZE_CARDS`,
      );
    }

    if (playerIdentifier === PlayerIdentifier.PLAYER1) {
      this._player1HasSetPrizeCards = true;
    } else {
      this._player2HasSetPrizeCards = true;
    }

    // Note: State transition is handled by transitionToSelectActivePokemon()
    // This method only marks the player as having set prize cards

    this._updatedAt = new Date();
  }

  /**
   * Transition to SELECT_ACTIVE_POKEMON after both players set prize cards
   * Valid states: SET_PRIZE_CARDS
   */
  transitionToSelectActivePokemon(gameState: GameState): void {
    if (this._state !== MatchState.SET_PRIZE_CARDS) {
      throw new Error(
        `Cannot transition to SELECT_ACTIVE_POKEMON in state ${this._state}. Must be SET_PRIZE_CARDS`,
      );
    }

    if (!this._player1HasSetPrizeCards || !this._player2HasSetPrizeCards) {
      throw new Error('Both players must have set prize cards');
    }

    this._gameState = gameState;
    this._state = MatchState.SELECT_ACTIVE_POKEMON;
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

    if (
      !gameState.player1State.activePokemon ||
      !gameState.player2State.activePokemon
    ) {
      throw new Error('Both players must have set active Pokemon');
    }

    this._gameState = gameState;
    this._state = MatchState.SELECT_BENCH_POKEMON;
    this._updatedAt = new Date();
  }

  /**
   * Mark player as ready to start (after selecting bench Pokemon)
   * Valid states: SELECT_BENCH_POKEMON
   * When both players are ready, coin toss is automatically performed
   */
  markPlayerReadyToStart(playerIdentifier: PlayerIdentifier): void {
    if (this._state !== MatchState.SELECT_BENCH_POKEMON) {
      throw new Error(
        `Cannot mark ready to start in state ${this._state}. Must be SELECT_BENCH_POKEMON`,
      );
    }

    // Set the player's ready flag
    if (playerIdentifier === PlayerIdentifier.PLAYER1) {
      this._player1ReadyToStart = true;
    } else {
      this._player2ReadyToStart = true;
    }

    // When BOTH players are ready, transition to FIRST_PLAYER_SELECTION state
    // Coin toss will happen when first player confirms in that state
    const bothReady = this._player1ReadyToStart && this._player2ReadyToStart;

    if (bothReady) {
      // Transition to FIRST_PLAYER_SELECTION state
      this._state = MatchState.FIRST_PLAYER_SELECTION;
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
   * Update game state during setup phases (SET_PRIZE_CARDS, SELECT_ACTIVE_POKEMON, SELECT_BENCH_POKEMON)
   * Valid states: SET_PRIZE_CARDS, SELECT_ACTIVE_POKEMON, SELECT_BENCH_POKEMON
   */
  updateGameStateDuringSetup(gameState: GameState): void {
    if (
      this._state !== MatchState.SET_PRIZE_CARDS &&
      this._state !== MatchState.SELECT_ACTIVE_POKEMON &&
      this._state !== MatchState.SELECT_BENCH_POKEMON
    ) {
      throw new Error(
        `Cannot update game state during setup in state ${this._state}. Must be SET_PRIZE_CARDS, SELECT_ACTIVE_POKEMON, or SELECT_BENCH_POKEMON`,
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
   * Valid states: SELECT_BENCH_POKEMON, FIRST_PLAYER_SELECTION
   */
  completeInitialSetup(): void {
    if (
      this._state !== MatchState.SELECT_BENCH_POKEMON &&
      this._state !== MatchState.FIRST_PLAYER_SELECTION
    ) {
      throw new Error(
        `Cannot complete initial setup in state ${this._state}. Must be SELECT_BENCH_POKEMON or FIRST_PLAYER_SELECTION`,
      );
    }

    if (this._gameState === null) {
      throw new Error('Game state must be initialized before completing setup');
    }

    if (!this._player1ReadyToStart || !this._player2ReadyToStart) {
      throw new Error('Both players must be ready to start');
    }

    // If in FIRST_PLAYER_SELECTION state, both players must have confirmed
    if (this._state === MatchState.FIRST_PLAYER_SELECTION) {
      if (
        !this._player1HasConfirmedFirstPlayer ||
        !this._player2HasConfirmedFirstPlayer
      ) {
        throw new Error(
          'Both players must confirm first player before completing setup',
        );
      }
    }

    // Coin toss should have already been performed
    if (this._firstPlayer === null) {
      throw new Error(
        'Coin toss must be performed before completing initial setup',
      );
    }

    if (this._firstPlayer === null || this._currentPlayer === null) {
      throw new Error(
        'First player and current player must be set by coin toss',
      );
    }

    // Update game state to DRAW phase for first turn
    // currentPlayer was already set by performCoinToss()
    this._gameState = this._gameState
      .withPhase(TurnPhase.DRAW)
      .withCurrentPlayer(this._firstPlayer);
    this._state = MatchState.PLAYER_TURN;
    this._updatedAt = new Date();
  }

  /**
   * Update game state (for turn actions)
   * Valid states: PLAYER_TURN, BETWEEN_TURNS
   */
  updateGameState(gameState: GameState): void {
    if (
      this._state !== MatchState.PLAYER_TURN &&
      this._state !== MatchState.BETWEEN_TURNS
    ) {
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
    if (
      this._state === MatchState.MATCH_ENDED ||
      this._state === MatchState.CANCELLED
    ) {
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
   * Cancel the match (player-initiated)
   * Valid states: WAITING_FOR_PLAYERS only
   * This method is for player-initiated cancellations and requires WAITING_FOR_PLAYERS state
   */
  cancelMatch(reason: string): void {
    if (this._state === MatchState.MATCH_ENDED) {
      throw new Error('Cannot cancel a match that has already ended');
    }

    if (this._state !== MatchState.WAITING_FOR_PLAYERS) {
      throw new Error(
        `Match can only be cancelled when in WAITING_FOR_PLAYERS state. Current state: ${this._state}`,
      );
    }

    this._cancellationReason = reason;
    this._result = MatchResult.CANCELLED;
    this._endedAt = new Date();
    this._state = MatchState.CANCELLED;
    this._updatedAt = new Date();
  }

  /**
   * Cancel the match (system-initiated)
   * Valid states: Any (except MATCH_ENDED)
   * This method is for system-initiated cancellations (e.g., deck validation failure)
   * Does not require WAITING_FOR_PLAYERS state
   */
  cancelMatchSystem(reason: string): void {
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
    player1HasDrawnValidHand: boolean,
    player2HasDrawnValidHand: boolean,
    player1HasSetPrizeCards: boolean,
    player2HasSetPrizeCards: boolean,
    player1ReadyToStart: boolean,
    player2ReadyToStart: boolean,
    player1HasConfirmedFirstPlayer: boolean,
    player2HasConfirmedFirstPlayer: boolean,
    startedAt: Date | null,
    endedAt: Date | null,
    winnerId: string | null,
    result: MatchResult | null,
    winCondition: WinCondition | null,
    cancellationReason: string | null,
    gameState: GameState | null,
    player1HasApprovedMatch?: boolean,
    player2HasApprovedMatch?: boolean,
  ): void {
    this._updatedAt = updatedAt;
    this._player1Id = player1Id;
    this._player2Id = player2Id;
    this._player1DeckId = player1DeckId;
    this._player2DeckId = player2DeckId;
    this._state = state;
    this._currentPlayer = currentPlayer;
    this._firstPlayer = firstPlayer;
    this._player1HasDrawnValidHand = player1HasDrawnValidHand ?? false;
    this._player2HasDrawnValidHand = player2HasDrawnValidHand ?? false;
    this._player1HasSetPrizeCards = player1HasSetPrizeCards ?? false;
    this._player2HasSetPrizeCards = player2HasSetPrizeCards ?? false;
    this._player1ReadyToStart = player1ReadyToStart ?? false;
    this._player2ReadyToStart = player2ReadyToStart ?? false;
    this._player1HasConfirmedFirstPlayer =
      player1HasConfirmedFirstPlayer ?? false;
    this._player2HasConfirmedFirstPlayer =
      player2HasConfirmedFirstPlayer ?? false;
    this._player1HasApprovedMatch = player1HasApprovedMatch ?? false;
    this._player2HasApprovedMatch = player2HasApprovedMatch ?? false;
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
    player1HasDrawnValidHand: boolean,
    player2HasDrawnValidHand: boolean,
    player1HasSetPrizeCards: boolean,
    player2HasSetPrizeCards: boolean,
    player1ReadyToStart: boolean,
    player2ReadyToStart: boolean,
    player1HasConfirmedFirstPlayer: boolean,
    player2HasConfirmedFirstPlayer: boolean,
    startedAt: Date | null,
    endedAt: Date | null,
    winnerId: string | null,
    result: MatchResult | null,
    winCondition: WinCondition | null,
    cancellationReason: string | null,
    gameState: GameState | null,
    player1HasApprovedMatch?: boolean,
    player2HasApprovedMatch?: boolean,
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
      player1HasDrawnValidHand,
      player2HasDrawnValidHand,
      player1HasSetPrizeCards ?? false,
      player2HasSetPrizeCards ?? false,
      player1ReadyToStart,
      player2ReadyToStart,
      player1HasConfirmedFirstPlayer ?? false,
      player2HasConfirmedFirstPlayer ?? false,
      startedAt,
      endedAt,
      winnerId,
      result,
      winCondition,
      cancellationReason,
      gameState,
      player1HasApprovedMatch,
      player2HasApprovedMatch,
    );

    // Migration: Fix inconsistent state where a player has confirmed but coin toss hasn't happened
    // This can happen with matches created before the coin toss logic change
    if (
      state === MatchState.FIRST_PLAYER_SELECTION &&
      firstPlayer === null &&
      (player1HasConfirmedFirstPlayer || player2HasConfirmedFirstPlayer)
    ) {
      // Perform coin toss if at least one player has confirmed but coin toss hasn't happened
      match.performCoinToss();
    }

    return match;
  }
}
