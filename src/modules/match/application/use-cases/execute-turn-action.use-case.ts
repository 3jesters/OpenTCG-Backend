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
  MatchResult,
  WinCondition,
  TurnPhase,
} from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { MatchStateMachineService } from '../../domain/services';
import { ExecuteActionDto } from '../dto';
import { DrawInitialCardsUseCase } from './draw-initial-cards.use-case';
import { SetPrizeCardsUseCase } from './set-prize-cards.use-case';
import { PerformCoinTossUseCase } from './perform-coin-toss.use-case';
import {
  GameState,
  PlayerGameState,
  CardInstance,
  ActionSummary,
  CoinFlipState,
  CoinFlipConfiguration,
} from '../../domain/value-objects';
import { CoinFlipStatus } from '../../domain/enums/coin-flip-status.enum';
import { CoinFlipContext } from '../../domain/enums/coin-flip-context.enum';
import {
  CoinFlipCountType,
  DamageCalculationType,
} from '../../domain/value-objects/coin-flip-configuration.value-object';
import { CoinFlipResolverService } from '../../domain/services/coin-flip-resolver.service';
import { AttackCoinFlipParserService } from '../../domain/services/attack-coin-flip-parser.service';
import { AttackEnergyValidatorService } from '../../domain/services/attack-energy-validator.service';
import { TrainerEffectExecutorService } from '../../domain/services/trainer-effect-executor.service';
import { TrainerEffectValidatorService } from '../../domain/services/trainer-effect-validator.service';
import { AbilityEffectExecutorService } from '../../domain/services/ability-effect-executor.service';
import { AbilityEffectValidatorService } from '../../domain/services/ability-effect-validator.service';
import { TrainerActionData } from '../../domain/types/trainer-action-data.types';
import { AbilityActionData } from '../../domain/types/ability-action-data.types';
import { PokemonPosition } from '../../domain/enums';
import { v4 as uuidv4 } from 'uuid';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { Card } from '../../../card/domain/entities';
import { Attack } from '../../../card/domain/value-objects/attack.value-object';
import { AbilityActivationType } from '../../../card/domain/enums/ability-activation-type.enum';
import { AttackEffectType } from '../../../card/domain/enums/attack-effect-type.enum';
import { StatusEffect } from '../../domain/enums/status-effect.enum';
import { ConditionType } from '../../../card/domain/enums/condition-type.enum';
import { EvolutionStage } from '../../../card/domain/enums/evolution-stage.enum';
import { CardType } from '../../../card/domain/enums/card-type.enum';
import { TrainerEffectType } from '../../../card/domain/enums/trainer-effect-type.enum';
import { TargetType } from '../../../card/domain/enums/target-type.enum';
import { EnergyType } from '../../../card/domain/enums/energy-type.enum';
import { CardDetailDto } from '../../../card/presentation/dto/card-detail.dto';
import type {
  StatusConditionEffect,
  DamageModifierEffect,
  PreventDamageEffect,
  DiscardEnergyEffect,
} from '../../../card/domain/value-objects/attack-effect.value-object';
import { AttackEffectFactory } from '../../../card/domain/value-objects/attack-effect.value-object';
import { ConditionFactory } from '../../../card/domain/value-objects/condition.value-object';
import { CoinFlipResult } from '../../domain/value-objects/coin-flip-result.value-object';
import { ActionHandlerFactory } from '../handlers/action-handler-factory';
import {
  EnergyAttachmentExecutionService,
  EvolutionExecutionService,
  PlayPokemonExecutionService,
  CardHelperService,
  SetActivePokemonPlayerTurnService,
  AttachEnergyPlayerTurnService,
  PlayPokemonPlayerTurnService,
  EvolvePokemonPlayerTurnService,
  RetreatExecutionService,
} from '../services';
import {
  AttackDamageCalculatorService,
  AttackTextParserService,
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
    private readonly drawInitialCardsUseCase: DrawInitialCardsUseCase,
    private readonly setPrizeCardsUseCase: SetPrizeCardsUseCase,
    private readonly performCoinTossUseCase: PerformCoinTossUseCase,
    @Inject(IGetCardByIdUseCase)
    private readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly coinFlipResolver: CoinFlipResolverService,
    private readonly attackCoinFlipParser: AttackCoinFlipParserService,
    private readonly attackEnergyValidator: AttackEnergyValidatorService,
    private readonly trainerEffectExecutor: TrainerEffectExecutorService,
    private readonly trainerEffectValidator: TrainerEffectValidatorService,
    private readonly abilityEffectExecutor: AbilityEffectExecutorService,
    private readonly abilityEffectValidator: AbilityEffectValidatorService,
    private readonly actionHandlerFactory: ActionHandlerFactory,
    private readonly energyAttachmentExecutionService: EnergyAttachmentExecutionService,
    private readonly evolutionExecutionService: EvolutionExecutionService,
    private readonly playPokemonExecutionService: PlayPokemonExecutionService,
    private readonly cardHelper: CardHelperService,
    private readonly attackDamageCalculator: AttackDamageCalculatorService,
    private readonly attackTextParser: AttackTextParserService,
    private readonly effectConditionEvaluator: EffectConditionEvaluatorService,
    private readonly setActivePokemonPlayerTurnService: SetActivePokemonPlayerTurnService,
    private readonly attachEnergyPlayerTurnService: AttachEnergyPlayerTurnService,
    private readonly playPokemonPlayerTurnService: PlayPokemonPlayerTurnService,
    private readonly evolvePokemonPlayerTurnService: EvolvePokemonPlayerTurnService,
    private readonly retreatExecutionService: RetreatExecutionService,
  ) {}

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Main entry point for executing player actions
   * Routes actions to appropriate handlers based on match state
   */
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
        return await handler.execute(
          dto,
          match,
          gameState,
          playerIdentifier,
          this.cardsMap,
        );
      } catch (error) {
        // ATTACK handler delegates back - allow fallthrough
        if (
          error instanceof BadRequestException &&
          (error.message.includes('not yet implemented') ||
            error.message.includes('delegating to use case'))
        ) {
          // Fall through to state-specific handler
        } else {
          throw error;
        }
      }
    }

    // State machine router - route to state-specific handlers
    switch (match.state) {
      case MatchState.SELECT_ACTIVE_POKEMON:
        return this.handleSelectActivePokemonState(
          dto,
          match,
          gameState,
        playerIdentifier,
        );

      case MatchState.SELECT_BENCH_POKEMON:
        return this.handleSelectBenchPokemonState(
          dto,
          match,
          gameState,
          playerIdentifier,
        );

      case MatchState.FIRST_PLAYER_SELECTION:
        return this.handleFirstPlayerSelectionState(
          dto,
          match,
          playerIdentifier,
        );

      case MatchState.INITIAL_SETUP:
        return this.handleInitialSetupState(dto, match, gameState, playerIdentifier);

      case MatchState.PLAYER_TURN:
        return this.handlePlayerTurnState(
          dto,
          match,
          gameState,
          playerIdentifier,
        );

      // Other states are handled by action handlers (MATCH_APPROVAL, DRAWING_CARDS, SET_PRIZE_CARDS, etc.)
      default:
        throw new BadRequestException(
          `Action ${dto.actionType} could not be processed in state ${match.state}`,
        );
    }
  }

  // ============================================================================
  // ACTION HISTORY HELPERS
  // ============================================================================

  /**
   * Get actions from the current turn for a specific player
   */
  private getCurrentTurnActions(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): ActionSummary[] {
    // Find the last END_TURN action to determine where current turn started
    let turnStartIndex = 0;
    for (let i = gameState.actionHistory.length - 1; i >= 0; i--) {
      const action = gameState.actionHistory[i];
      if (action.actionType === PlayerActionType.END_TURN) {
        turnStartIndex = i + 1;
        break;
      }
    }

    // Get all actions from current turn for this player
    return gameState.actionHistory
      .slice(turnStartIndex)
      .filter((action) => action.playerId === playerIdentifier);
  }

  /**
   * Check if CONCEDE action already exists in action history
   */
  private hasConcedeAction(gameState: GameState): boolean {
    return gameState.actionHistory.some(
      (action) => action.actionType === PlayerActionType.CONCEDE,
    );
  }

  /**
   * Check if ATTACK action exists in current turn
   */
  private hasAttackInCurrentTurn(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): boolean {
    const currentTurnActions = this.getCurrentTurnActions(
      gameState,
      playerIdentifier,
    );
    return currentTurnActions.some(
      (action) => action.actionType === PlayerActionType.ATTACK,
    );
  }

  /**
   * Check if RETREAT action exists in current turn
   */
  private hasRetreatInCurrentTurn(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): boolean {
    const currentTurnActions = this.getCurrentTurnActions(
      gameState,
      playerIdentifier,
    );
    return currentTurnActions.some(
      (action) => action.actionType === PlayerActionType.RETREAT,
    );
  }

  // ============================================================================
  // CARD/ENTITY HELPERS
  // ============================================================================


  /**
   * Collect all cardIds that might be needed from actionData and gameState
   */
  private collectCardIds(
    dto: ExecuteActionDto,
    gameState: GameState | null,
    playerIdentifier: PlayerIdentifier,
  ): Set<string> {
    const cardIds = new Set<string>();

    // Collect cardIds from actionData
    const actionData = dto.actionData as any;
    if (actionData?.cardId) {
      cardIds.add(actionData.cardId);
    }
    if (actionData?.attackerCardId) {
      cardIds.add(actionData.attackerCardId);
    }
    if (actionData?.defenderCardId) {
      cardIds.add(actionData.defenderCardId);
    }
    if (actionData?.evolutionCardId) {
      cardIds.add(actionData.evolutionCardId);
    }
    if (actionData?.currentPokemonCardId) {
      cardIds.add(actionData.currentPokemonCardId);
    }
    if (actionData?.energyId) {
      cardIds.add(actionData.energyId);
    }
    if (Array.isArray(actionData?.energyIds)) {
      actionData.energyIds.forEach((id: string) => cardIds.add(id));
    }
    if (Array.isArray(actionData?.cardIds)) {
      actionData.cardIds.forEach((id: string) => cardIds.add(id));
    }

    // Collect cardIds from gameState (all Pokemon in play, attached energy, hand, deck, discard)
    if (gameState) {
      const playerState = gameState.getPlayerState(playerIdentifier);
      const opponentState = gameState.getOpponentState(playerIdentifier);

      // Player's Pokemon
      if (playerState.activePokemon) {
        cardIds.add(playerState.activePokemon.cardId);
        // Attached energy
        if (playerState.activePokemon.attachedEnergy) {
          playerState.activePokemon.attachedEnergy.forEach((id) =>
            cardIds.add(id),
          );
        }
      }
      playerState.bench.forEach((pokemon) => {
        cardIds.add(pokemon.cardId);
        if (pokemon.attachedEnergy) {
          pokemon.attachedEnergy.forEach((id) => cardIds.add(id));
        }
      });

      // Player's hand, deck, discard pile (for trainer/ability effects)
      if (playerState.hand) {
        playerState.hand.forEach((id) => cardIds.add(id));
      }
      if (playerState.deck) {
        playerState.deck.forEach((id) => cardIds.add(id));
      }
      if (playerState.discardPile) {
        playerState.discardPile.forEach((id) => cardIds.add(id));
      }
      if (playerState.prizeCards) {
        playerState.prizeCards.forEach((id) => cardIds.add(id));
      }

      // Opponent's Pokemon
      if (opponentState.activePokemon) {
        cardIds.add(opponentState.activePokemon.cardId);
        // Attached energy
        if (opponentState.activePokemon.attachedEnergy) {
          opponentState.activePokemon.attachedEnergy.forEach((id) =>
            cardIds.add(id),
          );
        }
      }
      opponentState.bench.forEach((pokemon) => {
        cardIds.add(pokemon.cardId);
        if (pokemon.attachedEnergy) {
          pokemon.attachedEnergy.forEach((id) => cardIds.add(id));
        }
      });

      // Opponent's hand, deck, discard pile (for trainer/ability effects)
      if (opponentState.hand) {
        opponentState.hand.forEach((id) => cardIds.add(id));
      }
      if (opponentState.deck) {
        opponentState.deck.forEach((id) => cardIds.add(id));
      }
      if (opponentState.discardPile) {
        opponentState.discardPile.forEach((id) => cardIds.add(id));
      }
      if (opponentState.prizeCards) {
        opponentState.prizeCards.forEach((id) => cardIds.add(id));
      }
    }

    return cardIds;
  }

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
          validatePokemonNotEvolvedThisTurn:
            this.validatePokemonNotEvolvedThisTurn.bind(this),
          validateEvolution: this.validateEvolution.bind(this),
          getCardHp: (cardId: string) =>
            this.cardHelper.getCardHp(cardId, this.cardsMap),
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

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  // ============================================================================
  // CARD/ENTITY HELPERS (moved to CardHelperService - kept for backward compatibility)
  // ============================================================================

  /**
   * Get card entity from batch-loaded map or fetch individually
   * @deprecated Use CardHelperService.getCardEntity instead
   */
  private async getCardEntity(
    cardId: string,
    cardsMap?: Map<string, Card>,
  ): Promise<Card> {
    return this.cardHelper.getCardEntity(cardId, cardsMap || this.cardsMap);
  }

  /**
   * Get card HP from card data
   * Returns the actual HP value from the card, or a default value if not found
   */
  private async getCardHp(cardId: string): Promise<number> {
    return this.cardHelper.getCardHp(cardId, this.cardsMap);
  }

  // ============================================================================
  // OLD ATTACK IMPLEMENTATION - REMOVED (now handled by AttackActionHandler)
  // ============================================================================

  // ============================================================================
  // OLD GENERATE_COIN_FLIP IMPLEMENTATION - REMOVED (now handled by GenerateCoinFlipActionHandler)
  // ============================================================================

  // ============================================================================
  // OLD RETREAT IMPLEMENTATION - REMOVED (now handled by RetreatExecutionService)
  // ============================================================================

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  /**
   * Validate that a Pokemon hasn't been evolved this turn
   * @param gameState The current game state
   * @param playerIdentifier The player attempting to evolve
   * @param instanceId The instance ID of the Pokemon to evolve
   * @param cardId The card ID of the Pokemon (for error message)
   * @throws BadRequestException if the Pokemon has already been evolved this turn
   *
   * Why we check both lastAction and actionHistory:
   * - When withAction() is called, the action is added to BOTH lastAction AND actionHistory
   * - lastAction is a direct reference to the most recent action (fast check)
   * - actionHistory contains all actions, and we iterate in reverse to find earlier evolutions in the same turn
   * - We check lastAction first for efficiency (most common case: Pokemon was just evolved)
   * - We check actionHistory in reverse to catch evolutions from earlier in the turn, stopping at END_TURN (turn boundary)
   * - This ensures we only check actions from the current turn, not previous turns
   */
  private validatePokemonNotEvolvedThisTurn(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    instanceId: string,
    cardId: string,
  ): void {
    // Find the Pokemon instance to check its evolvedAt field
    const playerState = gameState.getPlayerState(playerIdentifier);
    let targetPokemon: CardInstance | null = null;

    // Check active Pokemon
    if (playerState.activePokemon?.instanceId === instanceId) {
      targetPokemon = playerState.activePokemon;
    } else {
      // Check bench Pokemon
      targetPokemon =
        playerState.bench.find((p) => p.instanceId === instanceId) || null;
    }

    // Primary check: Use evolvedAt field if available (new approach)
    if (targetPokemon && targetPokemon.evolvedAt !== undefined) {
      if (targetPokemon.evolvedAt === gameState.turnNumber) {
        throw new BadRequestException(
          `Cannot evolve this Pokemon again this turn. Each Pokemon can only be evolved once per turn.`,
        );
      }
      // If evolvedAt is set but from a different turn, allow evolution
      return;
    }

    // Fallback: Check action history for backward compatibility with existing matches
    // This handles cases where evolvedAt is not set (old matches or edge cases)
    // Check lastAction first (most recent action, definitely from current turn if from current player)
    if (
      gameState.lastAction &&
      gameState.lastAction.playerId === playerIdentifier
    ) {
      if (gameState.lastAction.actionType === PlayerActionType.EVOLVE_POKEMON) {
        const actionData = gameState.lastAction.actionData as any;
        if (actionData.instanceId === instanceId) {
          throw new BadRequestException(
            `Cannot evolve this Pokemon again this turn. Each Pokemon can only be evolved once per turn.`,
          );
        }
      } else if (
        gameState.lastAction.actionType === PlayerActionType.PLAY_TRAINER
      ) {
        const actionData = gameState.lastAction.actionData as any;
        if (actionData.evolutionCardId && actionData.target) {
          let targetInstanceId: string | null = null;

          if (actionData.target === 'ACTIVE') {
            targetInstanceId = playerState.activePokemon?.instanceId || null;
          } else if (actionData.target.startsWith('BENCH_')) {
            const benchIndex = parseInt(
              actionData.target.replace('BENCH_', ''),
              10,
            );
            if (benchIndex >= 0 && benchIndex < playerState.bench.length) {
              targetInstanceId =
                playerState.bench[benchIndex]?.instanceId || null;
            }
          }

          if (targetInstanceId === instanceId) {
            throw new BadRequestException(
              `Cannot evolve this Pokemon again this turn. Each Pokemon can only be evolved once per turn.`,
            );
          }
        }
      }
    }

    // Check action history in reverse order (most recent first)
    // Stop when we hit an END_TURN action (turn boundary) or an action from a different player
    for (let i = gameState.actionHistory.length - 1; i >= 0; i--) {
      const action = gameState.actionHistory[i];

      // Stop if we hit an END_TURN action (turn boundary)
      if (action.actionType === PlayerActionType.END_TURN) {
        break;
      }

      // Only check actions from the current player
      if (action.playerId !== playerIdentifier) {
        continue;
      }

      // Check EVOLVE_POKEMON actions
      if (action.actionType === PlayerActionType.EVOLVE_POKEMON) {
        const actionData = action.actionData as any;
        if (actionData.instanceId === instanceId) {
          throw new BadRequestException(
            `Cannot evolve this Pokemon again this turn. Each Pokemon can only be evolved once per turn.`,
          );
        }
      }

      // Check PLAY_TRAINER actions that might have evolved this Pokemon
      if (action.actionType === PlayerActionType.PLAY_TRAINER) {
        const actionData = action.actionData as any;
        if (actionData.evolutionCardId && actionData.target) {
          let targetInstanceId: string | null = null;

          if (actionData.target === 'ACTIVE') {
            targetInstanceId = playerState.activePokemon?.instanceId || null;
          } else if (actionData.target.startsWith('BENCH_')) {
            const benchIndex = parseInt(
              actionData.target.replace('BENCH_', ''),
              10,
            );
            if (benchIndex >= 0 && benchIndex < playerState.bench.length) {
              targetInstanceId =
                playerState.bench[benchIndex]?.instanceId || null;
            }
          }

          if (targetInstanceId === instanceId) {
            throw new BadRequestException(
              `Cannot evolve this Pokemon again this turn. Each Pokemon can only be evolved once per turn.`,
            );
          }
        }
      }
    }
  }

  /**
   * Validate that an evolution card can evolve from the current Pokemon
   * @param currentPokemonCardId The card ID of the Pokemon to evolve
   * @param evolutionCardId The card ID of the evolution card
   * @throws BadRequestException if the evolution is invalid
   */
  private async validateEvolution(
    currentPokemonCardId: string,
    evolutionCardId: string,
  ): Promise<void> {
    // Get both card entities
    const currentPokemonCard =
      await this.cardHelper.getCardEntity(currentPokemonCardId, this.cardsMap);
    const evolutionCard =
      await this.cardHelper.getCardEntity(evolutionCardId, this.cardsMap);

    // Validate that both are Pokemon cards
    if (currentPokemonCard.cardType !== CardType.POKEMON) {
      throw new BadRequestException(
        `Cannot evolve non-Pokemon card. The selected card is not a Pokemon.`,
      );
    }
    if (evolutionCard.cardType !== CardType.POKEMON) {
      throw new BadRequestException(
        `Evolution card must be a Pokemon card. The selected evolution card is not a Pokemon.`,
      );
    }

    // Validate that evolution card has evolvesFrom
    if (!evolutionCard.evolvesFrom) {
      throw new BadRequestException(
        `Cannot evolve to ${evolutionCard.name}. This card cannot be used for evolution.`,
      );
    }

    // Validate that the current Pokemon's name matches the evolution's evolvesFrom name
    const currentPokemonName = currentPokemonCard.name;
    const evolvesFromName = evolutionCard.evolvesFrom.name;

    if (!evolvesFromName) {
      throw new BadRequestException(
        `Cannot evolve to ${evolutionCard.name}. Evolution information is missing.`,
      );
    }

    // Check if current Pokemon name exactly matches the evolvesFrom name (case-insensitive)
    // The name must exactly match (e.g., "Charmeleon" must equal "Charmeleon" or "charmeleon")
    // This prevents "Dark basicCharmeleon" from evolving to Charizard (requires "Charmeleon")
    if (currentPokemonName.toLowerCase() !== evolvesFromName.toLowerCase()) {
      throw new BadRequestException(
        `Cannot evolve ${currentPokemonName} to ${evolutionCard.name}. ` +
          `Evolution requires ${evolvesFromName}, but current Pokemon is ${currentPokemonName}`,
      );
    }

    // Validate stage progression: BASIC -> STAGE_1 -> STAGE_2
    const currentStage = currentPokemonCard.stage;
    const evolutionStage = evolutionCard.stage;

    if (!currentStage) {
      throw new BadRequestException(
        `Cannot evolve ${currentPokemonName}. This Pokemon does not have a valid evolution stage.`,
      );
    }
    if (!evolutionStage) {
      throw new BadRequestException(
        `Cannot evolve to ${evolutionCard.name}. The evolution card does not have a valid stage.`,
      );
    }

    // Define valid stage progression
    const stageProgression: Record<EvolutionStage, EvolutionStage | null> = {
      [EvolutionStage.BASIC]: EvolutionStage.STAGE_1,
      [EvolutionStage.STAGE_1]: EvolutionStage.STAGE_2,
      [EvolutionStage.STAGE_2]: null, // STAGE_2 cannot evolve further
      [EvolutionStage.VMAX]: null,
      [EvolutionStage.VSTAR]: null,
      [EvolutionStage.GX]: null,
      [EvolutionStage.EX]: null,
      [EvolutionStage.MEGA]: null,
      [EvolutionStage.BREAK]: null,
      [EvolutionStage.LEGEND]: null,
    };

    const expectedNextStage = stageProgression[currentStage];
    if (expectedNextStage === null) {
      throw new BadRequestException(
        `Cannot evolve ${currentPokemonName}. Pokemon at stage ${currentStage} cannot evolve further.`,
      );
    }

    if (evolutionStage !== expectedNextStage) {
      throw new BadRequestException(
        `Cannot evolve ${currentPokemonName} to ${evolutionCard.name}. ` +
          `Invalid evolution stage: ${currentPokemonName} is ${currentStage}, ` +
          `but ${evolutionCard.name} is ${evolutionStage}. Expected ${expectedNextStage}.`,
      );
    }
  }

  // ============================================================================
  // EFFECT EVALUATION
  // ============================================================================

  /**
   * Evaluate effect conditions to determine if effect should apply
   * @deprecated Use EffectConditionEvaluatorService.evaluateEffectConditions instead
   */
  private async evaluateEffectConditions(
    conditions: any[],
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    coinFlipResults?: any[],
    getCardEntity?: (cardId: string) => Promise<Card>,
  ): Promise<boolean> {
    return this.effectConditionEvaluator.evaluateEffectConditions(
      conditions,
      gameState,
      playerIdentifier,
      playerState,
      opponentState,
      coinFlipResults,
      getCardEntity || ((cardId: string) => this.cardHelper.getCardEntity(cardId, this.cardsMap)),
    );
  }

  // ============================================================================
  // ATTACK PARSING METHODS
  // ============================================================================

  /**
   * Parse status effect from attack text
   * @deprecated Use AttackTextParserService.parseStatusEffectFromAttackText instead
   */
  private parseStatusEffectFromAttackText(
    attackText: string,
    isStatusEffectOnly: boolean,
  ): StatusConditionEffect | null {
    return this.attackTextParser.parseStatusEffectFromAttackText(attackText, isStatusEffectOnly);
  }

  /**
   * Parse self-damage from attack text
   * @deprecated Use AttackTextParserService.parseSelfDamage instead
   */
  private parseSelfDamage(attackText: string, pokemonName: string): number {
    return this.attackTextParser.parseSelfDamage(attackText, pokemonName);
  }

  /**
   * Parse bench damage from attack text
   * @deprecated Use AttackTextParserService.parseBenchDamage instead
   */
  private parseBenchDamage(attackText: string): number {
    return this.attackTextParser.parseBenchDamage(attackText);
  }

  /**
   * Parse minus damage reduction from attack text
   * @deprecated Use AttackTextParserService.parseMinusDamageReduction instead
   */
  private parseMinusDamageReduction(
    attackText: string,
    attackerName: string,
  ): { target: 'self' | 'defending'; reductionPerCounter: number } | null {
    return this.attackTextParser.parseMinusDamageReduction(attackText, attackerName);
  }

  // ============================================================================
  // ATTACK CALCULATION METHODS
  // ============================================================================

  /**
   * Calculate plus damage bonus for "+" damage attacks
   * @deprecated Use AttackDamageCalculatorService.calculatePlusDamageBonus instead
   */
  private async calculatePlusDamageBonus(
    attack: Attack,
    attackerCardName: string,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    attackText: string,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): Promise<number> {
    return this.attackDamageCalculator.calculatePlusDamageBonus(
      attack,
      attackerCardName,
      playerState,
      opponentState,
      attackText,
      gameState,
      playerIdentifier,
      (cardId: string) => this.cardHelper.getCardEntity(cardId, this.cardsMap),
    );
  }

  /**
   * Apply minus damage reduction based on damage counters
   * @deprecated Use AttackDamageCalculatorService.calculateMinusDamageReduction instead
   */
  private calculateMinusDamageReduction(
    baseDamage: number,
    attack: Attack,
    attackText: string,
    attackerName: string,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
  ): number {
    return this.attackDamageCalculator.calculateMinusDamageReduction(
      baseDamage,
      attack,
      attackText,
      attackerName,
      playerState,
      opponentState,
    );
  }

  // ============================================================================
  // ENERGY METHODS
  // ============================================================================

  /**
   * Select energy cards to discard based on effect requirements
   */
  private async selectEnergyToDiscard(
    pokemon: CardInstance,
    amount: number | 'all',
    energyType?: EnergyType,
  ): Promise<string[]> {
    const attachedEnergy = pokemon.attachedEnergy;
    const availableEnergy: string[] = [];

    // Filter by energy type if specified
    if (energyType) {
      for (const energyId of attachedEnergy) {
        try {
          const energyCard = await this.cardHelper.getCardEntity(energyId, this.cardsMap);
          if (energyCard.energyType === energyType) {
            availableEnergy.push(energyId);
          }
        } catch {
          // Skip if card lookup fails
        }
      }
    } else {
      availableEnergy.push(...attachedEnergy);
    }

    if (amount === 'all') {
      return [...availableEnergy];
    } else {
      // Return first N energy cards
      return availableEnergy.slice(0, amount);
    }
  }

  /**
   * Apply DISCARD_ENERGY effects from attack
   */
  private async applyDiscardEnergyEffects(
    attack: Attack,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
  ): Promise<{
    updatedPlayerState: PlayerGameState;
    updatedOpponentState: PlayerGameState;
  }> {
    let updatedPlayerState = playerState;
    let updatedOpponentState = opponentState;

    if (attack.hasEffects()) {
      // Filter out SELF-targeted DISCARD_ENERGY effects - these are handled as costs before attack executes
      const discardEnergyEffects = attack
        .getEffectsByType(AttackEffectType.DISCARD_ENERGY)
        .filter(
          (effect) =>
            (effect as DiscardEnergyEffect).target !== TargetType.SELF,
        );

      for (const discardEffect of discardEnergyEffects as DiscardEnergyEffect[]) {
        const conditionsMet = await this.effectConditionEvaluator.evaluateEffectConditions(
          discardEffect.requiredConditions || [],
          gameState,
          playerIdentifier,
          playerState,
          opponentState,
          undefined,
          (cardId: string) => this.cardHelper.getCardEntity(cardId, this.cardsMap),
        );

        if (conditionsMet) {
          if (
            discardEffect.target === TargetType.DEFENDING &&
            updatedOpponentState.activePokemon
          ) {
            // Discard energy from defender
            const energyToDiscard = await this.selectEnergyToDiscard(
              updatedOpponentState.activePokemon,
              discardEffect.amount,
              discardEffect.energyType,
            );

            if (energyToDiscard.length > 0) {
              const updatedAttachedEnergy =
                updatedOpponentState.activePokemon.attachedEnergy.filter(
                  (energyId) => !energyToDiscard.includes(energyId),
                );
              const updatedDefender =
                updatedOpponentState.activePokemon.withAttachedEnergy(
                  updatedAttachedEnergy,
                );
              const updatedDiscardPile = [
                ...updatedOpponentState.discardPile,
                ...energyToDiscard,
              ];
              updatedOpponentState = updatedOpponentState
                .withActivePokemon(updatedDefender)
                .withDiscardPile(updatedDiscardPile);
            }
          }
        }
      }
    }

    return { updatedPlayerState, updatedOpponentState };
  }

  /**
   * Validate that selected energy matches the attack effect requirement
   */
  private async validateEnergySelection(
    selectedEnergyIds: string[],
    discardEffect: DiscardEnergyEffect,
    pokemon: CardInstance,
  ): Promise<string | null> {
    // Check that all selected energy IDs are actually attached
    for (const energyId of selectedEnergyIds) {
      if (!pokemon.attachedEnergy.includes(energyId)) {
        return `Energy card ${energyId} is not attached to this Pokemon`;
      }
    }

    // Check amount
    if (discardEffect.amount !== 'all') {
      if (selectedEnergyIds.length !== discardEffect.amount) {
        return `Must select exactly ${discardEffect.amount} energy card(s), but ${selectedEnergyIds.length} were selected`;
      }
    }

    // Check energy type if specified in effect
    if (discardEffect.energyType) {
      for (const energyId of selectedEnergyIds) {
        try {
          const energyCard = await this.cardHelper.getCardEntity(energyId, this.cardsMap);
          if (energyCard.energyType !== discardEffect.energyType) {
            return `Selected energy card ${energyId} is not ${discardEffect.energyType} Energy`;
          }
        } catch {
          return `Could not validate energy card ${energyId}`;
        }
      }
    }

    return null;
  }
}
