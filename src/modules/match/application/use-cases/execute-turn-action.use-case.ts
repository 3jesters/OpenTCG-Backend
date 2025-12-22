import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  Match,
  PlayerIdentifier,
  MatchState,
  PlayerActionType,
} from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { MatchStateMachineService } from '../../domain/services';
import { ExecuteActionDto } from '../dto';
import {
  GameState,
  PlayerGameState,
  CardInstance,
  ActionSummary,
} from '../../domain/value-objects';
import { PokemonPosition } from '../../domain/enums';
import { v4 as uuidv4 } from 'uuid';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { Card } from '../../../card/domain/entities';
import { StatusEffect } from '../../domain/enums/status-effect.enum';
import { EvolutionStage } from '../../../card/domain/enums/evolution-stage.enum';
import { CardType } from '../../../card/domain/enums/card-type.enum';
import { TrainerEffectType } from '../../../card/domain/enums/trainer-effect-type.enum';
import { TargetType } from '../../../card/domain/enums/target-type.enum';
import { ActionHandlerFactory } from '../handlers/action-handler-factory';
import {
  CardHelperService,
  SetActivePokemonPlayerTurnService,
  AttachEnergyPlayerTurnService,
  PlayPokemonPlayerTurnService,
  EvolvePokemonPlayerTurnService,
  RetreatExecutionService,
  AvailableActionsService,
} from '../services';
import {
  EffectConditionEvaluatorService,
} from '../../domain/services';

/**
 * Execute Turn Action Use Case
 * Executes a player action during their turn
 */
