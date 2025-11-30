import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Match,
  PlayerIdentifier,
  MatchState,
  PlayerActionType,
  MatchResult,
  WinCondition,
  TurnPhase,
} from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { MatchStateMachineService } from '../../domain/services';
import { ExecuteActionDto } from '../dto';
import { DrawInitialCardsUseCase } from './draw-initial-cards.use-case';
import { PerformCoinTossUseCase } from './perform-coin-toss.use-case';
import { GameState, PlayerGameState, CardInstance } from '../../domain/value-objects';
import { PokemonPosition } from '../../domain/enums';
import { v4 as uuidv4 } from 'uuid';

/**
 * Execute Turn Action Use Case
 * Executes a player action during their turn
 */
@Injectable()
export class ExecuteTurnActionUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly stateMachineService: MatchStateMachineService,
    private readonly drawInitialCardsUseCase: DrawInitialCardsUseCase,
    private readonly performCoinTossUseCase: PerformCoinTossUseCase,
  ) {}

  async execute(dto: ExecuteActionDto): Promise<Match> {
    // Find match
    const match = await this.matchRepository.findById(dto.matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID ${dto.matchId} not found`);
    }

    // Get player identifier
    const playerIdentifier = match.getPlayerIdentifier(dto.playerId);
    if (!playerIdentifier) {
      throw new BadRequestException('Player is not part of this match');
    }

    // Validate action
    const validation = this.stateMachineService.validateAction(
      match.state,
      match.gameState?.phase || null,
      dto.actionType,
      match.currentPlayer,
      playerIdentifier,
    );

    if (!validation.isValid) {
      throw new BadRequestException(
        `Invalid action: ${validation.error || 'Unknown error'}`,
      );
    }

    // Handle concede
    if (dto.actionType === PlayerActionType.CONCEDE) {
      const opponentId = match.getOpponentId(dto.playerId);
      if (opponentId) {
        match.endMatch(
          opponentId,
          playerIdentifier === PlayerIdentifier.PLAYER1
            ? MatchResult.PLAYER2_WIN
            : MatchResult.PLAYER1_WIN,
          WinCondition.CONCEDE,
        );
      }
      return await this.matchRepository.save(match);
    }

    // Handle approve match
    if (dto.actionType === PlayerActionType.APPROVE_MATCH) {
      match.approveMatch(playerIdentifier);
      // After both approve, match transitions directly to DRAWING_CARDS
      // Coin toss will happen after both players complete initial setup
      return await this.matchRepository.save(match);
    }

    // Handle draw initial cards
    if (dto.actionType === PlayerActionType.DRAW_INITIAL_CARDS) {
      const result = await this.drawInitialCardsUseCase.execute(
        dto.matchId,
        dto.playerId,
      );
      return result.match;
    }

    // Handle set active Pokemon in SELECT_ACTIVE_POKEMON state
    if (
      dto.actionType === PlayerActionType.SET_ACTIVE_POKEMON &&
      match.state === MatchState.SELECT_ACTIVE_POKEMON
    ) {
      const gameState = match.gameState;
      if (!gameState) {
        throw new BadRequestException('Game state must be initialized');
      }

      const cardId = (dto.actionData as any)?.cardId;
      if (!cardId) {
        throw new BadRequestException('cardId is required');
      }

      const playerState = gameState.getPlayerState(playerIdentifier);
      
      // Check if card is in hand
      if (!playerState.hand.includes(cardId)) {
        throw new BadRequestException('Card must be in hand');
      }

      // Create CardInstance for active Pokemon
      // TODO: Load card details to get HP
      const activePokemon = new CardInstance(
        uuidv4(),
        cardId,
        PokemonPosition.ACTIVE,
        100, // TODO: Get actual HP from card
        100, // TODO: Get actual HP from card
        [],
        'NONE' as any,
        0,
      );

      // Remove card from hand and set as active
      const updatedHand = playerState.hand.filter((id) => id !== cardId);
      const updatedPlayerState = new PlayerGameState(
        playerState.deck,
        updatedHand,
        activePokemon,
        playerState.bench,
        playerState.prizeCards,
        playerState.discardPile,
      );

      // Update game state
      const updatedGameState =
        playerIdentifier === PlayerIdentifier.PLAYER1
          ? gameState.withPlayer1State(updatedPlayerState)
          : gameState.withPlayer2State(updatedPlayerState);

      match.updateGameStateDuringSetup(updatedGameState);

      // Check if both players have set active Pokemon
      const player1State = updatedGameState.player1State;
      const player2State = updatedGameState.player2State;

      if (player1State.activePokemon && player2State.activePokemon) {
        // Both players have set active Pokemon, transition to SELECT_BENCH_POKEMON
        // Set up prize cards (6 for each player)
        const player1DeckCopy = [...player1State.deck];
        const player2DeckCopy = [...player2State.deck];
        const player1PrizeCards = player1DeckCopy.splice(0, 6);
        const player2PrizeCards = player2DeckCopy.splice(0, 6);

        const finalPlayer1State = new PlayerGameState(
          player1DeckCopy,
          player1State.hand,
          player1State.activePokemon,
          player1State.bench,
          player1PrizeCards,
          player1State.discardPile,
        );

        const finalPlayer2State = new PlayerGameState(
          player2DeckCopy,
          player2State.hand,
          player2State.activePokemon,
          player2State.bench,
          player2PrizeCards,
          player2State.discardPile,
        );

        const finalGameState = new GameState(
          finalPlayer1State,
          finalPlayer2State,
          1,
          TurnPhase.DRAW,
          match.firstPlayer!,
          null,
          [],
        );

        match.transitionToSelectBenchPokemon(finalGameState);
      }

      return await this.matchRepository.save(match);
    }

    // Handle play Pokemon in SELECT_BENCH_POKEMON state
    if (
      dto.actionType === PlayerActionType.PLAY_POKEMON &&
      match.state === MatchState.SELECT_BENCH_POKEMON
    ) {
      const gameState = match.gameState;
      if (!gameState) {
        throw new BadRequestException('Game state must be initialized');
      }

      const cardId = (dto.actionData as any)?.cardId;
      if (!cardId) {
        throw new BadRequestException('cardId is required');
      }

      const playerState = gameState.getPlayerState(playerIdentifier);
      
      // Check if card is in hand
      if (!playerState.hand.includes(cardId)) {
        throw new BadRequestException('Card must be in hand');
      }

      // Check bench space (max 5)
      if (playerState.bench.length >= 5) {
        throw new BadRequestException('Bench is full (max 5 Pokemon)');
      }

      // Create CardInstance for bench Pokemon
      const benchPosition = `BENCH_${playerState.bench.length}` as PokemonPosition;
      const benchPokemon = new CardInstance(
        uuidv4(),
        cardId,
        benchPosition,
        100, // TODO: Get actual HP from card
        100, // TODO: Get actual HP from card
        [],
        'NONE' as any,
        0,
      );

      // Remove card from hand and add to bench
      const updatedHand = playerState.hand.filter((id) => id !== cardId);
      const updatedBench = [...playerState.bench, benchPokemon];
      const updatedPlayerState = new PlayerGameState(
        playerState.deck,
        updatedHand,
        playerState.activePokemon,
        updatedBench,
        playerState.prizeCards,
        playerState.discardPile,
      );

      // Update game state
      const updatedGameState =
        playerIdentifier === PlayerIdentifier.PLAYER1
          ? gameState.withPlayer1State(updatedPlayerState)
          : gameState.withPlayer2State(updatedPlayerState);

      match.updateGameStateDuringSetup(updatedGameState);

      return await this.matchRepository.save(match);
    }

    // Handle complete initial setup in SELECT_BENCH_POKEMON state
    if (
      dto.actionType === PlayerActionType.COMPLETE_INITIAL_SETUP &&
      match.state === MatchState.SELECT_BENCH_POKEMON
    ) {
      const gameState = match.gameState;
      if (!gameState) {
        throw new BadRequestException('Game state must be initialized');
      }

      // Mark player as ready to start
      match.markPlayerReadyToStart(playerIdentifier);

      // Check if both players are ready
      if (match.player1ReadyToStart && match.player2ReadyToStart) {
        match.completeInitialSetup();
      }

      return await this.matchRepository.save(match);
    }

    // Handle complete initial setup in INITIAL_SETUP state (legacy)
    if (
      dto.actionType === PlayerActionType.COMPLETE_INITIAL_SETUP &&
      match.state === MatchState.INITIAL_SETUP
    ) {
      const gameState = match.gameState;
      if (!gameState) {
        throw new BadRequestException('Game state must be initialized');
      }

      const playerState = gameState.getPlayerState(playerIdentifier);
      if (!playerState.activePokemon) {
        throw new BadRequestException(
          'Must set active Pokemon before completing initial setup',
        );
      }

      // Check if both players have completed setup
      const player1State = gameState.player1State;
      const player2State = gameState.player2State;

      if (player1State.activePokemon && player2State.activePokemon) {
        // Both players have set active Pokemon, transition to PLAYER_TURN
        match.completeInitialSetup();
      }

      return await this.matchRepository.save(match);
    }

    // For other actions, the game state would be updated here
    // This is a simplified version - full implementation would handle
    // each action type and update game state accordingly

    // Save and return
    return await this.matchRepository.save(match);
  }
}

