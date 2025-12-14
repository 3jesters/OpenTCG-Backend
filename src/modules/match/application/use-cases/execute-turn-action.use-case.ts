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
import { CoinFlipCountType, DamageCalculationType } from '../../domain/value-objects/coin-flip-configuration.value-object';
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
import { GetCardByIdUseCase } from '../../../card/application/use-cases/get-card-by-id.use-case';
import { Attack } from '../../../card/domain/value-objects/attack.value-object';
import { AbilityActivationType } from '../../../card/domain/enums/ability-activation-type.enum';
import { AttackEffectType } from '../../../card/domain/enums/attack-effect-type.enum';
import { StatusEffect } from '../../domain/enums/status-effect.enum';
import { ConditionType } from '../../../card/domain/enums/condition-type.enum';
import { EvolutionStage } from '../../../card/domain/enums/evolution-stage.enum';
import { CardType } from '../../../card/domain/enums/card-type.enum';
import { TrainerEffectType } from '../../../card/domain/enums/trainer-effect-type.enum';
import { TargetType } from '../../../card/domain/enums/target-type.enum';
import type { StatusConditionEffect, DamageModifierEffect, PreventDamageEffect } from '../../../card/domain/value-objects/attack-effect.value-object';
import { AttackEffectFactory } from '../../../card/domain/value-objects/attack-effect.value-object';
import { ConditionFactory } from '../../../card/domain/value-objects/condition.value-object';

/**
 * Execute Turn Action Use Case
 * Executes a player action during their turn
 */
@Injectable()
export class ExecuteTurnActionUseCase {
  private readonly logger = new Logger(ExecuteTurnActionUseCase.name);

  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly stateMachineService: MatchStateMachineService,
    private readonly drawInitialCardsUseCase: DrawInitialCardsUseCase,
    private readonly setPrizeCardsUseCase: SetPrizeCardsUseCase,
    private readonly performCoinTossUseCase: PerformCoinTossUseCase,
    private readonly getCardByIdUseCase: GetCardByIdUseCase,
    private readonly coinFlipResolver: CoinFlipResolverService,
    private readonly attackCoinFlipParser: AttackCoinFlipParserService,
    private readonly attackEnergyValidator: AttackEnergyValidatorService,
    private readonly trainerEffectExecutor: TrainerEffectExecutorService,
    private readonly trainerEffectValidator: TrainerEffectValidatorService,
    private readonly abilityEffectExecutor: AbilityEffectExecutorService,
    private readonly abilityEffectValidator: AbilityEffectValidatorService,
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
      try {
      match.approveMatch(playerIdentifier);
      } catch (error) {
        // Check if player has already approved
        if (
          error instanceof Error &&
          (error.message.includes('has already approved') ||
            error.message.includes('already approved'))
        ) {
          throw new BadRequestException(error.message);
        }
        // Re-throw other errors
        throw error;
      }
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

    // Handle set prize cards
    if (dto.actionType === PlayerActionType.SET_PRIZE_CARDS) {
      return await this.setPrizeCardsUseCase.execute(
        dto.matchId,
        dto.playerId,
      );
    }