@Injectable()
export class ExecuteTurnActionUseCase {
  private readonly logger = new Logger(ExecuteTurnActionUseCase.name);
  private cardsMap: Map<string, Card> = new Map();

  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly stateMachineService: MatchStateMachineService,
    @Inject(IGetCardByIdUseCase)
    private readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly actionHandlerFactory: ActionHandlerFactory,
    private readonly cardHelper: CardHelperService,
    private readonly effectConditionEvaluator: EffectConditionEvaluatorService,
    private readonly setActivePokemonPlayerTurnService: SetActivePokemonPlayerTurnService,
    private readonly attachEnergyPlayerTurnService: AttachEnergyPlayerTurnService,
    private readonly playPokemonPlayerTurnService: PlayPokemonPlayerTurnService,
    private readonly evolvePokemonPlayerTurnService: EvolvePokemonPlayerTurnService,
    private readonly retreatExecutionService: RetreatExecutionService,
    private readonly availableActionsService: AvailableActionsService,
  ) {}

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Main entry point for executing player actions
   * Routes actions to appropriate handlers based on match state
   */
  async execute(
    dto: ExecuteActionDto,
  ): Promise<{ match: Match; availableActions: PlayerActionType[] }> {
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

    // Collect all cardIds that might be needed and batch fetch them
    const cardIds = this.cardHelper.collectCardIds(
      dto,
      match.gameState,
      playerIdentifier,
    );
    this.cardsMap =
      cardIds.size > 0
        ? await this.getCardByIdUseCase.getCardsByIds(Array.from(cardIds))
        : new Map<string, Card>();

      const gameState = match.gameState;
      if (!gameState) {
        throw new BadRequestException('Game state must be initialized');
      }

    // Route to handler if available
    if (this.actionHandlerFactory.hasHandler(dto.actionType)) {
      const handler = this.actionHandlerFactory.getHandler(dto.actionType);
      try {
        const updatedMatch = await handler.execute(
          dto,
          match,
          gameState,
          playerIdentifier,
          this.cardsMap,
        );
        return this.wrapWithAvailableActions(updatedMatch, playerIdentifier);
      } catch (error) {
        // ATTACK handler delegates back - allow fallthrough
        // Also allow fallthrough when handler rejects current state (e.g., PLAY_POKEMON in different states)
        if (
          error instanceof BadRequestException &&
          (error.message.includes('not yet implemented') ||
            error.message.includes('delegating to use case') ||
            error.message.includes('This handler only handles') ||
            error.message.includes('Current state:'))
        ) {
          // Fall through to state-specific handler
        } else {
          throw error;
        }
      }
    }

    // State machine router - route to state-specific handlers
    let updatedMatch: Match;
    switch (match.state) {
      case MatchState.SELECT_ACTIVE_POKEMON:
        updatedMatch = await this.handleSelectActivePokemonState(
          dto,
          match,
          gameState,
          playerIdentifier,
        );
        break;

      case MatchState.SELECT_BENCH_POKEMON:
        updatedMatch = await this.handleSelectBenchPokemonState(
          dto,
          match,
          gameState,
          playerIdentifier,
        );
        break;

      case MatchState.FIRST_PLAYER_SELECTION:
        updatedMatch = await this.handleFirstPlayerSelectionState(
          dto,
          match,
          playerIdentifier,
        );
        break;

      case MatchState.INITIAL_SETUP:
        updatedMatch = await this.handleInitialSetupState(
          dto,
          match,
          gameState,
          playerIdentifier,
        );
        break;

      case MatchState.PLAYER_TURN:
        updatedMatch = await this.handlePlayerTurnState(
          dto,
          match,
          gameState,
          playerIdentifier,
        );
        break;

      // Other states are handled by action handlers (MATCH_APPROVAL, DRAWING_CARDS, SET_PRIZE_CARDS, etc.)
      default:
        throw new BadRequestException(
          `Action ${dto.actionType} could not be processed in state ${match.state}`,
        );
    }

    return this.wrapWithAvailableActions(updatedMatch, playerIdentifier);
  }

  /**
   * Helper method to wrap match with available actions
   */
  private wrapWithAvailableActions(
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): { match: Match; availableActions: PlayerActionType[] } {
    const availableActions =
      this.availableActionsService.getFilteredAvailableActions(
        match,
        playerIdentifier,
      );
    return { match, availableActions };
  }

  // ============================================================================
  // CARD/ENTITY HELPERS
  // ============================================================================

  // ============================================================================
  // STATE HANDLERS
  // ============================================================================

  /**
   * Handle actions in SELECT_ACTIVE_POKEMON state
   */
  private async handleSelectActivePokemonState(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): Promise<Match> {
    if (dto.actionType !== PlayerActionType.SET_ACTIVE_POKEMON) {
      throw new BadRequestException(
        `Action ${dto.actionType} is not valid in SELECT_ACTIVE_POKEMON state`,
      );
      }

      const cardId = (dto.actionData as any)?.cardId;
      if (!cardId) {
        throw new BadRequestException('cardId is required');
      }

      const playerState = gameState.getPlayerState(playerIdentifier);

      // Validate that player needs to select active Pokemon
      if (playerState.activePokemon !== null) {
        throw new BadRequestException(
          'Cannot set active Pokemon when one already exists',
        );
      }

      // Check if card is in hand or on bench
      const isInHand = playerState.hand.includes(cardId);
      const benchIndex = playerState.bench.findIndex(
        (p) => p.cardId === cardId,
      );
      const isOnBench = benchIndex !== -1;

      if (!isInHand && !isOnBench) {
        throw new BadRequestException('Card must be in hand or on bench');
      }

      let activePokemon: CardInstance;
      let updatedHand = playerState.hand;
      let updatedBench = playerState.bench;

      if (isInHand) {
        // Card is in hand - create new CardInstance
        const cardHp = await this.cardHelper.getCardHp(cardId, this.cardsMap);
        activePokemon = new CardInstance(
          uuidv4(),
          cardId,
          PokemonPosition.ACTIVE,
          cardHp,
          cardHp,
          [],
          [], // No status effects for new Pokemon
          [],
          undefined,
          undefined, // evolvedAt - new Pokemon, not evolved
        );
        // Remove from hand
        updatedHand = playerState.hand.filter((id) => id !== cardId);
      } else {
        // Card is on bench - move it to active
        const benchPokemon = playerState.bench[benchIndex];
        // Clear all status effects when Pokemon switches/retreats
        activePokemon = benchPokemon
          .withPosition(PokemonPosition.ACTIVE)
          .withStatusEffectsCleared(); // Clear status effects on switch
        // Remove from bench and renumber positions
        updatedBench = playerState.bench
          .filter((_, i) => i !== benchIndex)
          .map((p, newIndex) => {
            const newPosition = `BENCH_${newIndex}` as PokemonPosition;
            // Clear status effects when Pokemon moves positions (retreat/switch)
            return p
              .withPosition(newPosition)
              .withStatusEffect(StatusEffect.NONE);
          });
      }

      const updatedPlayerState = new PlayerGameState(
        playerState.deck,
        updatedHand,
        activePokemon,
        updatedBench,
        playerState.prizeCards,
        playerState.discardPile,
        playerState.hasAttachedEnergyThisTurn,
      );

      // Update game state
      const updatedGameState =
        playerIdentifier === PlayerIdentifier.PLAYER1
          ? gameState.withPlayer1State(updatedPlayerState)
          : gameState.withPlayer2State(updatedPlayerState);

      // Create action summary (store instanceId and source for reversibility)
      const actionSummary = new ActionSummary(
        uuidv4(),
        playerIdentifier,
        PlayerActionType.SET_ACTIVE_POKEMON,
        new Date(),
        {
          cardId,
          instanceId: activePokemon.instanceId,
          source: isInHand ? 'HAND' : `BENCH_${benchIndex}`,
        },
      );

        // Initial setup phase - use setup update method
        match.updateGameStateDuringSetup(updatedGameState);

        // Check if both players have set active Pokemon (only in SELECT_ACTIVE_POKEMON state)
        const player1State = updatedGameState.player1State;
        const player2State = updatedGameState.player2State;

        if (player1State.activePokemon && player2State.activePokemon) {
          // Both players have set active Pokemon, transition to SELECT_BENCH_POKEMON
          // Prize cards should already be set during SET_PRIZE_CARDS phase
          match.transitionToSelectBenchPokemon(updatedGameState);
        }

        return await this.matchRepository.save(match);
  }

  /**
   * Handle actions in SELECT_BENCH_POKEMON state
   */
  private async handleSelectBenchPokemonState(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): Promise<Match> {

    if (dto.actionType === PlayerActionType.PLAY_POKEMON) {
      const cardId = (dto.actionData as any)?.cardId;
      if (!cardId) {
        throw new BadRequestException('cardId is required');
      }

      const playerState = gameState.getPlayerState(playerIdentifier);

      // Check if card is in hand
      if (!playerState.hand.includes(cardId)) {
        throw new BadRequestException('Card must be in hand');
      }

      // Validate that only Basic Pokemon can be played directly
      // Exception: Trainer cards with PUT_INTO_PLAY effect (source: HAND, target: SELF) can be played as Basic Pokemon
      // Examples: Clefairy Doll, Mysterious Fossil
      const cardEntity = await this.cardHelper.getCardEntity(cardId, this.cardsMap);

      // Check if it's a special trainer card that can be played as Basic Pokemon
      const isSpecialTrainerCard =
        cardEntity.cardType === CardType.TRAINER &&
        cardEntity.trainerEffects.some(
          (effect) =>
            effect.effectType === TrainerEffectType.PUT_INTO_PLAY &&
            effect.source === 'HAND' &&
            effect.target === TargetType.SELF,
        );

      if (!isSpecialTrainerCard) {
        // For non-special trainer cards, must be a Basic Pokemon
        if (cardEntity.cardType !== CardType.POKEMON) {
          throw new BadRequestException(
            'Only Pokemon cards can be played to the bench',
          );
        }
        if (cardEntity.stage !== EvolutionStage.BASIC) {
          throw new BadRequestException(
            `Cannot play ${cardEntity.stage} Pokemon directly. Only Basic Pokemon can be played to the bench. Evolved Pokemon must be evolved from their pre-evolution.`,
          );
        }
      }

      // Check bench space (max 5)
      if (playerState.bench.length >= 5) {
        throw new BadRequestException('Bench is full (max 5 Pokemon)');
      }

      // Load card details to get HP
      const cardHp = await this.cardHelper.getCardHp(cardId, this.cardsMap);

      // Create CardInstance for bench Pokemon
      const benchPosition =
        `BENCH_${playerState.bench.length}` as PokemonPosition;
      const benchPokemon = new CardInstance(
        uuidv4(),
        cardId,
        benchPosition,
        cardHp,
        cardHp,
        [],
        [], // No status effects for new Pokemon
        [],
        undefined, // poisonDamageAmount
        undefined, // evolvedAt - new Pokemon, not evolved
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
        playerState.hasAttachedEnergyThisTurn,
      );

      // Update game state
      const updatedGameState =
        playerIdentifier === PlayerIdentifier.PLAYER1
          ? gameState.withPlayer1State(updatedPlayerState)
          : gameState.withPlayer2State(updatedPlayerState);

      match.updateGameStateDuringSetup(updatedGameState);

      return await this.matchRepository.save(match);
    }

    if (dto.actionType === PlayerActionType.COMPLETE_INITIAL_SETUP) {
      const gameState = match.gameState;
      if (!gameState) {
        throw new BadRequestException('Game state must be initialized');
      }

      // Mark player as ready to start
      // This will automatically transition to FIRST_PLAYER_SELECTION when both are ready
      match.markPlayerReadyToStart(playerIdentifier);

      // Don't call completeInitialSetup() here - it will be called automatically
      // by confirmFirstPlayer() after both players confirm the first player selection
      return await this.matchRepository.save(match);
    }

    throw new BadRequestException(
      `Action ${dto.actionType} is not valid in SELECT_BENCH_POKEMON state`,
    );
  }

  /**
   * Handle actions in FIRST_PLAYER_SELECTION state
   */
  private async handleFirstPlayerSelectionState(
    dto: ExecuteActionDto,
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): Promise<Match> {
    if (dto.actionType !== PlayerActionType.CONFIRM_FIRST_PLAYER) {
      throw new BadRequestException(
        `Action ${dto.actionType} is not valid in FIRST_PLAYER_SELECTION state`,
      );
    }
      try {
        match.confirmFirstPlayer(playerIdentifier);
      } catch (error) {
        if (error.message.includes('already confirmed')) {
          throw new BadRequestException(error.message);
        }
        throw error;
      }
      return await this.matchRepository.save(match);
    }

  /**
   * Handle actions in INITIAL_SETUP state (legacy)
   */
  private async handleInitialSetupState(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): Promise<Match> {
    if (dto.actionType !== PlayerActionType.COMPLETE_INITIAL_SETUP) {
      throw new BadRequestException(
        `Action ${dto.actionType} is not valid in INITIAL_SETUP state`,
      );
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

  /**
   * Handle actions in PLAYER_TURN state
   */
  private async handlePlayerTurnState(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): Promise<Match> {
    switch (dto.actionType) {
      case PlayerActionType.SET_ACTIVE_POKEMON: {
        const cardId = (dto.actionData as any)?.cardId;
        if (!cardId) {
          throw new BadRequestException('cardId is required');
        }
        return this.setActivePokemonPlayerTurnService.executeSetActivePokemon({
          cardId,
          match,
          gameState,
          playerIdentifier,
          cardsMap: this.cardsMap,
          getCardHp: (cardId: string) =>
            this.cardHelper.getCardHp(cardId, this.cardsMap),
        });
      }

      case PlayerActionType.ATTACH_ENERGY:
        return this.attachEnergyPlayerTurnService.executeAttachEnergy({
          dto,
          match,
          gameState,
          playerIdentifier,
        });

      case PlayerActionType.PLAY_POKEMON:
        return this.playPokemonPlayerTurnService.executePlayPokemon({
          dto,
          match,
          gameState,
          playerIdentifier,
          getCardEntity: (cardId: string) =>
            this.cardHelper.getCardEntity(cardId, this.cardsMap),
          getCardHp: (cardId: string) =>
            this.cardHelper.getCardHp(cardId, this.cardsMap),
        });

      case PlayerActionType.EVOLVE_POKEMON:
        return this.evolvePokemonPlayerTurnService.executeEvolvePokemon({
          dto,
          match,
          gameState,
          playerIdentifier,
          cardsMap: this.cardsMap,
        });

      case PlayerActionType.ATTACK:
        // Use handler directly (no delegation)
        const attackHandler = this.actionHandlerFactory.getHandler(
          PlayerActionType.ATTACK,
        );
        return await attackHandler.execute(
          dto,
          match,
          gameState,
          playerIdentifier,
          this.cardsMap,
        );

      case PlayerActionType.GENERATE_COIN_FLIP:
        // Use handler directly (no delegation)
        const coinFlipHandler = this.actionHandlerFactory.getHandler(
          PlayerActionType.GENERATE_COIN_FLIP,
        );
        return await coinFlipHandler.execute(
          dto,
          match,
          gameState,
          playerIdentifier,
          this.cardsMap,
        );

      case PlayerActionType.DRAW_CARD:
        // Use handler directly (no delegation)
        const drawCardHandler = this.actionHandlerFactory.getHandler(
          PlayerActionType.DRAW_CARD,
        );
        return await drawCardHandler.execute(
          dto,
          match,
          gameState,
          playerIdentifier,
          this.cardsMap,
        );

      case PlayerActionType.RETREAT:
        return this.retreatExecutionService.executeRetreat({
          dto,
          match,
          gameState,
          playerIdentifier,
        });

      default:
          throw new BadRequestException(
          `Action ${dto.actionType} is not yet implemented in PLAYER_TURN state`,
        );
    }
  }

}