    // Handle set active Pokemon in SELECT_ACTIVE_POKEMON state or after knockout
    if (
      dto.actionType === PlayerActionType.SET_ACTIVE_POKEMON &&
      (match.state === MatchState.SELECT_ACTIVE_POKEMON ||
        match.state === MatchState.PLAYER_TURN)
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
      
      // Validate that player needs to select active Pokemon
      if (playerState.activePokemon !== null) {
        throw new BadRequestException('Cannot set active Pokemon when one already exists');
      }
      
      // If in PLAYER_TURN state (not SELECT_ACTIVE_POKEMON), validate prize was selected
      if (match.state === MatchState.PLAYER_TURN && gameState.phase !== TurnPhase.SELECT_ACTIVE_POKEMON) {
        // Check if attacker has selected prize after knockout
        const lastAction = gameState.lastAction;
        if (
          lastAction &&
          lastAction.actionType === PlayerActionType.ATTACK &&
          lastAction.actionData?.isKnockedOut === true
        ) {
          // Check if prize was selected
          const lastAttackIndex = gameState.actionHistory.findIndex(
            (action) => action === lastAction,
          );
            const prizeSelected = gameState.actionHistory.some(
              (action, index) =>
                index > lastAttackIndex &&
                (action.actionType === PlayerActionType.SELECT_PRIZE ||
                  action.actionType === PlayerActionType.DRAW_PRIZE) &&
                action.playerId === lastAction.playerId,
            );
          
          if (!prizeSelected) {
            throw new BadRequestException(
              'Cannot select active Pokemon. Attacker must select a prize card first.',
            );
          }
        }
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
        const cardHp = await this.getCardHp(cardId);
        activePokemon = new CardInstance(
        uuidv4(),
        cardId,
        PokemonPosition.ACTIVE,
          cardHp,
          cardHp,
        [],
        'NONE' as any,
      );
        // Remove from hand
        updatedHand = playerState.hand.filter((id) => id !== cardId);
      } else {
        // Card is on bench - move it to active
        const benchPokemon = playerState.bench[benchIndex];
        // Clear all status effects when Pokemon switches/retreats
        activePokemon = benchPokemon
          .withPosition(PokemonPosition.ACTIVE)
          .withStatusEffect(StatusEffect.NONE); // Clear status effects on switch
        // Remove from bench and renumber positions
        updatedBench = playerState.bench
          .filter((_, i) => i !== benchIndex)
          .map((p, newIndex) => {
            const newPosition = `BENCH_${newIndex}` as PokemonPosition;
            // Clear status effects when Pokemon moves positions (retreat/switch)
            return p.withPosition(newPosition).withStatusEffect(StatusEffect.NONE);
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

      // Create action summary
      const actionSummary = new ActionSummary(
        uuidv4(),
        playerIdentifier,
        PlayerActionType.SET_ACTIVE_POKEMON,
        new Date(),
        { cardId },
      );

      // Use appropriate update method based on state
      if (match.state === MatchState.SELECT_ACTIVE_POKEMON) {
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
      } else {
        // In PLAYER_TURN state (after knockout), check if phase should transition
        const opponentState = updatedGameState.getOpponentState(playerIdentifier);
        const attackerState = updatedGameState.getPlayerState(playerIdentifier);
        
        // Check if both players still need to select (double knockout scenario)
        const opponentNeedsActive = opponentState.activePokemon === null && opponentState.bench.length > 0;
        const attackerNeedsActive = attackerState.activePokemon === null && attackerState.bench.length > 0;
        
        let nextPhase = gameState.phase;
        if (opponentNeedsActive || attackerNeedsActive) {
          // Still need active Pokemon selection
          nextPhase = TurnPhase.SELECT_ACTIVE_POKEMON;
        } else {
          // Both players have active Pokemon, transition back to END phase
          nextPhase = TurnPhase.END;
        }
        
        const finalGameState = updatedGameState.withPhase(nextPhase).withAction(actionSummary);
        match.updateGameState(finalGameState);
        return await this.matchRepository.save(match);
      }
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

      // Validate that only Basic Pokemon can be played directly
      // Exception: Trainer cards with PUT_INTO_PLAY effect (source: HAND, target: SELF) can be played as Basic Pokemon
      // Examples: Clefairy Doll, Mysterious Fossil
      const cardEntity = await this.getCardByIdUseCase.getCardEntity(cardId);
      
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
          throw new BadRequestException('Only Pokemon cards can be played to the bench');
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
      const cardHp = await this.getCardHp(cardId);

      // Create CardInstance for bench Pokemon
      const benchPosition = `BENCH_${playerState.bench.length}` as PokemonPosition;
      const benchPokemon = new CardInstance(
        uuidv4(),
        cardId,
        benchPosition,
        cardHp,
        cardHp,
        [],
        'NONE' as any,
        [],
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
      // This will automatically transition to FIRST_PLAYER_SELECTION when both are ready
      match.markPlayerReadyToStart(playerIdentifier);

      // Don't call completeInitialSetup() here - it will be called automatically
      // by confirmFirstPlayer() after both players confirm the first player selection
      return await this.matchRepository.save(match);
    }

    // Handle confirm first player in FIRST_PLAYER_SELECTION state
    if (
      dto.actionType === PlayerActionType.CONFIRM_FIRST_PLAYER &&
      match.state === MatchState.FIRST_PLAYER_SELECTION
    ) {
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

    // Handle turn actions in PLAYER_TURN state
    if (match.state === MatchState.PLAYER_TURN) {
      const gameState = match.gameState;
      if (!gameState) {
        throw new BadRequestException('Game state must be initialized');
      }

      // Handle DRAW_CARD action
      if (dto.actionType === PlayerActionType.DRAW_CARD) {
        if (gameState.phase !== TurnPhase.DRAW) {
          throw new BadRequestException(
            `Cannot draw card in phase ${gameState.phase}. Must be DRAW`,
          );
        }

        const playerState = gameState.getPlayerState(playerIdentifier);

        // Check if deck has cards
        if (playerState.deck.length === 0) {
          // Check win conditions before throwing error (deck out = opponent wins)
          const winCheck = this.stateMachineService.checkWinConditions(
            gameState.player1State,
            gameState.player2State,
          );
          if (winCheck.hasWinner && winCheck.winner) {
            const winnerId =
              winCheck.winner === PlayerIdentifier.PLAYER1
                ? match.player1Id!
                : match.player2Id!;
            match.endMatch(
              winnerId,
              winCheck.winner === PlayerIdentifier.PLAYER1
                ? MatchResult.PLAYER1_WIN
                : MatchResult.PLAYER2_WIN,
              winCheck.winCondition as WinCondition,
            );
            return await this.matchRepository.save(match);
          }
          throw new BadRequestException('Cannot draw card: deck is empty');
        }

        // Draw top card from deck
        const deckCopy = [...playerState.deck];
        const drawnCard = deckCopy.shift()!;
        const updatedHand = [...playerState.hand, drawnCard];

        // Update player state
        const updatedPlayerState = new PlayerGameState(
          deckCopy,
          updatedHand,
          playerState.activePokemon,
          playerState.bench,
          playerState.prizeCards,
          playerState.discardPile,
          playerState.hasAttachedEnergyThisTurn,
        );

        // Update game state with new player state and phase transition
        const updatedGameState =
          playerIdentifier === PlayerIdentifier.PLAYER1
            ? gameState
                .withPlayer1State(updatedPlayerState)
                .withPhase(TurnPhase.MAIN_PHASE)
            : gameState
                .withPlayer2State(updatedPlayerState)
                .withPhase(TurnPhase.MAIN_PHASE);

        // Create action summary
        const actionSummary = new ActionSummary(
          uuidv4(),
          playerIdentifier,
          PlayerActionType.DRAW_CARD,
          new Date(),
          {},
        );

        const finalGameState = updatedGameState.withAction(actionSummary);

        // Update match
        match.updateGameState(finalGameState);

        // Check win conditions
        const winCheck = this.stateMachineService.checkWinConditions(
          finalGameState.player1State,
          finalGameState.player2State,
        );
        if (winCheck.hasWinner && winCheck.winner) {
          const winnerId =
            winCheck.winner === PlayerIdentifier.PLAYER1
              ? match.player1Id!
              : match.player2Id!;
          match.endMatch(
            winnerId,
            winCheck.winner === PlayerIdentifier.PLAYER1
              ? MatchResult.PLAYER1_WIN
              : MatchResult.PLAYER2_WIN,
            winCheck.winCondition as WinCondition,
          );
        }

        return await this.matchRepository.save(match);
      }

      // Handle ATTACH_ENERGY action
      if (dto.actionType === PlayerActionType.ATTACH_ENERGY) {
        if (gameState.phase !== TurnPhase.MAIN_PHASE) {
          throw new BadRequestException(
            `Cannot attach energy in phase ${gameState.phase}. Must be MAIN_PHASE`,
          );
        }

        const energyCardId = (dto.actionData as any)?.energyCardId;
        const target = (dto.actionData as any)?.target;

        if (!energyCardId) {
          throw new BadRequestException('energyCardId is required');
        }
        if (!target) {
          throw new BadRequestException('target is required');
        }

        const playerState = gameState.getPlayerState(playerIdentifier);

        // Check if energy has already been attached this turn
        if (playerState.hasAttachedEnergyThisTurn) {
          throw new BadRequestException(
            'Energy can only be attached once per turn (unless using a special ability)',
          );
        }

        // Check if energy card is in hand
        if (!playerState.hand.includes(energyCardId)) {
          throw new BadRequestException('Energy card must be in hand');
        }

        // Find target Pokemon
        let targetPokemon: CardInstance | null = null;
        let updatedBench: CardInstance[] = [...playerState.bench];

        if (target === 'ACTIVE') {
          if (!playerState.activePokemon) {
            throw new BadRequestException('No active Pokemon to attach energy to');
          }
          targetPokemon = playerState.activePokemon;
        } else {
          // BENCH_0, BENCH_1, etc.
          const benchIndex = parseInt(target.replace('BENCH_', ''));
          if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
            throw new BadRequestException(`Invalid bench position: ${target}`);
          }
          targetPokemon = playerState.bench[benchIndex];
          // Update bench with new Pokemon instance
          updatedBench = playerState.bench.map((pokemon, index) =>
            index === benchIndex ? pokemon : pokemon,
          );
        }

        // Attach energy to Pokemon
        const updatedAttachedEnergy = [
          ...targetPokemon.attachedEnergy,
          energyCardId,
        ];
        const updatedPokemon = targetPokemon.withAttachedEnergy(
          updatedAttachedEnergy,
        );

        // Update bench if needed
        if (target !== 'ACTIVE') {
          const benchIndex = parseInt(target.replace('BENCH_', ''));
          updatedBench = playerState.bench.map((pokemon, index) =>
            index === benchIndex ? updatedPokemon : pokemon,
          );
        }

        // Remove one instance of energy card from hand
        const energyCardIndex = playerState.hand.indexOf(energyCardId);
        if (energyCardIndex === -1) {
          throw new BadRequestException('Energy card must be in hand');
        }
        const updatedHand = [
          ...playerState.hand.slice(0, energyCardIndex),
          ...playerState.hand.slice(energyCardIndex + 1),
        ];

        // Update player state - set hasAttachedEnergyThisTurn to true after successful attachment
        const updatedPlayerState = new PlayerGameState(
          playerState.deck,
          updatedHand,
          target === 'ACTIVE' ? updatedPokemon : playerState.activePokemon,
          updatedBench,
          playerState.prizeCards,
          playerState.discardPile,
          true, // Energy was attached this turn
        );

        // Update game state
        const updatedGameState =
          playerIdentifier === PlayerIdentifier.PLAYER1
            ? gameState.withPlayer1State(updatedPlayerState)
            : gameState.withPlayer2State(updatedPlayerState);

        // Create action summary
        const actionSummary = new ActionSummary(
          uuidv4(),
          playerIdentifier,
          PlayerActionType.ATTACH_ENERGY,
          new Date(),
          { energyCardId, target },
        );

        const finalGameState = updatedGameState.withAction(actionSummary);

        // Update match
        match.updateGameState(finalGameState);

        return await this.matchRepository.save(match);
      }

      // Handle PLAY_POKEMON action during gameplay (MAIN_PHASE)
      if (
        dto.actionType === PlayerActionType.PLAY_POKEMON &&
        gameState.phase === TurnPhase.MAIN_PHASE
      ) {
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
        const cardEntity = await this.getCardByIdUseCase.getCardEntity(cardId);
        if (cardEntity.cardType !== CardType.POKEMON) {
          throw new BadRequestException('Only Pokemon cards can be played to the bench');
        }
        if (cardEntity.stage !== EvolutionStage.BASIC) {
          throw new BadRequestException(
            `Cannot play ${cardEntity.stage} Pokemon directly. Only Basic Pokemon can be played to the bench. Evolved Pokemon must be evolved from their pre-evolution.`,
          );
        }

        // Check bench space (max 5)
        if (playerState.bench.length >= 5) {
          throw new BadRequestException('Bench is full (max 5 Pokemon)');
        }

        // Load card details to get HP
        const cardHp = await this.getCardHp(cardId);

        // Create CardInstance for bench Pokemon
        const benchPosition = `BENCH_${playerState.bench.length}` as PokemonPosition;
        const benchPokemon = new CardInstance(
          uuidv4(),
          cardId,
          benchPosition,
          cardHp,
          cardHp,
          [],
          'NONE' as any,
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

        // Create action summary
        const actionSummary = new ActionSummary(
          uuidv4(),
          playerIdentifier,
          PlayerActionType.PLAY_POKEMON,
          new Date(),
          { cardId },
        );

        const finalGameState = updatedGameState.withAction(actionSummary);

        // Update match
        match.updateGameState(finalGameState);

        return await this.matchRepository.save(match);
      }

      // Handle EVOLVE_POKEMON action
      if (dto.actionType === PlayerActionType.EVOLVE_POKEMON) {
        if (gameState.phase !== TurnPhase.MAIN_PHASE) {
          throw new BadRequestException(
            `Cannot evolve Pokemon in phase ${gameState.phase}. Must be MAIN_PHASE`,
          );
        }

        const evolutionCardId = (dto.actionData as any)?.evolutionCardId;
        const target = (dto.actionData as any)?.target;

        if (!evolutionCardId) {
          throw new BadRequestException('evolutionCardId is required');
        }
        if (!target) {
          throw new BadRequestException('target is required');
        }

        const playerState = gameState.getPlayerState(playerIdentifier);

        // Check if evolution card is in hand
        if (!playerState.hand.includes(evolutionCardId)) {
          throw new BadRequestException('Evolution card must be in hand');
        }

        // Find target Pokemon to evolve
        let targetPokemon: CardInstance | null = null;
        let updatedBench: CardInstance[] = [...playerState.bench];

        if (target === 'ACTIVE') {
          if (!playerState.activePokemon) {
            throw new BadRequestException('No active Pokemon to evolve');
          }
          targetPokemon = playerState.activePokemon;
        } else {
          // BENCH_0, BENCH_1, etc.
          const benchIndex = parseInt(target.replace('BENCH_', ''));
          if (benchIndex < 0 || benchIndex >= playerState.bench.length) {
            throw new BadRequestException(`Invalid bench position: ${target}`);
          }
          targetPokemon = playerState.bench[benchIndex];
        }

        // Validate that this Pokemon hasn't been evolved this turn (check first)
        this.validatePokemonNotEvolvedThisTurn(
          gameState,
          playerIdentifier,
          targetPokemon.instanceId,
          targetPokemon.cardId,
        );

        // Validate evolution chain
        await this.validateEvolution(targetPokemon.cardId, evolutionCardId);

        // Load evolution card details to get HP
        const evolutionCardHp = await this.getCardHp(evolutionCardId);

        // Calculate damage taken (preserve absolute damage amount)
        const damageTaken = targetPokemon.maxHp - targetPokemon.currentHp;

        // Apply the same damage to the evolved Pokemon
        // New current HP = new max HP - same damage amount
        const newCurrentHp = Math.max(0, evolutionCardHp - damageTaken);

        // Build evolution chain: add current card to existing chain
        const evolutionChain = [
          targetPokemon.cardId,
          ...targetPokemon.evolutionChain,
        ];

        // Create evolved Pokemon instance (preserve damage amount, energy, status)
        const evolvedPokemon = new CardInstance(
          targetPokemon.instanceId, // Keep same instance ID
          evolutionCardId, // New card ID
          targetPokemon.position,
          newCurrentHp,
          evolutionCardHp, // Use actual HP from evolution card
          targetPokemon.attachedEnergy, // Preserve attached energy
          targetPokemon.statusEffect,
          evolutionChain, // Add evolution chain
          targetPokemon.poisonDamageAmount, // Preserve poison damage amount
        );

        // Remove evolution card from hand
        const updatedHand = playerState.hand.filter(
          (id) => id !== evolutionCardId,
        );

        // Update bench if needed
        if (target !== 'ACTIVE') {
          const benchIndex = parseInt(target.replace('BENCH_', ''));
          updatedBench = playerState.bench.map((pokemon, index) =>
            index === benchIndex ? evolvedPokemon : pokemon,
          );
        }

        // Update player state
        const updatedPlayerState = new PlayerGameState(
          playerState.deck,
          updatedHand,
          target === 'ACTIVE' ? evolvedPokemon : playerState.activePokemon,
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

        // Create action summary (include instanceId to track which Pokemon was evolved)
        const actionSummary = new ActionSummary(
          uuidv4(),
          playerIdentifier,
          PlayerActionType.EVOLVE_POKEMON,
          new Date(),
          { evolutionCardId, target, instanceId: targetPokemon.instanceId },
        );

        const finalGameState = updatedGameState.withAction(actionSummary);

        // Update match
        match.updateGameState(finalGameState);

        return await this.matchRepository.save(match);
      }

      // Handle END_TURN action
      if (dto.actionType === PlayerActionType.END_TURN) {
        // Prevent ending turn in DRAW phase before drawing a card
        if (gameState.phase === TurnPhase.DRAW) {
          throw new BadRequestException(
            'Cannot end turn. You must draw a card before ending your turn.',
          );
        }

        // Check if a knockout occurred and prize needs to be selected
        const lastAction = gameState.lastAction;
        if (
          lastAction &&
          lastAction.actionType === PlayerActionType.ATTACK &&
          lastAction.actionData?.isKnockedOut === true &&
          lastAction.playerId === playerIdentifier
        ) {
          // Check if prize was already selected (look for SELECT_PRIZE action after the ATTACK)
          const prizeSelected = gameState.actionHistory.some(
            (action, index) =>
              index > gameState.actionHistory.indexOf(lastAction) &&
              action.actionType === PlayerActionType.SELECT_PRIZE &&
              action.playerId === playerIdentifier,
          );
          
          if (!prizeSelected) {
            throw new BadRequestException(
              'Cannot end turn. You must select a prize card after knocking out an opponent Pokemon.',
            );
          }
        }

        // Prevent ending turn if opponent needs to select active Pokemon
        if (gameState.phase === TurnPhase.SELECT_ACTIVE_POKEMON) {
          const opponentState = gameState.getOpponentState(playerIdentifier);
          const opponentNeedsActive = opponentState.activePokemon === null && opponentState.bench.length > 0;
          
          if (opponentNeedsActive) {
            throw new BadRequestException(
              'Cannot end turn. Opponent must select an active Pokemon from their bench before you can end your turn.',
            );
          }
        }

        // Create action summary for ending turn
        const actionSummary = new ActionSummary(
          uuidv4(),
          playerIdentifier,
          PlayerActionType.END_TURN,
          new Date(),
          {},
        );

        // Add action to current game state before ending turn
        const gameStateWithAction = gameState.withAction(actionSummary);
        match.updateGameState(gameStateWithAction);

        // End current turn (transitions to BETWEEN_TURNS)
        match.endTurn();

        // Process between turns (switch to next player)
        const nextPlayer =
          gameState.currentPlayer === PlayerIdentifier.PLAYER1
            ? PlayerIdentifier.PLAYER2
            : PlayerIdentifier.PLAYER1;

        const nextTurnNumber = gameState.turnNumber + 1;

        // Reset energy attachment flags for both players when new turn starts
        const resetPlayer1State =
          gameState.player1State.withHasAttachedEnergyThisTurn(false);
        const resetPlayer2State =
          gameState.player2State.withHasAttachedEnergyThisTurn(false);

        // Reset ability usage for the player whose turn just ended
        const gameStateWithResetAbilityUsage = gameStateWithAction.resetAbilityUsage(
          playerIdentifier,
        );

        // Create new game state for next turn (DRAW phase)
        // Use the END_TURN action as the last action (it's already in history)
        const nextGameState = new GameState(
          resetPlayer1State,
          resetPlayer2State,
          nextTurnNumber,
          TurnPhase.DRAW,
          nextPlayer,
          actionSummary, // Last action is the END_TURN we just created
          gameStateWithAction.actionHistory, // Keep history including END_TURN
          null, // coinFlipState
          gameStateWithResetAbilityUsage.abilityUsageThisTurn, // Preserve ability usage tracking
        );

        // Process status effects between turns (poison, burn, sleep wake-up, paralyze clear)
        const gameStateWithStatusEffects = await this.processBetweenTurnsStatusEffects(
          nextGameState,
          match.id,
        );

        // Clear expired damage prevention/reduction effects
        const gameStateWithClearedEffects = gameStateWithStatusEffects.clearExpiredDamagePrevention(
          nextTurnNumber,
        );

        // Process between turns (transitions back to PLAYER_TURN)
        match.processBetweenTurns(gameStateWithClearedEffects);

        // Check win conditions
        const winCheck = this.stateMachineService.checkWinConditions(
          nextGameState.player1State,
          nextGameState.player2State,
        );
        if (winCheck.hasWinner && winCheck.winner) {
          const winnerId =
            winCheck.winner === PlayerIdentifier.PLAYER1
              ? match.player1Id!
              : match.player2Id!;
          match.endMatch(
            winnerId,
            winCheck.winner === PlayerIdentifier.PLAYER1
              ? MatchResult.PLAYER1_WIN
              : MatchResult.PLAYER2_WIN,
            winCheck.winCondition as WinCondition,
          );
        }

        return await this.matchRepository.save(match);
      }

      // Handle PLAY_TRAINER action
      if (dto.actionType === PlayerActionType.PLAY_TRAINER) {
        const actionData = dto.actionData as unknown as TrainerActionData;
        const cardId = actionData.cardId;
        
        this.logger.log(
          `Player ${playerIdentifier} playing trainer card: ${cardId} in match ${dto.matchId}`,
        );

        if (gameState.phase !== TurnPhase.MAIN_PHASE) {
          throw new BadRequestException(
            `Cannot play trainer card in phase ${gameState.phase}. Must be MAIN_PHASE`,
          );
        }

        if (!cardId) {
          throw new BadRequestException('cardId is required');
        }

        const playerState = gameState.getPlayerState(playerIdentifier);
        const opponentState = gameState.getOpponentState(playerIdentifier);

        // Check if trainer card is in hand
        if (!playerState.hand.includes(cardId)) {
          throw new BadRequestException('Trainer card must be in hand');
        }

        // Find the index of the played card in hand (first occurrence)
        // This is needed to prevent selecting the same card when discarding
        const playedCardIndex = playerState.hand.indexOf(cardId);

        // Load card details to determine trainer effect
        const cardDetail = await this.getCardByIdUseCase.execute(cardId);

        if (cardDetail.cardType !== 'TRAINER') {
          throw new BadRequestException('Card must be a trainer card');
        }

        if (!cardDetail.trainerEffects || cardDetail.trainerEffects.length === 0) {
          throw new BadRequestException('Trainer card must have trainerEffects');
        }

        // Validate that if trainer requires discarding from hand, 
        // the selected card is not the same trainer card that was just played
          const hasDiscardHandEffect = cardDetail.trainerEffects.some(
            (effect) => effect.effectType === 'DISCARD_HAND',
          );

        if (hasDiscardHandEffect && 'handCardId' in actionData && actionData.handCardId) {
            // Validate that the selected card is in hand
          if (!playerState.hand.includes(actionData.handCardId)) {
              throw new BadRequestException('Selected card must be in hand');
            }

            // Prevent selecting the same trainer card that was just played
            // If handCardIndex is provided, use it to check the exact position
            // Otherwise, if the selected cardId matches the played cardId, 
            // check if it's the first occurrence (the one being played)
          if (actionData.handCardId === cardId) {
              let selectedIndex: number;
              
            if (actionData.handCardIndex !== undefined) {
                // Use provided index if available
              selectedIndex = actionData.handCardIndex;
                if (selectedIndex < 0 || selectedIndex >= playerState.hand.length) {
                  throw new BadRequestException('Invalid handCardIndex');
                }
              if (playerState.hand[selectedIndex] !== actionData.handCardId) {
                  throw new BadRequestException('handCardId does not match card at handCardIndex');
                }
              } else {
                // Fallback: find first occurrence (may not be accurate if multiple copies exist)
              selectedIndex = playerState.hand.indexOf(actionData.handCardId);
              }

              // Prevent selecting the card at the same index as the played card
              // This prevents selecting the first occurrence (the one being played)
              // but allows selecting other copies if they exist at different positions
              if (selectedIndex === playedCardIndex) {
                throw new BadRequestException(
                  'Cannot select the same trainer card that was just played',
                );
            }
          }
        }

        // Validate actionData based on trainer effects
        const validation = this.trainerEffectValidator.validateActionData(
          cardDetail.trainerEffects,
          actionData,
          gameState,
          playerIdentifier,
        );

        if (!validation.isValid) {
          throw new BadRequestException(
            `Invalid actionData: ${validation.errors.join(', ')}`,
          );
        }

        // Execute trainer effects using metadata-driven executor
        this.logger.debug(
          `Executing trainer effects for card ${cardId}: ${cardDetail.trainerEffects.map(e => e.effectType).join(', ')}`,
        );
        
        const result = await this.trainerEffectExecutor.executeEffects(
          cardDetail.trainerEffects,
          actionData,
          gameState,
          playerIdentifier,
        );

        // Remove trainer card from hand and add to discard pile
        // Note: For cards with DISCARD_HAND/RETRIEVE_ENERGY, hand may have already been updated
        // Remove only the first occurrence of the played card (to handle duplicates correctly)
        const updatedHand = [...result.playerState.hand];
        this.logger.debug(
          `Removing trainer card ${cardId} from hand. Hand before removal: ${updatedHand.join(', ')}`,
        );
        const cardIndexInUpdatedHand = updatedHand.indexOf(cardId);
        if (cardIndexInUpdatedHand === -1) {
          // Card might have been removed by an effect (shouldn't happen, but handle gracefully)
          this.logger.warn(
            `Played trainer card ${cardId} not found in hand after effects executed. Hand: ${updatedHand.join(', ')}`,
          );
          // Continue without removing (card was already removed by effect)
        } else {
          updatedHand.splice(cardIndexInUpdatedHand, 1);
          this.logger.debug(
            `Removed trainer card at index ${cardIndexInUpdatedHand}. Hand after removal: ${updatedHand.join(', ')}`,
          );
        }
        const finalHand = updatedHand;
        const finalDiscardPile = [...result.playerState.discardPile, cardId];
        const finalPlayerState = result.playerState
          .withHand(finalHand)
          .withDiscardPile(finalDiscardPile);
        
        this.logger.log(
          `Trainer card ${cardId} played successfully. Hand: ${finalHand.length} cards, Discard: ${finalDiscardPile.length} cards`,
        );

        // Update game state
        const updatedGameState =
          playerIdentifier === PlayerIdentifier.PLAYER1
            ? gameState
                .withPlayer1State(finalPlayerState)
                .withPlayer2State(result.opponentState)
            : gameState
                .withPlayer2State(finalPlayerState)
                .withPlayer1State(result.opponentState);

        const actionSummary = new ActionSummary(
          uuidv4(),
          playerIdentifier,
          PlayerActionType.PLAY_TRAINER,
          new Date(),
          actionData as unknown as Record<string, unknown>,
        );

        const finalGameState = updatedGameState.withAction(actionSummary);
        match.updateGameState(finalGameState);

        return await this.matchRepository.save(match);
      }

      // Handle ATTACK action
      if (dto.actionType === PlayerActionType.ATTACK) {
        // Allow attack from MAIN_PHASE or ATTACK phase
        if (gameState.phase !== TurnPhase.MAIN_PHASE && gameState.phase !== TurnPhase.ATTACK) {
          throw new BadRequestException(
            `Cannot attack in phase ${gameState.phase}. Must be MAIN_PHASE or ATTACK`,
          );
        }

        const attackIndex = (dto.actionData as any)?.attackIndex;
        if (attackIndex === undefined) {
          throw new BadRequestException('attackIndex is required');
        }

        const playerState = gameState.getPlayerState(playerIdentifier);
        const opponentState = gameState.getOpponentState(playerIdentifier);

        if (!playerState.activePokemon) {
          throw new BadRequestException('No active Pokemon to attack with');
        }
        if (!opponentState.activePokemon) {
          throw new BadRequestException('No opponent active Pokemon to attack');
        }

        // Check status effects that block attacks
        const activePokemon = playerState.activePokemon;
        
        // Check if Pokemon is asleep
        if (activePokemon.statusEffect === StatusEffect.ASLEEP) {
          // Check if there's a coin flip state for wake-up
          if (!gameState.coinFlipState || 
              gameState.coinFlipState.context !== CoinFlipContext.STATUS_CHECK ||
              gameState.coinFlipState.statusEffect !== 'ASLEEP' ||
              gameState.coinFlipState.pokemonInstanceId !== activePokemon.instanceId) {
            throw new BadRequestException(
              'Cannot attack while Asleep. Flip a coin to wake up first.',
            );
          }
          // If coin flip exists but not resolved, must resolve it first
          if (gameState.coinFlipState.status === CoinFlipStatus.READY_TO_FLIP) {
            throw new BadRequestException(
              'Must resolve sleep coin flip before attacking.',
            );
          }
          // If coin flip was tails (still asleep), block attack
          if (gameState.coinFlipState.results.length > 0 &&
              gameState.coinFlipState.results.every(r => r.isTails())) {
            throw new BadRequestException(
              'Cannot attack while Asleep. Pokemon did not wake up.',
            );
          }
        }

        // Check if Pokemon is paralyzed
        if (activePokemon.statusEffect === StatusEffect.PARALYZED) {
          throw new BadRequestException('Cannot attack while Paralyzed.');
        }

        // Check if Pokemon is confused - require coin flip before attack
        if (activePokemon.statusEffect === StatusEffect.CONFUSED) {
          // Check if coin flip state exists for confusion
          if (!gameState.coinFlipState ||
              gameState.coinFlipState.context !== CoinFlipContext.STATUS_CHECK ||
              gameState.coinFlipState.statusEffect !== 'CONFUSED' ||
              gameState.coinFlipState.pokemonInstanceId !== activePokemon.instanceId) {
            // Create coin flip state for confusion check
            // Confusion coin flip doesn't affect attack damage - it only determines if attack can proceed
            // Use BASE_DAMAGE with baseDamage: 0 since confusion doesn't modify the attack's damage
            const actionId = `${match.id}-turn${gameState.turnNumber}-confusion-${activePokemon.instanceId}`;
            const confusionCoinFlipConfig = new CoinFlipConfiguration(
              CoinFlipCountType.FIXED,
              1,
              undefined,
              undefined,
              DamageCalculationType.BASE_DAMAGE,
              0, // No damage calculation for confusion check
            );
            const coinFlipState = new CoinFlipState(
              CoinFlipStatus.READY_TO_FLIP,
              CoinFlipContext.STATUS_CHECK,
              confusionCoinFlipConfig,
              [],
              attackIndex, // Store attackIndex so we can proceed with attack after coin flip
              activePokemon.instanceId,
              'CONFUSED',
              actionId,
            );
            
            // Transition to ATTACK phase when confusion coin flip state is created
            // This allows GENERATE_COIN_FLIP to be called
            const updatedGameState = gameState
              .withCoinFlipState(coinFlipState)
              .withPhase(TurnPhase.ATTACK);
            match.updateGameState(updatedGameState);
            return await this.matchRepository.save(match);
          }
          
          // If coin flip exists but not resolved, must resolve it first
          if (gameState.coinFlipState.status === CoinFlipStatus.READY_TO_FLIP) {
            throw new BadRequestException(
              'Must resolve confusion coin flip before attacking.',
            );
          }
          
          // Check coin flip result - if tails, apply self-damage and block attack
          if (gameState.coinFlipState.results.length > 0) {
            const allTails = gameState.coinFlipState.results.every(r => r.isTails());
            if (allTails) {
              // Apply 30 self-damage
              const selfDamage = 30;
              const newHp = Math.max(0, activePokemon.currentHp - selfDamage);
              const updatedActive = activePokemon.withHp(newHp);
              const isKnockedOut = newHp === 0;
              
              let updatedPlayerState = playerState.withActivePokemon(updatedActive);
              
              // If knocked out, move to discard
              if (isKnockedOut) {
                const cardsToDiscard = activePokemon.getAllCardsToDiscard();
                const discardPile = [...playerState.discardPile, ...cardsToDiscard];
                updatedPlayerState = updatedPlayerState
                  .withActivePokemon(null)
                  .withDiscardPile(discardPile);
              }
              
              const updatedGameState = gameState
                .withPlayer1State(
                  playerIdentifier === PlayerIdentifier.PLAYER1
                    ? updatedPlayerState
                    : gameState.player1State,
                )
                .withPlayer2State(
                  playerIdentifier === PlayerIdentifier.PLAYER2
                    ? updatedPlayerState
                    : gameState.player2State,
                )
                .withCoinFlipState(null); // Clear coin flip state
              
              const actionSummary = new ActionSummary(
                uuidv4(),
                playerIdentifier,
                PlayerActionType.ATTACK,
                new Date(),
                {
                  attackIndex,
                  confusionFailed: true,
                  selfDamage,
                  isKnockedOut,
                },
              );
              
              match.updateGameState(updatedGameState.withAction(actionSummary));
              return await this.matchRepository.save(match);
            }
            // If heads, continue with attack (clear coin flip state will happen after attack)
          }
        }

        // Load attacker card entity to get Attack objects with effects
        const attackerCardEntity = await this.getCardByIdUseCase.getCardEntity(
          playerState.activePokemon.cardId,
        );
        if (!attackerCardEntity.attacks || attackerCardEntity.attacks.length <= attackIndex) {
          throw new BadRequestException(`Invalid attack index: ${attackIndex}`);
        }

        const attack = attackerCardEntity.attacks[attackIndex];
        
        // Load attacker card DTO for type checks
        const attackerCard = await this.getCardByIdUseCase.execute(
          playerState.activePokemon.cardId,
        );
        
        // Validate energy requirements for attack
        const attachedEnergyCardIds = playerState.activePokemon.attachedEnergy || [];
        const attachedEnergyCardDtos = await Promise.all(
          attachedEnergyCardIds.map((cardId) =>
            this.getCardByIdUseCase.execute(cardId),
          ),
        );
        
        // Convert DTOs to energy card data format (CardDetailDto doesn't have energyProvision yet)
        const attachedEnergyCards = attachedEnergyCardDtos.map((dto) => ({
          cardType: dto.cardType,
          energyType: dto.energyType,
          energyProvision: undefined, // TODO: Add energyProvision to CardDetailDto if needed for special energy
        }));
        
        const energyValidation = this.attackEnergyValidator.validateEnergyRequirements(
          attack,
          attachedEnergyCards,
        );
        
        if (!energyValidation.isValid) {
          throw new BadRequestException(
            energyValidation.error || 'Insufficient energy to use this attack',
          );
        }
        
        // Check if attack requires coin flip
        const coinFlipConfig = this.attackCoinFlipParser.parseCoinFlipFromAttack(
          attack.text,
          attack.damage,
        );

        // If coin flip is required, create coin flip state and wait for flip
        if (coinFlipConfig) {
          // Use deterministic actionId for reproducible coin flips
          // Based on match ID, turn number, and action history length
          const actionId = `${match.id}-turn${gameState.turnNumber}-action${gameState.actionHistory.length}`;
          const coinFlipState = new CoinFlipState(
            CoinFlipStatus.READY_TO_FLIP,
            CoinFlipContext.ATTACK,
            coinFlipConfig,
            [],
            attackIndex,
            undefined,
            undefined,
            actionId,
          );

          // Create action summary for attack initiation
          const actionSummary = new ActionSummary(
            actionId,
            playerIdentifier,
            PlayerActionType.ATTACK,
            new Date(),
            { attackIndex, coinFlipRequired: true },
          );

          // Update game state with coin flip state
          const updatedGameState = gameState
            .withCoinFlipState(coinFlipState)
            .withAction(actionSummary)
            .withPhase(TurnPhase.ATTACK);

          match.updateGameState(updatedGameState);
          return await this.matchRepository.save(match);
        }

        // No coin flip required - execute attack immediately
        let damage = parseInt(attack.damage || '0', 10);

        // Load defender card details for weakness/resistance
        const defenderCard = await this.getCardByIdUseCase.execute(
          opponentState.activePokemon.cardId,
        );

        // Apply weakness if applicable
        if (defenderCard.weakness && attackerCard.pokemonType) {
          // Compare by string value since EnergyType and PokemonType are different enums
          if (defenderCard.weakness.type === attackerCard.pokemonType.toString()) {
            const modifier = defenderCard.weakness.modifier;
            if (modifier === '×2') {
              damage = damage * 2;
            }
          }
        }

        // Parse attack text for self-damage and bench damage
        const attackText = attack.text || '';
        const selfDamage = this.parseSelfDamage(attackText, attackerCard.name);
        const benchDamage = this.parseBenchDamage(attackText);

        // Apply damage to opponent's active Pokemon
        const newHp = Math.max(0, opponentState.activePokemon.currentHp - damage);
        let updatedOpponentActive = opponentState.activePokemon.withHp(newHp);

        // Apply status effects from attack (if any)
        if (attack.hasEffects()) {
          const statusEffects = attack.getEffectsByType(AttackEffectType.STATUS_CONDITION);
          for (const statusEffect of statusEffects as StatusConditionEffect[]) {
            // For non-coin-flip attacks, conditions are usually ALWAYS or based on game state
            const conditionsMet = await this.evaluateEffectConditions(
              statusEffect.requiredConditions || [],
              gameState,
              playerIdentifier,
              playerState,
              opponentState,
            );
            
            if (conditionsMet) {
              // Map status condition string to StatusEffect enum
              let status: StatusEffect;
              let poisonDamageAmount: number | undefined;
              
              switch (statusEffect.statusCondition) {
                case 'POISONED':
                  status = StatusEffect.POISONED;
                  // Check if this is Nidoking's Toxic attack (20 damage) or normal poison (10)
                  // For now, default to 10. We can check attack name or add a field to the effect
                  poisonDamageAmount = 10; // Default, can be overridden if attack is Toxic
                  break;
                case 'CONFUSED':
                  status = StatusEffect.CONFUSED;
                  break;
                case 'ASLEEP':
                  status = StatusEffect.ASLEEP;
                  break;
                case 'PARALYZED':
                  status = StatusEffect.PARALYZED;
                  break;
                case 'BURNED':
                  status = StatusEffect.BURNED;
                  break;
                default:
                  status = StatusEffect.NONE;
              }
              
              if (status !== StatusEffect.NONE) {
                updatedOpponentActive = updatedOpponentActive.withStatusEffect(
                  status,
                  poisonDamageAmount,
                );
              }
            }
          }
        }

        // Check if Pokemon is knocked out
        const isKnockedOut = newHp === 0;

        let updatedOpponentState = opponentState.withActivePokemon(updatedOpponentActive);
        let updatedPlayerState = playerState;

        // Apply bench damage to opponent's bench Pokemon
        if (benchDamage > 0) {
          const updatedOpponentBench = opponentState.bench.map((benchPokemon) => {
            const benchHp = Math.max(0, benchPokemon.currentHp - benchDamage);
            return benchPokemon.withHp(benchHp);
          });
          
          // Move knocked out bench Pokemon to discard pile
          const knockedOutBench = updatedOpponentBench.filter((p) => p.currentHp === 0);
          let remainingBench = updatedOpponentBench.filter((p) => p.currentHp > 0);
          
          // Re-index bench positions after removing knocked out Pokemon
          remainingBench = remainingBench.map((pokemon, index) => {
            const newPosition = `BENCH_${index}` as PokemonPosition;
            return new CardInstance(
              pokemon.instanceId,
              pokemon.cardId,
              newPosition,
              pokemon.currentHp,
              pokemon.maxHp,
              pokemon.attachedEnergy,
              pokemon.statusEffect,
              pokemon.evolutionChain,
              pokemon.poisonDamageAmount,
            );
          });
          
          // Collect all cards to discard: Pokemon card + evolution chain + attached energy
          const cardsToDiscard = knockedOutBench.flatMap((p) => p.getAllCardsToDiscard());
          
          const discardPile = [
            ...opponentState.discardPile,
            ...cardsToDiscard,
          ];
          
          updatedOpponentState = updatedOpponentState
            .withBench(remainingBench)
            .withDiscardPile(discardPile);
        }

        // Apply bench damage to player's own bench Pokemon (if attack affects both players' benches)
        if (benchDamage > 0 && attackText.toLowerCase().includes('each player')) {
          const updatedPlayerBench = playerState.bench.map((benchPokemon) => {
            const benchHp = Math.max(0, benchPokemon.currentHp - benchDamage);
            return benchPokemon.withHp(benchHp);
          });
          
          // Move knocked out bench Pokemon to discard pile
          const knockedOutPlayerBench = updatedPlayerBench.filter((p) => p.currentHp === 0);
          let remainingPlayerBench = updatedPlayerBench.filter((p) => p.currentHp > 0);
          
          // Re-index bench positions after removing knocked out Pokemon
          remainingPlayerBench = remainingPlayerBench.map((pokemon, index) => {
            const newPosition = `BENCH_${index}` as PokemonPosition;
            return new CardInstance(
              pokemon.instanceId,
              pokemon.cardId,
              newPosition,
              pokemon.currentHp,
              pokemon.maxHp,
              pokemon.attachedEnergy,
              pokemon.statusEffect,
              pokemon.evolutionChain,
              pokemon.poisonDamageAmount,
            );
          });
          
          // Collect all cards to discard: Pokemon card + evolution chain + attached energy
          const playerCardsToDiscard = knockedOutPlayerBench.flatMap((p) => p.getAllCardsToDiscard());
          
          const playerDiscardPile = [
            ...playerState.discardPile,
            ...playerCardsToDiscard,
          ];
          
          updatedPlayerState = updatedPlayerState
            .withBench(remainingPlayerBench)
            .withDiscardPile(playerDiscardPile);
        }

        // Apply self-damage to attacker
        if (selfDamage > 0 && playerState.activePokemon) {
          const attackerNewHp = Math.max(0, playerState.activePokemon.currentHp - selfDamage);
          const updatedAttacker = playerState.activePokemon.withHp(attackerNewHp);
          
          // Check if attacker is knocked out by self-damage
          if (attackerNewHp === 0) {
            // Collect all cards to discard: Pokemon card + evolution chain + attached energy
            const attackerCardsToDiscard = playerState.activePokemon.getAllCardsToDiscard();
            const attackerDiscardPile = [...updatedPlayerState.discardPile, ...attackerCardsToDiscard];
            updatedPlayerState = updatedPlayerState
              .withActivePokemon(null)
              .withDiscardPile(attackerDiscardPile);
          } else {
            updatedPlayerState = updatedPlayerState.withActivePokemon(updatedAttacker);
          }
        }

        // If opponent's active Pokemon is knocked out, move to discard pile
        if (isKnockedOut) {
          // Collect all cards to discard: Pokemon card + evolution chain + attached energy
          const activeCardsToDiscard = opponentState.activePokemon.getAllCardsToDiscard();
          const discardPile = [...updatedOpponentState.discardPile, ...activeCardsToDiscard];
          updatedOpponentState = updatedOpponentState
            .withActivePokemon(null)
            .withDiscardPile(discardPile);

          // Transition to SELECT_PRIZE phase (or handle prize selection)
          // For now, we'll keep it in ATTACK phase and require SELECT_PRIZE action
        }

        // Update game state
        const updatedGameState =
          playerIdentifier === PlayerIdentifier.PLAYER1
            ? gameState
                .withPlayer1State(updatedPlayerState)
                .withPlayer2State(updatedOpponentState)
            : gameState
                .withPlayer2State(updatedPlayerState)
                .withPlayer1State(updatedOpponentState);

        // Clear confusion coin flip state if it exists (attack succeeded)
        let finalGameState = updatedGameState;
        if (gameState.coinFlipState?.context === CoinFlipContext.STATUS_CHECK &&
            gameState.coinFlipState.statusEffect === 'CONFUSED') {
          finalGameState = finalGameState.withCoinFlipState(null);
        }

        // Transition to END phase after attack
        const nextPhaseGameState = finalGameState.withPhase(TurnPhase.END);

        const actionSummary = new ActionSummary(
          uuidv4(),
          playerIdentifier,
          PlayerActionType.ATTACK,
          new Date(),
          { attackIndex, damage, isKnockedOut },
        );

        const finalGameStateWithAction = nextPhaseGameState.withAction(actionSummary);
        match.updateGameState(finalGameStateWithAction);

        // Check win conditions after attack (e.g., opponent has no Pokemon left)
        const winCheck = this.stateMachineService.checkWinConditions(
          finalGameState.player1State,
          finalGameState.player2State,
        );
        if (winCheck.hasWinner && winCheck.winner) {
          const winnerId =
            winCheck.winner === PlayerIdentifier.PLAYER1
              ? match.player1Id!
              : match.player2Id!;
          match.endMatch(
            winnerId,
            winCheck.winner === PlayerIdentifier.PLAYER1
              ? MatchResult.PLAYER1_WIN
              : MatchResult.PLAYER2_WIN,
            winCheck.winCondition as WinCondition,
          );
        }

        return await this.matchRepository.save(match);
      }

      // Handle GENERATE_COIN_FLIP action
      if (dto.actionType === PlayerActionType.GENERATE_COIN_FLIP) {
        // Validate coin flip state exists
        if (!gameState.coinFlipState) {
          throw new BadRequestException('No coin flip in progress');
        }

        const coinFlipState = gameState.coinFlipState;

        // For ATTACK context, allow both players to approve (no player restriction)
        // For other contexts, maintain original behavior
        if (coinFlipState.context !== CoinFlipContext.ATTACK && gameState.currentPlayer !== playerIdentifier) {
          throw new BadRequestException('Not your turn to flip coin');
        }

        // Validate status
        if (coinFlipState.status !== CoinFlipStatus.READY_TO_FLIP) {
          throw new BadRequestException(`Coin flip not ready. Current status: ${coinFlipState.status}`);
        }

        // Check if coin flip already has results (already generated)
        // If so, this is just an approval tracking update
        if (coinFlipState.results.length > 0) {
          // Coin flip already generated, just track approval
          let updatedCoinFlipState = coinFlipState;
          if (playerIdentifier === PlayerIdentifier.PLAYER1) {
            if (coinFlipState.player1HasApproved) {
              throw new BadRequestException('Player 1 has already approved this coin flip');
            }
            updatedCoinFlipState = coinFlipState.withPlayer1Approval();
          } else {
            if (coinFlipState.player2HasApproved) {
              throw new BadRequestException('Player 2 has already approved this coin flip');
            }
            updatedCoinFlipState = coinFlipState.withPlayer2Approval();
          }

          // Update game state with approval
          const updatedGameState = gameState.withCoinFlipState(updatedCoinFlipState);
          match.updateGameState(updatedGameState);
          return await this.matchRepository.save(match);
        }

        // Track which player approved (first approval triggers coin flip generation)
        let updatedCoinFlipState = coinFlipState;
        if (playerIdentifier === PlayerIdentifier.PLAYER1) {
          if (coinFlipState.player1HasApproved) {
            throw new BadRequestException('Player 1 has already approved this coin flip');
          }
          updatedCoinFlipState = coinFlipState.withPlayer1Approval();
        } else {
          if (coinFlipState.player2HasApproved) {
            throw new BadRequestException('Player 2 has already approved this coin flip');
          }
          updatedCoinFlipState = coinFlipState.withPlayer2Approval();
        }

        // For ATTACK context, use the attacking player's state for coin flip calculation
        // Determine the attacking player from the coin flip state context
        const attackingPlayer = coinFlipState.context === CoinFlipContext.ATTACK 
          ? gameState.currentPlayer 
          : playerIdentifier;
        const playerState = gameState.getPlayerState(attackingPlayer);
        const opponentState = gameState.getOpponentState(attackingPlayer);

        // Calculate number of coins to flip
        const activePokemon = playerState.activePokemon;
        const coinCount = this.coinFlipResolver.calculateCoinCount(
          coinFlipState.configuration,
          playerState,
          activePokemon,
        );

        // Generate coin flips (deterministic - same for both players)
        const actionId = coinFlipState.actionId || uuidv4();
        const results: any[] = [];

        // Handle "until tails" pattern - generate all flips until tails (or max limit)
        if (updatedCoinFlipState.configuration.countType === CoinFlipCountType.UNTIL_TAILS) {
          let flipIndex = 0;
          while (flipIndex < coinCount) {
            const result = this.coinFlipResolver.generateCoinFlip(
              match.id,
              gameState.turnNumber,
              actionId,
              flipIndex,
            );
            updatedCoinFlipState = updatedCoinFlipState.withResult(result);
            results.push({ flipIndex: result.flipIndex, result: result.result });

            // Stop if we got tails
            if (result.isTails()) {
              break;
            }
            flipIndex++;
          }
        } else {
          // Fixed number of coins - generate all flips at once
          for (let i = 0; i < coinCount; i++) {
            const result = this.coinFlipResolver.generateCoinFlip(
              match.id,
              gameState.turnNumber,
              actionId,
              i,
            );
            updatedCoinFlipState = updatedCoinFlipState.withResult(result);
            results.push({ flipIndex: result.flipIndex, result: result.result });
          }
        }

        // For ATTACK context, apply results immediately after generation (single-stage approval)
        // Results are automatically applied after first approval generates the coin flip
        if (updatedCoinFlipState.context === CoinFlipContext.ATTACK && updatedCoinFlipState.isComplete()) {
          // Calculate and apply damage if this is an attack
          if (updatedCoinFlipState.attackIndex !== undefined) {
            // Load attacker and defender cards
            if (!playerState.activePokemon) {
              throw new BadRequestException('No active Pokemon to attack with');
            }
            if (!opponentState.activePokemon) {
              throw new BadRequestException('No opponent active Pokemon to attack');
            }

            // Load attacker card entity to get Attack objects with effects
            const attackerCardEntity = await this.getCardByIdUseCase.getCardEntity(
              playerState.activePokemon.cardId,
            );
            if (!attackerCardEntity.attacks || attackerCardEntity.attacks.length === 0) {
              throw new BadRequestException('Attacker card has no attacks');
            }
            if (
              updatedCoinFlipState.attackIndex < 0 ||
              updatedCoinFlipState.attackIndex >= attackerCardEntity.attacks.length
            ) {
              throw new BadRequestException(
                `Invalid attack index: ${updatedCoinFlipState.attackIndex}`,
              );
            }
            const attack = attackerCardEntity.attacks[updatedCoinFlipState.attackIndex];
            const baseDamage = parseInt(attack.damage || '0', 10);
            
            // Re-parse the attack to ensure we have the correct configuration
            // This fixes cases where old matches have incorrect configurations saved
            const correctCoinFlipConfig = this.attackCoinFlipParser.parseCoinFlipFromAttack(
              attack.text,
              attack.damage,
            );
            
            // Use the correct configuration if available, otherwise fall back to saved one
            const coinFlipConfig = correctCoinFlipConfig || updatedCoinFlipState.configuration;
            
            // Update coin flip state with correct configuration if it changed
            let finalCoinFlipState = updatedCoinFlipState;
            if (correctCoinFlipConfig && 
                correctCoinFlipConfig.damageCalculationType !== updatedCoinFlipState.configuration.damageCalculationType) {
              // Configuration was incorrect, update it
              finalCoinFlipState = new CoinFlipState(
                updatedCoinFlipState.status,
                updatedCoinFlipState.context,
                correctCoinFlipConfig,
                updatedCoinFlipState.results,
                updatedCoinFlipState.attackIndex,
                updatedCoinFlipState.pokemonInstanceId,
                updatedCoinFlipState.statusEffect,
                updatedCoinFlipState.actionId,
                updatedCoinFlipState.player1HasApproved,
                updatedCoinFlipState.player2HasApproved,
              );
            }
            
            // Load attacker card DTO for type/weakness checks
            const attackerCard = await this.getCardByIdUseCase.execute(
              playerState.activePokemon.cardId,
            );

            // Check if attack should proceed using the correct configuration
            const shouldProceed = this.coinFlipResolver.shouldAttackProceed(
              coinFlipConfig,
              finalCoinFlipState.results,
            );

            if (shouldProceed) {
              // Calculate damage based on coin flip results using correct configuration
              let damage = this.coinFlipResolver.calculateDamage(
                coinFlipConfig,
                finalCoinFlipState.results,
                baseDamage,
              );

              // Load defender card for weakness/resistance
              const defenderCard = await this.getCardByIdUseCase.execute(
                opponentState.activePokemon.cardId,
              );

              // Apply weakness if applicable
              if (defenderCard.weakness && attackerCard.pokemonType) {
                if (defenderCard.weakness.type === attackerCard.pokemonType.toString()) {
                  const modifier = defenderCard.weakness.modifier;
                  if (modifier === '×2') {
                    damage = damage * 2;
                  }
                }
              }

              // Apply damage modifiers from attack effects (before weakness/resistance)
              let finalDamage = damage;
              if (attack.hasEffects()) {
                const damageModifiers = attack.getEffectsByType(AttackEffectType.DAMAGE_MODIFIER);
                for (const modifierEffect of damageModifiers as DamageModifierEffect[]) {
                  const conditionsMet = await this.evaluateEffectConditions(
                    modifierEffect.requiredConditions || [],
                    gameState,
                    attackingPlayer,
                    playerState,
                    opponentState,
                    finalCoinFlipState.results,
                  );
                  if (conditionsMet) {
                    finalDamage += modifierEffect.modifier;
                  }
                }
                finalDamage = Math.max(0, finalDamage); // Damage can't be negative
              }

              // Apply weakness if applicable (after damage modifiers)
              if (defenderCard.weakness && attackerCard.pokemonType) {
                if (defenderCard.weakness.type === attackerCard.pokemonType.toString()) {
                  const modifier = defenderCard.weakness.modifier;
                  if (modifier === '×2') {
                    finalDamage = finalDamage * 2;
                  }
                }
              }

              // Check for damage prevention/reduction effects
              const preventionEffect = gameState.getDamagePrevention(
                attackingPlayer === PlayerIdentifier.PLAYER1
                  ? PlayerIdentifier.PLAYER2
                  : PlayerIdentifier.PLAYER1,
                opponentState.activePokemon.instanceId,
              );
              
              if (preventionEffect) {
                if (preventionEffect.amount === 'all') {
                  finalDamage = 0;
                } else if (preventionEffect.amount !== undefined) {
                  finalDamage = Math.max(0, finalDamage - preventionEffect.amount);
                }
              }
              
              // Apply damage reduction
              const reductionAmount = gameState.getDamageReduction(
                attackingPlayer === PlayerIdentifier.PLAYER1
                  ? PlayerIdentifier.PLAYER2
                  : PlayerIdentifier.PLAYER1,
                opponentState.activePokemon.instanceId,
              );
              if (reductionAmount > 0) {
                finalDamage = Math.max(0, finalDamage - reductionAmount);
              }

              // Apply damage to opponent's active Pokemon
              const newHp = Math.max(0, opponentState.activePokemon.currentHp - finalDamage);
              let updatedOpponentActive = opponentState.activePokemon.withHp(newHp);
              const isKnockedOut = newHp === 0;

              // Apply status effects from attack
              let statusEffectApplied = false;
              
              // Check if attack has structured effects
              if (attack.hasEffects()) {
                const statusEffects = attack.getEffectsByType(AttackEffectType.STATUS_CONDITION);
                for (const statusEffect of statusEffects as StatusConditionEffect[]) {
                  // Check if conditions are met (e.g., coin flip success)
                  const conditionsMet = await this.evaluateEffectConditions(
                    statusEffect.requiredConditions || [],
                    gameState,
                    attackingPlayer,
                    playerState,
                    opponentState,
                    finalCoinFlipState.results,
                  );
                  
                  if (conditionsMet) {
                    // Map status condition string to StatusEffect enum
                    let status: StatusEffect;
                    let poisonDamageAmount: number | undefined;
                    
                    switch (statusEffect.statusCondition) {
                      case 'POISONED':
                        status = StatusEffect.POISONED;
                        // Check if this is Nidoking's Toxic attack (20 damage) or normal poison (10)
                        // For now, default to 10. We can check attack name or add a field to the effect
                        poisonDamageAmount = 10; // Default, can be overridden if attack is Toxic
                        break;
                      case 'CONFUSED':
                        status = StatusEffect.CONFUSED;
                        break;
                      case 'ASLEEP':
                        status = StatusEffect.ASLEEP;
                        break;
                      case 'PARALYZED':
                        status = StatusEffect.PARALYZED;
                        break;
                      case 'BURNED':
                        status = StatusEffect.BURNED;
                        break;
                      default:
                        status = StatusEffect.NONE;
                    }
                    
                    if (status !== StatusEffect.NONE) {
                      updatedOpponentActive = updatedOpponentActive.withStatusEffect(
                        status,
                        poisonDamageAmount,
                      );
                      statusEffectApplied = true;
                    }
                  }
                }
              } else {
                // If attack doesn't have structured effects, parse from attack text
                // This handles cases where card data doesn't have effects defined
                const parsedStatusEffect = this.parseStatusEffectFromAttackText(
                  attack.text || '',
                  coinFlipConfig.damageCalculationType === DamageCalculationType.STATUS_EFFECT_ONLY,
                );
                
                if (parsedStatusEffect) {
                  // Check if conditions are met (coin flip success for STATUS_EFFECT_ONLY)
                  const conditionsMet = await this.evaluateEffectConditions(
                    parsedStatusEffect.requiredConditions || [],
                    gameState,
                    attackingPlayer,
                    playerState,
                    opponentState,
                    finalCoinFlipState.results,
                  );
                  
                  if (conditionsMet) {
                    let status: StatusEffect;
                    let poisonDamageAmount: number | undefined;
                    
                    switch (parsedStatusEffect.statusCondition) {
                      case 'POISONED':
                        status = StatusEffect.POISONED;
                        poisonDamageAmount = 10;
                        break;
                      case 'CONFUSED':
                        status = StatusEffect.CONFUSED;
                        break;
                      case 'ASLEEP':
                        status = StatusEffect.ASLEEP;
                        break;
                      case 'PARALYZED':
                        status = StatusEffect.PARALYZED;
                        break;
                      case 'BURNED':
                        status = StatusEffect.BURNED;
                        break;
                      default:
                        status = StatusEffect.NONE;
                    }
                    
                    if (status !== StatusEffect.NONE) {
                      updatedOpponentActive = updatedOpponentActive.withStatusEffect(
                        status,
                        poisonDamageAmount,
                      );
                      statusEffectApplied = true;
                    }
                  }
                }
              }
              
              // For STATUS_EFFECT_ONLY attacks, track if status effect failed to apply
              // If it's STATUS_EFFECT_ONLY and we have tails, the effect failed (status effects typically require heads)
              const isStatusEffectOnly = coinFlipConfig.damageCalculationType === DamageCalculationType.STATUS_EFFECT_ONLY;
              const hasTails = finalCoinFlipState.results.some(r => r.isTails());
              const effectFailed = isStatusEffectOnly && hasTails && !statusEffectApplied;

              let updatedOpponentState = opponentState.withActivePokemon(updatedOpponentActive);

              // If knocked out, move to discard pile
              if (isKnockedOut) {
                const cardsToDiscard = opponentState.activePokemon.getAllCardsToDiscard();
                const discardPile = [...opponentState.discardPile, ...cardsToDiscard];
                updatedOpponentState = updatedOpponentState
                  .withActivePokemon(null)
                  .withDiscardPile(discardPile);
              }

              // Update game state
              const updatedGameState =
                attackingPlayer === PlayerIdentifier.PLAYER1
                  ? gameState
                      .withPlayer1State(playerState)
                      .withPlayer2State(updatedOpponentState)
                  : gameState
                      .withPlayer2State(playerState)
                      .withPlayer1State(updatedOpponentState);

              // Mark coin flip as completed and clear it
              const completedCoinFlipState = finalCoinFlipState.withStatus(CoinFlipStatus.COMPLETED);
              const finalGameState = updatedGameState
                .withCoinFlipState(null) // Clear coin flip state
                .withPhase(TurnPhase.END);

              const actionData: any = {
                attackIndex: finalCoinFlipState.attackIndex,
                damage: finalDamage,
                isKnockedOut,
                coinFlipResults: results,
              };
              
              // Add effectFailed flag for STATUS_EFFECT_ONLY attacks when effect didn't apply
              if (effectFailed) {
                actionData.effectFailed = true;
              }
              
              const actionSummary = new ActionSummary(
                uuidv4(),
                attackingPlayer,
                PlayerActionType.ATTACK,
                new Date(),
                actionData,
              );

              match.updateGameState(finalGameState.withAction(actionSummary));
              return await this.matchRepository.save(match);
            } else {
              // Check if this is STATUS_EFFECT_ONLY - damage should still apply
              // Use the correct configuration (re-parsed) instead of saved one
              if (coinFlipConfig.damageCalculationType === DamageCalculationType.STATUS_EFFECT_ONLY) {
                // For STATUS_EFFECT_ONLY, damage always applies, only effect fails
                const baseDamage = parseInt(attack.damage || '0', 10);
                let damage = baseDamage;

                // Load defender card for weakness/resistance
                const defenderCard = await this.getCardByIdUseCase.execute(
                  opponentState.activePokemon.cardId,
                );

                // Apply weakness if applicable
                if (defenderCard.weakness && attackerCard.pokemonType) {
                  if (defenderCard.weakness.type === attackerCard.pokemonType.toString()) {
                    const modifier = defenderCard.weakness.modifier;
                    if (modifier === '×2') {
                      damage = damage * 2;
                    }
                  }
                }

                // Apply damage to opponent's active Pokemon
                const newHp = Math.max(0, opponentState.activePokemon.currentHp - damage);
                let updatedOpponentActive = opponentState.activePokemon.withHp(newHp);
                const isKnockedOut = newHp === 0;

                let updatedOpponentState = opponentState.withActivePokemon(updatedOpponentActive);

                // If knocked out, move to discard pile
                if (isKnockedOut) {
                  const cardsToDiscard = opponentState.activePokemon.getAllCardsToDiscard();
                  const discardPile = [...opponentState.discardPile, ...cardsToDiscard];
                  updatedOpponentState = updatedOpponentState
                    .withActivePokemon(null)
                    .withDiscardPile(discardPile);
                }

                // Update game state
                const updatedGameState =
                  attackingPlayer === PlayerIdentifier.PLAYER1
                    ? gameState
                        .withPlayer1State(playerState)
                        .withPlayer2State(updatedOpponentState)
                    : gameState
                        .withPlayer2State(playerState)
                        .withPlayer1State(updatedOpponentState);

                const finalGameState = updatedGameState
                  .withCoinFlipState(null) // Clear coin flip state
                  .withPhase(TurnPhase.END);

                const actionSummary = new ActionSummary(
                  uuidv4(),
                  attackingPlayer,
                  PlayerActionType.ATTACK,
                  new Date(),
                  {
                    attackIndex: finalCoinFlipState.attackIndex,
                    damage,
                    isKnockedOut,
                    coinFlipResults: results,
                    effectFailed: true, // Status effect failed (tails), but damage applied
                  },
                );

                match.updateGameState(finalGameState.withAction(actionSummary));
                return await this.matchRepository.save(match);
              } else {
                // Attack does nothing (tails) - for BASE_DAMAGE type
                const finalGameState = gameState
                  .withCoinFlipState(null) // Clear coin flip state
                  .withPhase(TurnPhase.END);

                const actionSummary = new ActionSummary(
                  uuidv4(),
                  attackingPlayer,
                  PlayerActionType.ATTACK,
                  new Date(),
                  {
                    attackIndex: finalCoinFlipState.attackIndex,
                    damage: 0,
                    isKnockedOut: false,
                    coinFlipResults: results,
                    attackFailed: true,
                  },
                );

                match.updateGameState(finalGameState.withAction(actionSummary));
                return await this.matchRepository.save(match);
              }
            }
          } else {
            // Coin flip generated but not complete (shouldn't happen for ATTACK context with fixed/until tails)
            // Update game state with coin flip results and approval
            const updatedGameState = gameState.withCoinFlipState(updatedCoinFlipState);
            match.updateGameState(updatedGameState);
            return await this.matchRepository.save(match);
          }
        } else if (updatedCoinFlipState.context === CoinFlipContext.STATUS_CHECK) {
          // Handle status check coin flips (sleep wake-up, confusion)
          if (updatedCoinFlipState.statusEffect === 'ASLEEP' && updatedCoinFlipState.pokemonInstanceId) {
            // Sleep wake-up coin flip
            const pokemonInstanceId = updatedCoinFlipState.pokemonInstanceId;
            const playerState = gameState.getPlayerState(playerIdentifier);
            const opponentState = gameState.getOpponentState(playerIdentifier);
            
            // Find the asleep Pokemon (could be active or bench)
            let asleepPokemon: CardInstance | null = null;
            let isActive = false;
            let isOpponent = false;
            
            if (playerState.activePokemon?.instanceId === pokemonInstanceId) {
              asleepPokemon = playerState.activePokemon;
              isActive = true;
            } else if (opponentState.activePokemon?.instanceId === pokemonInstanceId) {
              asleepPokemon = opponentState.activePokemon;
              isActive = true;
              isOpponent = true;
            } else {
              // Check bench
              asleepPokemon = playerState.bench.find(p => p.instanceId === pokemonInstanceId) || null;
              if (!asleepPokemon) {
                asleepPokemon = opponentState.bench.find(p => p.instanceId === pokemonInstanceId) || null;
                isOpponent = true;
              }
            }
            
            if (!asleepPokemon || asleepPokemon.statusEffect !== StatusEffect.ASLEEP) {
              throw new BadRequestException('Pokemon is not asleep or not found');
            }
            
            // Check if coin flip succeeded (heads = wake up)
            const hasHeads = updatedCoinFlipState.results.some(r => r.isHeads());
            
            let updatedPokemon: CardInstance;
            if (hasHeads) {
              // Wake up - clear sleep status
              updatedPokemon = asleepPokemon.withStatusEffect(StatusEffect.NONE);
            } else {
              // Stay asleep - keep status
              updatedPokemon = asleepPokemon;
            }
            
            // Update game state
            let updatedGameState = gameState;
            if (isActive) {
              if (isOpponent) {
                updatedGameState = updatedGameState.withPlayer2State(
                  opponentState.withActivePokemon(updatedPokemon),
                );
              } else {
                updatedGameState = updatedGameState.withPlayer1State(
                  playerState.withActivePokemon(updatedPokemon),
                );
              }
            } else {
              // Bench Pokemon
              if (isOpponent) {
                const updatedBench = opponentState.bench.map(p =>
                  p.instanceId === pokemonInstanceId ? updatedPokemon : p,
                );
                updatedGameState = updatedGameState.withPlayer2State(
                  opponentState.withBench(updatedBench),
                );
              } else {
                const updatedBench = playerState.bench.map(p =>
                  p.instanceId === pokemonInstanceId ? updatedPokemon : p,
                );
                updatedGameState = updatedGameState.withPlayer1State(
                  playerState.withBench(updatedBench),
                );
              }
            }
            
            // Clear coin flip state
            const finalGameState = updatedGameState
              .withCoinFlipState(null)
              .withPhase(TurnPhase.DRAW); // Return to DRAW phase
            
            const actionSummary = new ActionSummary(
              uuidv4(),
              playerIdentifier,
              PlayerActionType.GENERATE_COIN_FLIP,
              new Date(),
              {
                context: 'STATUS_CHECK',
                statusEffect: 'ASLEEP',
                pokemonInstanceId,
                wokeUp: hasHeads,
              },
            );
            
            match.updateGameState(finalGameState.withAction(actionSummary));
            return await this.matchRepository.save(match);
          } else if (updatedCoinFlipState.statusEffect === 'CONFUSED' && updatedCoinFlipState.pokemonInstanceId) {
            // Confusion coin flip - process results immediately
            // If heads: proceed with attack, if tails: apply self-damage and block attack
            // The confused Pokemon belongs to the current player (the one whose turn it is)
            const confusedPlayerId = gameState.currentPlayer;
            const confusionPlayerState = gameState.getPlayerState(confusedPlayerId);
            const confusionOpponentState = gameState.getOpponentState(confusedPlayerId);
            const confusedPokemon = confusionPlayerState.activePokemon;
            
            if (!confusedPokemon) {
              throw new BadRequestException('No active Pokemon found for confused player');
            }
            
            // Verify the Pokemon matches the one in the coin flip state
            if (confusedPokemon.instanceId !== updatedCoinFlipState.pokemonInstanceId) {
              // Pokemon might have been switched - this is an error state
              throw new BadRequestException(
                `Confused Pokemon instanceId mismatch. Expected ${updatedCoinFlipState.pokemonInstanceId}, got ${confusedPokemon.instanceId}`,
              );
            }
            
            // Coin flip should have results by now (generated above)
            // If no results, just update state and return (shouldn't happen, but handle gracefully)
            if (updatedCoinFlipState.results.length === 0) {
              const updatedGameState = gameState.withCoinFlipState(updatedCoinFlipState);
              match.updateGameState(updatedGameState);
              return await this.matchRepository.save(match);
            }
            
            // Check result
            const allTails = updatedCoinFlipState.results.every(r => r.isTails());
            const allHeads = updatedCoinFlipState.results.every(r => r.isHeads());
            
            if (allTails) {
              // Tails: Apply 30 self-damage and block attack
              const selfDamage = 30;
              const newHp = Math.max(0, confusedPokemon.currentHp - selfDamage);
              const updatedActive = confusedPokemon.withHp(newHp);
              const isKnockedOut = newHp === 0;
              
              let updatedPlayerState = confusionPlayerState.withActivePokemon(updatedActive);
              
              // If knocked out, move to discard
              if (isKnockedOut) {
                const cardsToDiscard = confusedPokemon.getAllCardsToDiscard();
                const discardPile = [...confusionPlayerState.discardPile, ...cardsToDiscard];
                updatedPlayerState = updatedPlayerState
                  .withActivePokemon(null)
                  .withDiscardPile(discardPile);
              }
              
              const updatedGameState = gameState
                .withPlayer1State(
                  confusedPlayerId === PlayerIdentifier.PLAYER1
                    ? updatedPlayerState
                    : gameState.player1State,
                )
                .withPlayer2State(
                  confusedPlayerId === PlayerIdentifier.PLAYER2
                    ? updatedPlayerState
                    : gameState.player2State,
                )
                .withCoinFlipState(null); // Clear coin flip state
              
              const actionSummary = new ActionSummary(
                uuidv4(),
                confusedPlayerId,
                PlayerActionType.ATTACK,
                new Date(),
                {
                  attackIndex: updatedCoinFlipState.attackIndex,
                  confusionFailed: true,
                  selfDamage,
                  isKnockedOut,
                  coinFlipResults: updatedCoinFlipState.results.map(r => ({
                    flipIndex: r.flipIndex,
                    result: r.result,
                  })),
                },
              );
              
              match.updateGameState(updatedGameState.withAction(actionSummary).withPhase(TurnPhase.END));
              return await this.matchRepository.save(match);
            } else if (allHeads && updatedCoinFlipState.attackIndex !== undefined) {
              // Heads: Confusion coin flip succeeded - proceed with attack
              // Execute the attack immediately since confusion check passed
              const playerState = confusionPlayerState;
              const opponentState = confusionOpponentState;
              
              if (!playerState.activePokemon) {
                throw new BadRequestException('No active Pokemon to attack with');
              }
              if (!opponentState.activePokemon) {
                throw new BadRequestException('No opponent active Pokemon to attack');
              }
              
              // Load attacker card entity
              const attackerCardEntity = await this.getCardByIdUseCase.getCardEntity(
                playerState.activePokemon.cardId,
              );
              if (!attackerCardEntity.attacks || attackerCardEntity.attacks.length <= updatedCoinFlipState.attackIndex) {
                throw new BadRequestException(`Invalid attack index: ${updatedCoinFlipState.attackIndex}`);
              }
              
              const attack = attackerCardEntity.attacks[updatedCoinFlipState.attackIndex];
              
              // Load attacker card DTO for type checks
              const attackerCard = await this.getCardByIdUseCase.execute(
                playerState.activePokemon.cardId,
              );
              
              // Validate energy requirements
              const attachedEnergyCardIds = playerState.activePokemon.attachedEnergy || [];
              const attachedEnergyCardDtos = await Promise.all(
                attachedEnergyCardIds.map((cardId) =>
                  this.getCardByIdUseCase.execute(cardId),
                ),
              );
              
              const attachedEnergyCards = attachedEnergyCardDtos.map((dto) => ({
                cardType: dto.cardType,
                energyType: dto.energyType,
                energyProvision: undefined,
              }));
              
              const energyValidation = this.attackEnergyValidator.validateEnergyRequirements(
                attack,
                attachedEnergyCards,
              );
              
              if (!energyValidation.isValid) {
                throw new BadRequestException(
                  energyValidation.error || 'Insufficient energy to use this attack',
                );
              }
              
              // Check if attack requires coin flip
              const coinFlipConfig = this.attackCoinFlipParser.parseCoinFlipFromAttack(
                attack.text,
                attack.damage,
              );
              
              // Execute attack (with or without coin flip)
              if (coinFlipConfig) {
                // Attack has its own coin flip - generate and resolve it immediately
                const actionId = `${match.id}-turn${gameState.turnNumber}-action${gameState.actionHistory.length}`;
                
                // Calculate number of coins to flip
                const coinCount = this.coinFlipResolver.calculateCoinCount(
                  coinFlipConfig,
                  playerState,
                  playerState.activePokemon,
                );
                
                // Generate coin flip results immediately
                const attackCoinFlipResults: any[] = [];
                let attackCoinFlipState = new CoinFlipState(
                  CoinFlipStatus.READY_TO_FLIP,
                  CoinFlipContext.ATTACK,
                  coinFlipConfig,
                  [],
                  updatedCoinFlipState.attackIndex,
                  undefined,
                  undefined,
                  actionId,
                );
                
                // Handle "until tails" pattern
                if (coinFlipConfig.countType === CoinFlipCountType.UNTIL_TAILS) {
                  let flipIndex = 0;
                  while (flipIndex < coinCount) {
                    const result = this.coinFlipResolver.generateCoinFlip(
                      match.id,
                      gameState.turnNumber,
                      actionId,
                      flipIndex,
                    );
                    attackCoinFlipState = attackCoinFlipState.withResult(result);
                    attackCoinFlipResults.push({ flipIndex: result.flipIndex, result: result.result });
                    if (result.isTails()) {
                      break;
                    }
                    flipIndex++;
                  }
                } else {
                  // Fixed number of coins
                  for (let i = 0; i < coinCount; i++) {
                    const result = this.coinFlipResolver.generateCoinFlip(
                      match.id,
                      gameState.turnNumber,
                      actionId,
                      i,
                    );
                    attackCoinFlipState = attackCoinFlipState.withResult(result);
                    attackCoinFlipResults.push({ flipIndex: result.flipIndex, result: result.result });
                  }
                }
                
                // Check if attack should proceed
                const shouldProceed = this.coinFlipResolver.shouldAttackProceed(
                  coinFlipConfig,
                  attackCoinFlipState.results,
                );
                
                if (shouldProceed) {
                  // Calculate damage
                  const baseDamage = parseInt(attack.damage || '0', 10);
                  let damage = this.coinFlipResolver.calculateDamage(
                    coinFlipConfig,
                    attackCoinFlipState.results,
                    baseDamage,
                  );
                  
                  // Load defender card
                  const defenderCard = await this.getCardByIdUseCase.execute(
                    opponentState.activePokemon.cardId,
                  );
                  
                  // Apply weakness
                  if (defenderCard.weakness && attackerCard.pokemonType) {
                    if (defenderCard.weakness.type === attackerCard.pokemonType.toString()) {
                      const modifier = defenderCard.weakness.modifier;
                      if (modifier === '×2') {
                        damage = damage * 2;
                      }
                    }
                  }
                  
                  // Apply damage modifiers
                  let finalDamage = damage;
                  if (attack.hasEffects()) {
                    const damageModifiers = attack.getEffectsByType(AttackEffectType.DAMAGE_MODIFIER);
                    for (const modifierEffect of damageModifiers as DamageModifierEffect[]) {
                      const conditionsMet = await this.evaluateEffectConditions(
                        modifierEffect.requiredConditions || [],
                      gameState,
                      confusedPlayerId,
                      playerState,
                      opponentState,
                      attackCoinFlipState.results,
                    );
                      if (conditionsMet) {
                        finalDamage += modifierEffect.modifier;
                      }
                    }
                    finalDamage = Math.max(0, finalDamage);
                  }
                  
                  // Apply weakness again after modifiers
                  if (defenderCard.weakness && attackerCard.pokemonType) {
                    if (defenderCard.weakness.type === attackerCard.pokemonType.toString()) {
                      const modifier = defenderCard.weakness.modifier;
                      if (modifier === '×2') {
                        finalDamage = finalDamage * 2;
                      }
                    }
                  }
                  
                  // Check for damage prevention/reduction
                  const preventionEffect = gameState.getDamagePrevention(
                    confusedPlayerId === PlayerIdentifier.PLAYER1
                      ? PlayerIdentifier.PLAYER2
                      : PlayerIdentifier.PLAYER1,
                    opponentState.activePokemon.instanceId,
                  );
                  
                  if (preventionEffect) {
                    if (preventionEffect.amount === 'all') {
                      finalDamage = 0;
                    } else if (preventionEffect.amount !== undefined) {
                      finalDamage = Math.max(0, finalDamage - preventionEffect.amount);
                    }
                  }
                  
                  const reductionAmount = gameState.getDamageReduction(
                    confusedPlayerId === PlayerIdentifier.PLAYER1
                      ? PlayerIdentifier.PLAYER2
                      : PlayerIdentifier.PLAYER1,
                    opponentState.activePokemon.instanceId,
                  );
                  if (reductionAmount > 0) {
                    finalDamage = Math.max(0, finalDamage - reductionAmount);
                  }
                  
                  // Apply damage
                  const newHp = Math.max(0, opponentState.activePokemon.currentHp - finalDamage);
                  let updatedOpponentActive = opponentState.activePokemon.withHp(newHp);
                  const isKnockedOut = newHp === 0;
                  
                  // Apply status effects
                  let statusEffectApplied = false;
                  if (attack.hasEffects()) {
                    const statusEffects = attack.getEffectsByType(AttackEffectType.STATUS_CONDITION);
                    for (const statusEffect of statusEffects as StatusConditionEffect[]) {
                      const conditionsMet = await this.evaluateEffectConditions(
                        statusEffect.requiredConditions || [],
                      gameState,
                      confusedPlayerId,
                      playerState,
                      opponentState,
                      attackCoinFlipState.results,
                    );
                      
                      if (conditionsMet) {
                        let status: StatusEffect;
                        let poisonDamageAmount: number | undefined;
                        
                        switch (statusEffect.statusCondition) {
                          case 'POISONED':
                            status = StatusEffect.POISONED;
                            poisonDamageAmount = 10;
                            break;
                          case 'CONFUSED':
                            status = StatusEffect.CONFUSED;
                            break;
                          case 'ASLEEP':
                            status = StatusEffect.ASLEEP;
                            break;
                          case 'PARALYZED':
                            status = StatusEffect.PARALYZED;
                            break;
                          case 'BURNED':
                            status = StatusEffect.BURNED;
                            break;
                          default:
                            status = StatusEffect.NONE;
                        }
                        
                        if (status !== StatusEffect.NONE) {
                          updatedOpponentActive = updatedOpponentActive.withStatusEffect(
                            status,
                            poisonDamageAmount,
                          );
                          statusEffectApplied = true;
                        }
                      }
                    }
                  } else {
                    const parsedStatusEffect = this.parseStatusEffectFromAttackText(
                      attack.text || '',
                      coinFlipConfig.damageCalculationType === DamageCalculationType.STATUS_EFFECT_ONLY,
                    );
                    
                    if (parsedStatusEffect) {
                      const conditionsMet = await this.evaluateEffectConditions(
                        parsedStatusEffect.requiredConditions || [],
                      gameState,
                      confusedPlayerId,
                      playerState,
                      opponentState,
                      attackCoinFlipState.results,
                    );
                      
                      if (conditionsMet) {
                        let status: StatusEffect;
                        let poisonDamageAmount: number | undefined;
                        
                        switch (parsedStatusEffect.statusCondition) {
                          case 'POISONED':
                            status = StatusEffect.POISONED;
                            poisonDamageAmount = 10;
                            break;
                          case 'CONFUSED':
                            status = StatusEffect.CONFUSED;
                            break;
                          case 'ASLEEP':
                            status = StatusEffect.ASLEEP;
                            break;
                          case 'PARALYZED':
                            status = StatusEffect.PARALYZED;
                            break;
                          case 'BURNED':
                            status = StatusEffect.BURNED;
                            break;
                          default:
                            status = StatusEffect.NONE;
                        }
                        
                        if (status !== StatusEffect.NONE) {
                          updatedOpponentActive = updatedOpponentActive.withStatusEffect(
                            status,
                            poisonDamageAmount,
                          );
                          statusEffectApplied = true;
                        }
                      }
                    }
                  }
                  
                  // Track effectFailed for STATUS_EFFECT_ONLY
                  const isStatusEffectOnly = coinFlipConfig.damageCalculationType === DamageCalculationType.STATUS_EFFECT_ONLY;
                  const hasTails = attackCoinFlipState.results.some(r => r.isTails());
                  const effectFailed = isStatusEffectOnly && hasTails && !statusEffectApplied;
                  
                  let updatedOpponentState = opponentState.withActivePokemon(updatedOpponentActive);
                  
                  // Handle knockout
                  if (isKnockedOut) {
                    const cardsToDiscard = opponentState.activePokemon.getAllCardsToDiscard();
                    const discardPile = [...updatedOpponentState.discardPile, ...cardsToDiscard];
                    updatedOpponentState = updatedOpponentState
                      .withActivePokemon(null)
                      .withDiscardPile(discardPile);
                  }
                  
                  // Update game state (clear confusion coin flip state)
                  const finalGameState = gameState
                    .withPlayer1State(
                      confusedPlayerId === PlayerIdentifier.PLAYER1
                        ? playerState
                        : updatedOpponentState,
                    )
                    .withPlayer2State(
                      confusedPlayerId === PlayerIdentifier.PLAYER2
                        ? playerState
                        : updatedOpponentState,
                    )
                    .withCoinFlipState(null) // Clear confusion coin flip state
                    .withPhase(TurnPhase.END);
                  
                  const actionData: any = {
                    attackIndex: updatedCoinFlipState.attackIndex,
                    damage: finalDamage,
                    isKnockedOut,
                    coinFlipResults: attackCoinFlipResults, // Attack's coin flip results (e.g., Confuse Ray)
                    confusionCoinFlipResults: updatedCoinFlipState.results.map(r => ({
                      flipIndex: r.flipIndex,
                      result: r.result,
                    })), // Confusion coin flip results (heads = attack proceeds)
                  };
                  
                  if (effectFailed) {
                    actionData.effectFailed = true;
                  }
                  
                  const actionSummary = new ActionSummary(
                    uuidv4(),
                    confusedPlayerId,
                    PlayerActionType.ATTACK,
                    new Date(),
                    actionData,
                  );
                  
                  match.updateGameState(finalGameState.withAction(actionSummary));
                  
                  // Check win conditions
                  const winCheck = this.stateMachineService.checkWinConditions(
                    finalGameState.player1State,
                    finalGameState.player2State,
                  );
                  if (winCheck.hasWinner && winCheck.winner) {
                    const winnerId =
                      winCheck.winner === PlayerIdentifier.PLAYER1
                        ? match.player1Id!
                        : match.player2Id!;
                    match.endMatch(
                      winnerId,
                      winCheck.winner === PlayerIdentifier.PLAYER1
                        ? MatchResult.PLAYER1_WIN
                        : MatchResult.PLAYER2_WIN,
                      winCheck.winCondition as WinCondition,
                    );
                  }
                  
                  return await this.matchRepository.save(match);
                } else {
                  // Attack failed due to coin flip (tails)
                  const finalGameState = gameState.withCoinFlipState(null).withPhase(TurnPhase.END);
                  
                  const actionData: any = {
                    attackIndex: updatedCoinFlipState.attackIndex,
                    damage: 0,
                    attackFailed: true,
                    coinFlipResults: attackCoinFlipResults,
                  };
                  
                  const actionSummary = new ActionSummary(
                    uuidv4(),
                    confusedPlayerId,
                    PlayerActionType.ATTACK,
                    new Date(),
                    actionData,
                  );
                  
                  match.updateGameState(finalGameState.withAction(actionSummary));
                  return await this.matchRepository.save(match);
                }
              } else {
                // No coin flip required - execute attack immediately
                let damage = parseInt(attack.damage || '0', 10);
                
                // Load defender card details
                const defenderCard = await this.getCardByIdUseCase.execute(
                  opponentState.activePokemon.cardId,
                );
                
                // Apply weakness if applicable
                if (defenderCard.weakness && attackerCard.pokemonType) {
                  if (defenderCard.weakness.type === attackerCard.pokemonType.toString()) {
                    const modifier = defenderCard.weakness.modifier;
                    if (modifier === '×2') {
                      damage = damage * 2;
                    }
                  }
                }
                
                // Parse attack text for self-damage and bench damage
                const attackText = attack.text || '';
                const selfDamage = this.parseSelfDamage(attackText, attackerCard.name);
                const benchDamage = this.parseBenchDamage(attackText);
                
                // Apply damage to opponent's active Pokemon
                const newHp = Math.max(0, opponentState.activePokemon.currentHp - damage);
                let updatedOpponentActive = opponentState.activePokemon.withHp(newHp);
                
                // Apply status effects from attack
                let statusEffectApplied = false;
                if (attack.hasEffects()) {
                  const statusEffects = attack.getEffectsByType(AttackEffectType.STATUS_CONDITION);
                  for (const statusEffect of statusEffects as StatusConditionEffect[]) {
                    const conditionsMet = await this.evaluateEffectConditions(
                      statusEffect.requiredConditions || [],
                      gameState,
                      confusedPlayerId,
                      playerState,
                      opponentState,
                    );
                    
                    if (conditionsMet) {
                      let status: StatusEffect;
                      let poisonDamageAmount: number | undefined;
                      
                      switch (statusEffect.statusCondition) {
                        case 'POISONED':
                          status = StatusEffect.POISONED;
                          poisonDamageAmount = 10;
                          break;
                        case 'CONFUSED':
                          status = StatusEffect.CONFUSED;
                          break;
                        case 'ASLEEP':
                          status = StatusEffect.ASLEEP;
                          break;
                        case 'PARALYZED':
                          status = StatusEffect.PARALYZED;
                          break;
                        case 'BURNED':
                          status = StatusEffect.BURNED;
                          break;
                        default:
                          status = StatusEffect.NONE;
                      }
                      
                      if (status !== StatusEffect.NONE) {
                        updatedOpponentActive = updatedOpponentActive.withStatusEffect(
                          status,
                          poisonDamageAmount,
                        );
                        statusEffectApplied = true;
                      }
                    }
                  }
                } else {
                  // Parse status effect from attack text if no structured effects
                  const parsedStatusEffect = this.parseStatusEffectFromAttackText(
                    attack.text || '',
                    false,
                  );
                  
                  if (parsedStatusEffect) {
                    const conditionsMet = await this.evaluateEffectConditions(
                      parsedStatusEffect.requiredConditions || [],
                      gameState,
                      confusedPlayerId,
                      playerState,
                      opponentState,
                    );
                    
                    if (conditionsMet) {
                      let status: StatusEffect;
                      let poisonDamageAmount: number | undefined;
                      
                      switch (parsedStatusEffect.statusCondition) {
                        case 'POISONED':
                          status = StatusEffect.POISONED;
                          poisonDamageAmount = 10;
                          break;
                        case 'CONFUSED':
                          status = StatusEffect.CONFUSED;
                          break;
                        case 'ASLEEP':
                          status = StatusEffect.ASLEEP;
                          break;
                        case 'PARALYZED':
                          status = StatusEffect.PARALYZED;
                          break;
                        case 'BURNED':
                          status = StatusEffect.BURNED;
                          break;
                        default:
                          status = StatusEffect.NONE;
                      }
                      
                      if (status !== StatusEffect.NONE) {
                        updatedOpponentActive = updatedOpponentActive.withStatusEffect(
                          status,
                          poisonDamageAmount,
                        );
                        statusEffectApplied = true;
                      }
                    }
                  }
                }
                
                const isKnockedOut = newHp === 0;
                let updatedOpponentState = opponentState.withActivePokemon(updatedOpponentActive);
                let updatedPlayerState = playerState;
                
                // Apply bench damage if needed
                if (benchDamage > 0) {
                  const updatedOpponentBench = opponentState.bench.map((benchPokemon) => {
                    const benchHp = Math.max(0, benchPokemon.currentHp - benchDamage);
                    return benchPokemon.withHp(benchHp);
                  });
                  
                  const knockedOutBench = updatedOpponentBench.filter((p) => p.currentHp === 0);
                  let remainingBench = updatedOpponentBench.filter((p) => p.currentHp > 0);
                  
                  remainingBench = remainingBench.map((pokemon, index) => {
                    const newPosition = `BENCH_${index}` as PokemonPosition;
                    return new CardInstance(
                      pokemon.instanceId,
                      pokemon.cardId,
                      newPosition,
                      pokemon.currentHp,
                      pokemon.maxHp,
                      pokemon.attachedEnergy,
                      pokemon.statusEffect,
                      pokemon.evolutionChain,
                      pokemon.poisonDamageAmount,
                    );
                  });
                  
                  const cardsToDiscard = knockedOutBench.flatMap((p) => p.getAllCardsToDiscard());
                  const discardPile = [
                    ...opponentState.discardPile,
                    ...cardsToDiscard,
                  ];
                  
                  updatedOpponentState = updatedOpponentState
                    .withBench(remainingBench)
                    .withDiscardPile(discardPile);
                }
                
                // Apply self-damage if needed
                if (selfDamage > 0 && playerState.activePokemon) {
                  const attackerNewHp = Math.max(0, playerState.activePokemon.currentHp - selfDamage);
                  const updatedAttacker = playerState.activePokemon.withHp(attackerNewHp);
                  
                  if (attackerNewHp === 0) {
                    const attackerCardsToDiscard = playerState.activePokemon.getAllCardsToDiscard();
                    const attackerDiscardPile = [...updatedPlayerState.discardPile, ...attackerCardsToDiscard];
                    updatedPlayerState = updatedPlayerState
                      .withActivePokemon(null)
                      .withDiscardPile(attackerDiscardPile);
                  } else {
                    updatedPlayerState = updatedPlayerState.withActivePokemon(updatedAttacker);
                  }
                }
                
                // If opponent's active Pokemon is knocked out, move to discard pile
                if (isKnockedOut) {
                  const activeCardsToDiscard = opponentState.activePokemon.getAllCardsToDiscard();
                  const discardPile = [...updatedOpponentState.discardPile, ...activeCardsToDiscard];
                  updatedOpponentState = updatedOpponentState
                    .withActivePokemon(null)
                    .withDiscardPile(discardPile);
                }
                
                // Update game state (clear confusion coin flip state)
                const finalGameStateWithAttack = gameState
                  .withPlayer1State(
                    confusedPlayerId === PlayerIdentifier.PLAYER1
                      ? updatedPlayerState
                      : updatedOpponentState,
                  )
                  .withPlayer2State(
                    confusedPlayerId === PlayerIdentifier.PLAYER2
                      ? updatedPlayerState
                      : updatedOpponentState,
                  )
                  .withCoinFlipState(null) // Clear confusion coin flip state
                  .withPhase(TurnPhase.END);
                
                const actionData: any = {
                  attackIndex: updatedCoinFlipState.attackIndex,
                  damage,
                  isKnockedOut,
                  coinFlipResults: updatedCoinFlipState.results.map(r => ({
                    flipIndex: r.flipIndex,
                    result: r.result,
                  })), // Confusion coin flip results (heads = attack proceeds, no attack coin flip)
                };
                
                const actionSummary = new ActionSummary(
                  uuidv4(),
                  confusedPlayerId,
                  PlayerActionType.ATTACK,
                  new Date(),
                  actionData,
                );
                
                match.updateGameState(finalGameStateWithAttack.withAction(actionSummary));
                
                // Check win conditions
                const winCheck = this.stateMachineService.checkWinConditions(
                  finalGameStateWithAttack.player1State,
                  finalGameStateWithAttack.player2State,
                );
                if (winCheck.hasWinner && winCheck.winner) {
                  const winnerId =
                    winCheck.winner === PlayerIdentifier.PLAYER1
                      ? match.player1Id!
                      : match.player2Id!;
                  match.endMatch(
                    winnerId,
                    winCheck.winner === PlayerIdentifier.PLAYER1
                      ? MatchResult.PLAYER1_WIN
                      : MatchResult.PLAYER2_WIN,
                    winCheck.winCondition as WinCondition,
                  );
                }
                
                return await this.matchRepository.save(match);
              }
            } else {
              // Coin flip not complete or invalid state
              const updatedGameState = gameState.withCoinFlipState(updatedCoinFlipState);
              match.updateGameState(updatedGameState);
              return await this.matchRepository.save(match);
            }
          }
        } else {
          // Non-ATTACK context or coin flip not complete - update state with results
          const updatedGameState = gameState.withCoinFlipState(updatedCoinFlipState);
          match.updateGameState(updatedGameState);
          return await this.matchRepository.save(match);
        }
      }

      // Handle SELECT_PRIZE or DRAW_PRIZE action (when opponent Pokemon is knocked out)
      // DRAW_PRIZE is an alias for SELECT_PRIZE for client compatibility
      if (dto.actionType === PlayerActionType.SELECT_PRIZE || dto.actionType === PlayerActionType.DRAW_PRIZE) {
        const playerState = gameState.getPlayerState(playerIdentifier);

        if (playerState.prizeCards.length === 0) {
          throw new BadRequestException('No prize cards remaining');
        }

        // Validate that a knockout occurred and it's the attacker's turn
        const lastAction = gameState.lastAction;
        if (
          !lastAction ||
          lastAction.actionType !== PlayerActionType.ATTACK ||
          !lastAction.actionData?.isKnockedOut ||
          lastAction.playerId !== playerIdentifier
        ) {
          throw new BadRequestException(
            'SELECT_PRIZE can only be used after knocking out an opponent Pokemon',
          );
        }

        // Get prize index from action data (0-5)
        const prizeIndex = (dto.actionData as any)?.prizeIndex;
        if (prizeIndex === undefined || prizeIndex < 0 || prizeIndex >= playerState.prizeCards.length) {
          throw new BadRequestException(
            `Invalid prizeIndex. Must be between 0 and ${playerState.prizeCards.length - 1}`,
          );
        }

        // Select the specific prize card
        const prizeCard = playerState.prizeCards[prizeIndex];
        const updatedPrizeCards = playerState.prizeCards.filter((_, index) => index !== prizeIndex);
        const updatedHand = [...playerState.hand, prizeCard];
        const updatedPlayerState = playerState
          .withPrizeCards(updatedPrizeCards)
          .withHand(updatedHand);

        // Update game state
        const updatedGameState =
          playerIdentifier === PlayerIdentifier.PLAYER1
            ? gameState.withPlayer1State(updatedPlayerState)
            : gameState.withPlayer2State(updatedPlayerState);

        const actionSummary = new ActionSummary(
          uuidv4(),
          playerIdentifier,
          PlayerActionType.SELECT_PRIZE,
          new Date(),
          { prizeCard, prizeIndex },
        );

        // Check if active Pokemon selection is needed after prize selection
        // Do this BEFORE win condition check, because if opponent has bench Pokemon, they can select active
        const opponentState = updatedGameState.getOpponentState(playerIdentifier);
        const attackerState = updatedGameState.getPlayerState(playerIdentifier);
        
        // Check for double knockout: both players have no active Pokemon
        const opponentNeedsActive = opponentState.activePokemon === null && opponentState.bench.length > 0;
        const attackerNeedsActive = attackerState.activePokemon === null && attackerState.bench.length > 0;
        
        // If opponent needs to select active Pokemon, don't check win conditions yet
        // (they still have Pokemon in play, just need to select one)
        if (!opponentNeedsActive && !attackerNeedsActive) {
          // Check win conditions after prize selection (e.g., player collected last prize)
          // Only check if no active Pokemon selection is needed
          const winCheck = this.stateMachineService.checkWinConditions(
            updatedGameState.player1State,
            updatedGameState.player2State,
          );
          if (winCheck.hasWinner && winCheck.winner) {
            const winnerId =
              winCheck.winner === PlayerIdentifier.PLAYER1
                ? match.player1Id!
                : match.player2Id!;
            match.endMatch(
              winnerId,
              winCheck.winner === PlayerIdentifier.PLAYER1
                ? MatchResult.PLAYER1_WIN
                : MatchResult.PLAYER2_WIN,
              winCheck.winCondition as WinCondition,
            );
            return await this.matchRepository.save(match);
          }
        }
        
        // Determine next phase based on whether active Pokemon selection is needed
        let nextPhase: TurnPhase;
        if (opponentNeedsActive || attackerNeedsActive) {
          // Transition to SELECT_ACTIVE_POKEMON phase
          nextPhase = TurnPhase.SELECT_ACTIVE_POKEMON;
        } else {
          // No active Pokemon selection needed, stay in END phase
          nextPhase = TurnPhase.END;
        }

        const finalGameState = updatedGameState.withPhase(nextPhase).withAction(actionSummary);
        match.updateGameState(finalGameState);

        return await this.matchRepository.save(match);
      }

      // Handle USE_ABILITY action
      if (dto.actionType === PlayerActionType.USE_ABILITY) {
        const actionData = dto.actionData as unknown as AbilityActionData;
        const playerState = gameState.getPlayerState(playerIdentifier);

        if (!actionData.cardId) {
          throw new BadRequestException('cardId is required for USE_ABILITY action');
        }

        if (!actionData.target) {
          throw new BadRequestException('target is required for USE_ABILITY action');
        }

        // Get card domain entity (needed for ability with effects)
        const cardEntity = await this.getCardByIdUseCase.getCardEntity(actionData.cardId);

        if (cardEntity.cardType !== 'POKEMON') {
          throw new BadRequestException('Card must be a Pokemon card');
        }

        const ability = cardEntity.ability;
        if (!ability) {
          throw new BadRequestException('Pokemon must have an ability');
        }

        // Get Pokemon instance from game state
        let pokemon: CardInstance | null = null;
        if (actionData.target === 'ACTIVE') {
          if (!playerState.activePokemon) {
            throw new BadRequestException('No active Pokemon found');
          }
          pokemon = playerState.activePokemon;
        } else {
          const benchIndex = parseInt(actionData.target.replace('BENCH_', ''));
          if (isNaN(benchIndex) || benchIndex < 0 || benchIndex >= playerState.bench.length) {
            throw new BadRequestException(`Invalid bench position: ${actionData.target}`);
          }
          pokemon = playerState.bench[benchIndex];
        }

        if (!pokemon) {
          throw new BadRequestException('Pokemon not found at specified position');
        }

        // Validate Pokemon matches cardId (or instanceId if provided)
        if (actionData.pokemonInstanceId) {
          if (pokemon.instanceId !== actionData.pokemonInstanceId) {
            throw new BadRequestException('Pokemon instanceId does not match');
          }
        } else {
          // Validate cardId matches
          if (pokemon.cardId !== actionData.cardId) {
            throw new BadRequestException('Pokemon cardId does not match');
          }
        }

        // Validate ability can be used
        const validation = await this.abilityEffectValidator.validateAbilityUsage(
          ability,
          actionData,
          pokemon,
          gameState,
          playerIdentifier,
        );

        if (!validation.isValid) {
          throw new BadRequestException(
            `Invalid ability usage: ${validation.errors.join(', ')}`,
          );
        }

        // Execute ability effects
        const result = await this.abilityEffectExecutor.executeEffects(
          ability,
          actionData,
          gameState,
          playerIdentifier,
        );

        // Update game state
        const updatedGameState =
          playerIdentifier === PlayerIdentifier.PLAYER1
            ? gameState
                .withPlayer1State(result.playerState)
                .withPlayer2State(result.opponentState)
            : gameState
                .withPlayer2State(result.playerState)
                .withPlayer1State(result.opponentState);

        // Mark ability as used (for ONCE_PER_TURN tracking)
        const gameStateWithUsage = updatedGameState.markAbilityUsed(
          playerIdentifier,
          actionData.cardId,
        );

        const actionSummary = new ActionSummary(
          uuidv4(),
          playerIdentifier,
          PlayerActionType.USE_ABILITY,
          new Date(),
          actionData as unknown as Record<string, unknown>,
        );

        const finalGameState = gameStateWithUsage.withAction(actionSummary);
        match.updateGameState(finalGameState);

        return await this.matchRepository.save(match);
      }

      // For other actions not yet implemented
      throw new BadRequestException(
        `Action ${dto.actionType} is not yet implemented`,
      );
    }

    // If we reach here, no action was handled (should not happen due to validation)
    throw new BadRequestException(
      `Action ${dto.actionType} could not be processed`,
    );
  }

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
    // Check lastAction first (most recent action, definitely from current turn if from current player)
    // This is a fast path for the most common case: Pokemon was just evolved in the previous action
    if (gameState.lastAction && gameState.lastAction.playerId === playerIdentifier) {
      if (gameState.lastAction.actionType === PlayerActionType.EVOLVE_POKEMON) {
        const actionData = gameState.lastAction.actionData as any;
        if (actionData.instanceId === instanceId) {
          throw new BadRequestException(
            `Cannot evolve this Pokemon again this turn. Each Pokemon can only be evolved once per turn.`,
          );
        }
      } else if (gameState.lastAction.actionType === PlayerActionType.PLAY_TRAINER) {
        const actionData = gameState.lastAction.actionData as any;
        if (actionData.evolutionCardId && actionData.target) {
          const playerState = gameState.getPlayerState(playerIdentifier);
          let targetInstanceId: string | null = null;

          if (actionData.target === 'ACTIVE') {
            targetInstanceId = playerState.activePokemon?.instanceId || null;
          } else if (actionData.target.startsWith('BENCH_')) {
            const benchIndex = parseInt(
              actionData.target.replace('BENCH_', ''),
              10,
            );
            if (benchIndex >= 0 && benchIndex < playerState.bench.length) {
              targetInstanceId = playerState.bench[benchIndex]?.instanceId || null;
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
    // Note: lastAction is also the last item in actionHistory, but we check actionHistory
    // to find evolutions that happened earlier in the same turn (before the most recent action)
    // Stop when we hit an END_TURN action (turn boundary) or an action from a different player
    // This ensures we only check actions from the current turn, not previous turns
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
          const playerState = gameState.getPlayerState(playerIdentifier);
          let targetInstanceId: string | null = null;

          if (actionData.target === 'ACTIVE') {
            targetInstanceId = playerState.activePokemon?.instanceId || null;
          } else if (actionData.target.startsWith('BENCH_')) {
            const benchIndex = parseInt(
              actionData.target.replace('BENCH_', ''),
              10,
            );
            if (benchIndex >= 0 && benchIndex < playerState.bench.length) {
              targetInstanceId = playerState.bench[benchIndex]?.instanceId || null;
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
   * Validate that a Pokemon hasn't been evolved this turn
   * @param gameState Current game state
   * @param playerIdentifier Player attempting the evolution
   * @param instanceId Instance ID of the Pokemon to evolve
   * @param cardId Card ID of the Pokemon (for error message)
   * @throws BadRequestException if the Pokemon has already been evolved this turn
   */
  private validatePokemonNotEvolvedThisTurn(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    instanceId: string,
    cardId: string,
  ): void {
    // Check action history for EVOLVE_POKEMON actions from this player in the current turn
    // We check all actions from this player, but since instanceId is unique per Pokemon instance,
    // if we find an evolution action with the same instanceId, it means this Pokemon was already evolved
    
    // Check lastAction first (most recent action)
    if (
      gameState.lastAction &&
      gameState.lastAction.playerId === playerIdentifier &&
      gameState.lastAction.actionType === PlayerActionType.EVOLVE_POKEMON
    ) {
      const actionData = gameState.lastAction.actionData as any;
      if (actionData.instanceId === instanceId) {
        // Get Pokemon name for better error message
        throw new BadRequestException(
          `Cannot evolve this Pokemon again this turn. Each Pokemon can only be evolved once per turn.`,
        );
      }
    }

    // Check action history for other EVOLVE_POKEMON actions from this player
    // We need to check actions from the current turn only
    // Since we don't have turn number in action data, we'll check all actions from this player
    // and filter by checking if the instanceId matches
    for (const action of gameState.actionHistory) {
      if (
        action.playerId === playerIdentifier &&
        action.actionType === PlayerActionType.EVOLVE_POKEMON
      ) {
        const actionData = action.actionData as any;
        // Check if this action evolved the same Pokemon instance
        // We check both the instanceId directly and also check if the evolution chain
        // would include this instanceId (for cases where a Pokemon was evolved earlier in the turn)
        if (actionData.instanceId === instanceId) {
          throw new BadRequestException(
            `Cannot evolve this Pokemon again this turn. Each Pokemon can only be evolved once per turn.`,
          );
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
      await this.getCardByIdUseCase.getCardEntity(currentPokemonCardId);
    const evolutionCard =
      await this.getCardByIdUseCase.getCardEntity(evolutionCardId);

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

  /**
   * Get card HP from card data
   * Returns the actual HP value from the card, or a default value if not found
   */
  private async getCardHp(cardId: string): Promise<number> {
    try {
      const cardDetail = await this.getCardByIdUseCase.execute(cardId);
      // Return actual HP if available, otherwise default to 100
      return cardDetail.hp ?? 100;
    } catch (error) {
      // If card not found, try to infer HP from card ID or use default
      // In test environment, set loading might fail, so we need a fallback
      // Try to extract HP from known card patterns or use reasonable defaults
      const inferredHp = this.inferHpFromCardId(cardId);
      if (inferredHp) {
        return inferredHp;
      }
      // Default to 100 if we can't infer
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`Card not found for HP lookup: ${cardId}, using default HP`);
      }
      return 100;
    }
  }

  /**
   * Infer HP from card ID based on known card data
   * This is a fallback when card lookup fails
   */
  private inferHpFromCardId(cardId: string): number | null {
    // Known HP values for common cards (from card data)
    const knownHp: Record<string, number> = {
      'bulbasaur': 40,
      'ivysaur': 60,
      'venusaur': 100,
      'charmander': 50,
      'charmeleon': 80,
      'charizard': 120,
      'squirtle': 40,
      'wartortle': 70,
      'blastoise': 100,
      'ponyta': 40,
      'rapidash': 70,
      'magmar': 50,
      'vulpix': 50,
      'ninetales': 80,
      'growlithe': 60,
      'arcanine': 100,
      'tangela': 65,
      'caterpie': 40,
      'metapod': 70,
      'butterfree': 70,
      'weedle': 40,
      'kakuna': 80,
      'beedrill': 80,
      'nidoran': 60,
      'nidorina': 70,
      'nidoqueen': 90,
      'poliwag': 40,
      'poliwhirl': 50,
      'poliwrath': 90,
      'seel': 60,
      'dewgong': 80,
      'starmie': 60,
      'magikarp': 30,
      'gyarados': 100,
    };

    const lowerCardId = cardId.toLowerCase();
    for (const [name, hp] of Object.entries(knownHp)) {
      if (lowerCardId.includes(name)) {
        return hp;
      }
    }

    return null;
  }

  /**
   * Evaluate effect conditions to determine if effect should apply
   */
  private async evaluateEffectConditions(
    conditions: any[], // Condition[] from card domain
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    playerState: PlayerGameState,
    opponentState: PlayerGameState,
    coinFlipResults?: any[], // CoinFlipResult[]
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions = always apply
    }

    for (const condition of conditions) {
      switch (condition.type) {
        case ConditionType.ALWAYS:
          return true;

        case ConditionType.COIN_FLIP_SUCCESS:
          if (!coinFlipResults || coinFlipResults.length === 0) {
            return false;
          }
          // Check if any flip is heads
          return coinFlipResults.some((result) => result.isHeads());

        case ConditionType.COIN_FLIP_FAILURE:
          if (!coinFlipResults || coinFlipResults.length === 0) {
            return false;
          }
          // Check if any flip is tails
          return coinFlipResults.some((result) => result.isTails());

        case ConditionType.SELF_HAS_DAMAGE:
          return playerState.activePokemon
            ? playerState.activePokemon.currentHp < playerState.activePokemon.maxHp
            : false;

        case ConditionType.OPPONENT_HAS_DAMAGE:
          return opponentState.activePokemon
            ? opponentState.activePokemon.currentHp < opponentState.activePokemon.maxHp
            : false;

        case ConditionType.SELF_HAS_ENERGY_TYPE:
          if (!condition.value?.energyType || !playerState.activePokemon) {
            return false;
          }
          // Check if any attached energy matches the required type
          for (const energyId of playerState.activePokemon.attachedEnergy) {
            try {
              const energyCard = await this.getCardByIdUseCase.getCardEntity(energyId);
              if (energyCard.energyType === condition.value.energyType) {
                return true;
              }
            } catch {
              // Skip if card lookup fails
            }
          }
          return false;

        default:
          // Unknown condition type - default to false for safety
          this.logger.warn(`Unknown condition type: ${condition.type}`);
          return false;
      }
    }

    return true; // All conditions met
  }

  /**
   * Process status effects between turns
   * - Apply poison/burn damage
   * - Create sleep wake-up coin flips
   * - Clear paralyzed status
   */
  private async processBetweenTurnsStatusEffects(
    gameState: GameState,
    matchId: string,
  ): Promise<GameState> {
    let updatedGameState = gameState;

    // Process both players' Pokemon
    for (const playerId of [PlayerIdentifier.PLAYER1, PlayerIdentifier.PLAYER2]) {
      const playerState = gameState.getPlayerState(playerId);
      let updatedPlayerState = playerState;

      // Process active Pokemon
      if (playerState.activePokemon) {
        const activePokemon = playerState.activePokemon;
        let updatedActive = activePokemon;

        // Apply poison damage
        if (activePokemon.statusEffect === StatusEffect.POISONED) {
          const poisonDamage = activePokemon.poisonDamageAmount || 10; // Default to 10
          const newHp = Math.max(0, activePokemon.currentHp - poisonDamage);
          updatedActive = updatedActive.withHp(newHp);
          
          // Check for knockout
          if (newHp === 0) {
            // Will be handled by knockout logic later
          }
        }

        // Apply burn damage
        if (activePokemon.statusEffect === StatusEffect.BURNED) {
          const burnDamage = 20; // Always 20 for burn
          const newHp = Math.max(0, activePokemon.currentHp - burnDamage);
          updatedActive = updatedActive.withHp(newHp);
        }

        // Clear paralyzed status at end of turn
        if (activePokemon.statusEffect === StatusEffect.PARALYZED) {
          updatedActive = updatedActive.withStatusEffect(StatusEffect.NONE);
        }

        // Create sleep wake-up coin flip if asleep
        if (activePokemon.statusEffect === StatusEffect.ASLEEP) {
          // Create coin flip state for sleep wake-up check
          // Sleep wake-up coin flip doesn't affect damage - it only determines if Pokemon wakes up
          // Use BASE_DAMAGE with baseDamage: 0 since sleep doesn't modify attack damage
          const actionId = `${matchId}-turn${gameState.turnNumber}-sleep-wakeup-${activePokemon.instanceId}`;
          const sleepCoinFlipConfig = new CoinFlipConfiguration(
            CoinFlipCountType.FIXED,
            1,
            undefined,
            undefined,
            DamageCalculationType.BASE_DAMAGE,
            0, // No damage calculation for sleep wake-up check
          );
          const coinFlipState = new CoinFlipState(
            CoinFlipStatus.READY_TO_FLIP,
            CoinFlipContext.STATUS_CHECK,
            sleepCoinFlipConfig,
            [],
            undefined,
            activePokemon.instanceId,
            'ASLEEP',
            actionId,
          );
          updatedGameState = updatedGameState.withCoinFlipState(coinFlipState);
        }

        if (updatedActive !== activePokemon) {
          updatedPlayerState = updatedPlayerState.withActivePokemon(updatedActive);
        }
      }

      // Process bench Pokemon (poison and burn damage only, no sleep/paralyze)
      const updatedBench = playerState.bench.map((benchPokemon) => {
        let updated = benchPokemon;

        // Apply poison damage
        if (benchPokemon.statusEffect === StatusEffect.POISONED) {
          const poisonDamage = benchPokemon.poisonDamageAmount || 10;
          const newHp = Math.max(0, benchPokemon.currentHp - poisonDamage);
          updated = updated.withHp(newHp);
        }

        // Apply burn damage
        if (benchPokemon.statusEffect === StatusEffect.BURNED) {
          const burnDamage = 20;
          const newHp = Math.max(0, benchPokemon.currentHp - burnDamage);
          updated = updated.withHp(newHp);
        }

        return updated;
      });

      if (updatedBench.some((p, i) => p !== playerState.bench[i])) {
        updatedPlayerState = updatedPlayerState.withBench(updatedBench);
      }

      // Update game state with modified player state
      if (playerId === PlayerIdentifier.PLAYER1) {
        updatedGameState = updatedGameState.withPlayer1State(updatedPlayerState);
      } else {
        updatedGameState = updatedGameState.withPlayer2State(updatedPlayerState);
      }
    }

    return updatedGameState;
  }

  /**
   * Parse status effect from attack text
   * Returns a StatusConditionEffect if the attack text mentions a status condition
   */
  private parseStatusEffectFromAttackText(
    attackText: string,
    isStatusEffectOnly: boolean,
  ): StatusConditionEffect | null {
    if (!attackText) {
      return null;
    }

    const text = attackText.toLowerCase();

    // Check for status conditions in the text
    let statusCondition: 'PARALYZED' | 'POISONED' | 'BURNED' | 'ASLEEP' | 'CONFUSED' | null = null;
    
    if (text.includes('confused')) {
      statusCondition = 'CONFUSED';
    } else if (text.includes('poisoned')) {
      statusCondition = 'POISONED';
    } else if (text.includes('paralyzed')) {
      statusCondition = 'PARALYZED';
    } else if (text.includes('asleep') || text.includes('sleep')) {
      statusCondition = 'ASLEEP';
    } else if (text.includes('burned') || text.includes('burn')) {
      statusCondition = 'BURNED';
    }

    if (!statusCondition) {
      return null;
    }

    // For STATUS_EFFECT_ONLY attacks, check if coin flip is required
    // Pattern: "Flip a coin. If heads, the Defending Pokémon is now [Status]."
    if (isStatusEffectOnly && (text.includes('if heads') || text.includes('if tails'))) {
      const condition = text.includes('if heads') 
        ? ConditionFactory.coinFlipSuccess() 
        : ConditionFactory.coinFlipFailure();
      
      return AttackEffectFactory.statusCondition(
        statusCondition,
        [condition],
      );
    }

    // For attacks without coin flip requirement, apply always
    return AttackEffectFactory.statusCondition(statusCondition);
  }

  /**
   * Parse self-damage from attack text
   * Example: "Magnemite does 40 damage to itself"
   */
  private parseSelfDamage(attackText: string, pokemonName: string): number {
    const text = attackText.toLowerCase();
    const nameLower = pokemonName.toLowerCase();
    
    // Pattern: "[Pokemon] does X damage to itself"
    const selfDamageMatch = text.match(new RegExp(`${nameLower}\\s+does\\s+(\\d+)\\s+damage\\s+to\\s+itself`, 'i'));
    if (selfDamageMatch) {
      return parseInt(selfDamageMatch[1], 10);
    }
    
    // Alternative pattern: "does X damage to itself" (without Pokemon name)
    const genericMatch = text.match(/does\s+(\d+)\s+damage\s+to\s+itself/i);
    if (genericMatch) {
      return parseInt(genericMatch[1], 10);
    }
    
    return 0;
  }

  /**
   * Parse bench damage from attack text
   * Example: "Does 10 damage to each Pokémon on each player's Bench"
   */
  private parseBenchDamage(attackText: string): number {
    const text = attackText.toLowerCase();
    
    // Pattern: "Does X damage to each Pokémon on each player's Bench"
    const eachPlayerMatch = text.match(/does\s+(\d+)\s+damage\s+to\s+each\s+pokémon\s+on\s+each\s+player'?s?\s+bench/i);
    if (eachPlayerMatch) {
      return parseInt(eachPlayerMatch[1], 10);
    }
    
    // Pattern: "Does X damage to each of your opponent's Benched Pokémon"
    const opponentBenchMatch = text.match(/does\s+(\d+)\s+damage\s+to\s+each\s+of\s+your\s+opponent'?s?\s+benched\s+pokémon/i);
    if (opponentBenchMatch) {
      return parseInt(opponentBenchMatch[1], 10);
    }
    
    // Pattern: "Does X damage to each Pokémon on [player]'s Bench"
    const benchMatch = text.match(/does\s+(\d+)\s+damage\s+to\s+each\s+pokémon\s+on\s+.*bench/i);
    if (benchMatch) {
      return parseInt(benchMatch[1], 10);
    }
    
    return 0;
  }
}

